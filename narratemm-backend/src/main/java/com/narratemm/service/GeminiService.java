package com.narratemm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${app.api.gemini-key}")
    private String apiKey;

    @Value("${app.api.gemini-url}")
    private String baseUrl;

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
                .uri("/models/gemini-2.0-flash:generateContent?key=" + apiKey)
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
        // Gemini 2.5 Flash TTS endpoint
        // Note: The actual TTS API format may differ - check latest Gemini docs
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", stylePrompt + "\n\n" + text)
                ))
            ),
            "generationConfig", Map.of(
                "response_modalities", List.of("AUDIO"),
                "speech_config", Map.of(
                    "voice_config", Map.of(
                        "prebuilt_voice_config", Map.of(
                            "voice_name", voiceName
                        )
                    )
                )
            )
        );

        try {
            String response = getClient()
                .post()
                .uri("/models/gemini-2.5-flash-preview-tts:generateContent?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            // Parse Base64 encoded audio from response
            return parseGeminiAudioResponse(response);
        } catch (Exception e) {
            log.error("Gemini TTS error: {}", e.getMessage());
            throw new RuntimeException("Failed to generate voice-over: " + e.getMessage());
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
        // Simple JSON parsing - in production use Jackson
        try {
            int textStart = response.indexOf("\"text\"") + 9;
            int textEnd = response.indexOf("\"", textStart);
            // Handle escaped characters
            String text = response.substring(textStart, response.indexOf("\"\n", textStart));
            return text.replace("\\n", "\n").replace("\\\"", "\"");
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", response);
            return response; // Return raw if parsing fails
        }
    }

    private byte[] parseGeminiAudioResponse(String response) {
        // Parse base64 audio data from Gemini TTS response
        try {
            // The audio data is in: candidates[0].content.parts[0].inlineData.data
            int dataStart = response.indexOf("\"data\"") + 9;
            int dataEnd = response.indexOf("\"", dataStart);
            String base64Audio = response.substring(dataStart, dataEnd);
            return java.util.Base64.getDecoder().decode(base64Audio);
        } catch (Exception e) {
            log.error("Failed to parse Gemini audio response");
            throw new RuntimeException("Failed to parse audio data");
        }
    }
}
