package com.narratemm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${app.api.gemini-key}")
    private String apiKey;

    @Value("${app.api.gemini-url}")
    private String baseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private WebClient getClient() {
        return WebClient.builder().baseUrl(baseUrl).build();
    }

    /**
     * Generate script using Gemini API
     */
    public String generateScript(String transcript, String style, String language) {
        String prompt = buildScriptPrompt(transcript, style, language);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.8,
                "maxOutputTokens", 2048
            )
        );

        try {
            String response = getClient()
                .post()
                .uri("/models/gemini-3.1-flash-lite:generateContent?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            // Parse the response to extract generated text
            // Response structure: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
            return parseGeminiTextResponse(response);
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
            throw new RuntimeException("Failed to generate script: " + e.getMessage());
        }
    }

    /**
     * Generate TTS audio using Gemini
     */
    public byte[] generateTTS(String text, String voiceName, String stylePrompt, double speed) {
        String fullPrompt = (stylePrompt != null && !stylePrompt.isBlank() ? stylePrompt + "\n\n" : "") + text;

        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("parts", List.of(Map.of("text", fullPrompt)))),
            "generationConfig", Map.of(
                "response_modalities", List.of("AUDIO"),
                "speech_config", Map.of(
                    "voice_config", Map.of(
                        "prebuilt_voice_config", Map.of("voice_name", voiceName)
                    )
                )
            )
        );

        try {
            log.info("🎤 Starting TTS generation... This may take 2 to 5 minutes on free tier.");
            log.info("Model: gemini-2.5-flash-preview-tts | Voice: {}", voiceName);

            String response = getClient()
                    .post()
                    .uri("/models/gemini-2.5-flash-preview-tts:generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(10)))   // retry twice
                    .block(Duration.ofSeconds(300));   // ← 5 minutes (300 seconds)

            log.info("✅ TTS generation completed successfully");
            return parseAudioResponse(response);

        } catch (WebClientResponseException e) {
            String errorBody = e.getResponseBodyAsString();
            log.error("Gemini TTS Error [{}]: {}", e.getStatusCode(), errorBody);
            
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("Daily voice quota exceeded. You can only generate ~3 voices per day.");
            }
            if (e.getStatusCode().value() == 400) {
                throw new RuntimeException("This voice model is not available. Please try a different voice.");
            }
            throw new RuntimeException("Voice generation failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("TTS Timeout or Error", e);
            throw new RuntimeException("Voice generation is taking too long (over 5 minutes). Please try again later or use a shorter script.");
        }
    }

    private String buildScriptPrompt(String transcript, String style, String language) {
        String styleInstruction = switch (style.toLowerCase()) {
            case "dramatic" -> "Write in a dramatic, emotionally engaging style with suspense and emotion.";
            case "casual" -> "Write in a casual, friendly conversational tone.";
            case "spoiler" -> "Include all major plot points and spoilers clearly.";
            case "hype" -> "Write in an exciting, hype style that makes viewers want to watch immediately.";
            default -> "Write in an engaging recap style.";
        };

        String langInstruction = switch (language.toLowerCase()) {
            case "myanmar" -> "Write entirely in Myanmar language (Burmese).";
            case "english" -> "Write entirely in English.";
            case "both" -> "Write in both Myanmar and English (bilingual).";
            default -> "Write in Myanmar language.";
        };

        return String.format("""
            You are a professional drama recap script writer for social media (TikTok, YouTube Shorts, Reels).
            
            %s
            %s
            
            Rules:
            - Keep it 300-500 words
            - Use emojis sparingly for emphasis (🎬 💔 ⚡ 😱)
            - Add dramatic pauses with "..."
            - End with a hook to make viewers want more
            - Structure: Hook → Setup → Key Events → Cliffhanger
            
            Original Transcript:
            %s
            
            Write the recap script now:
            """, styleInstruction, langInstruction, transcript);
    }

        private String parseGeminiTextResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            
            // Check for API error in response body
            if (root.has("error")) {
                String errMsg = root.path("error").path("message").asText();
                throw new RuntimeException("Gemini API error: " + errMsg);
            }
            
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) {
                log.error("No candidates in Gemini response: {}", response);
                throw new RuntimeException("AI returned no content (may be filtered or empty)");
            }
            
            JsonNode firstCandidate = candidates.get(0);
            
            // Check finish reason
            String finishReason = firstCandidate.path("finishReason").asText("");
            if ("SAFETY".equals(finishReason) || "RECITATION".equals(finishReason)) {
                throw new RuntimeException("Content blocked: " + finishReason);
            }
            
            JsonNode parts = firstCandidate.path("content").path("parts");
            if (parts.isEmpty()) {
                throw new RuntimeException("AI response has no text parts");
            }
            
            // ✅ Properly extracts only the "text" field, ignoring "thoughtSignature"
            String text = parts.get(0).path("text").asText();
            if (text.isEmpty()) {
                throw new RuntimeException("AI returned empty text");
            }
            
            return text.trim();
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", response, e);
            throw new RuntimeException("Failed to parse AI response: " + e.getMessage());
        }
    }

     // Proper JSON parsing for audio (Base64)
    private byte[] parseAudioResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            if (root.has("error")) {
                throw new RuntimeException(root.path("error").path("message").asText());
            }

            String base64 = root.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("inlineData")
                    .path("data")
                    .asText();

            if (base64.isBlank()) throw new RuntimeException("No audio data returned");

            return java.util.Base64.getDecoder().decode(base64);
        } catch (Exception e) {
            log.error("Audio parsing failed", e);
            throw new RuntimeException("Failed to decode audio data");
        }
    }
}
