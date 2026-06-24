package com.narratemm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.file.Path;

@Service
@Slf4j
public class GroqService {

    @Value("${app.api.groq-key}")
    private String apiKey;

    @Value("${app.api.groq-url}")
    private String baseUrl;

    private static final long MAX_FILE_SIZE_MB = 25;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────
    // PUBLIC: Called by TranscriptService
    // ─────────────────────────────────────────────────────────────

    /**
     * Single call to Groq → returns both plain text and SRT.
     * Call this once, then use extractText() and convertToSrt().
     */
    public String transcribeVerboseJson(Path audioFilePath) {
        long fileSizeMB = audioFilePath.toFile().length() / (1024 * 1024);

        log.info("Sending to Groq: file={}, size={}MB",
                audioFilePath.getFileName(), fileSizeMB);

        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            throw new RuntimeException(
                "Audio file too large: " + fileSizeMB + "MB (Groq limit: 25MB)");
        }

        WebClient client = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))
                .build();

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file",    new FileSystemResource(audioFilePath.toFile()));
        builder.part("model",   "whisper-large-v3");
        builder.part("response_format",          "verbose_json"); // NOT srt
        builder.part("timestamp_granularities[]", "segment");     // et timestamps
        builder.part("language", "en");

        try {
            String response = client.post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .onStatus(
                        s -> s.is4xxClientError() || s.is5xxServerError(),
                        resp -> resp.bodyToMono(String.class).flatMap(body -> {
                            log.error("Groq API rejected [{}]: {}", resp.statusCode(), body);
                            return Mono.error(new RuntimeException("Groq error: " + body));
                        })
                    )
                    .bodyToMono(String.class)
                    .block();

            log.info("Groq transcription successful for {}", audioFilePath.getFileName());
            return response;

        } catch (Exception e) {
            log.error("Groq transcription error: {}", e.getMessage());
            throw new RuntimeException("Transcription failed: " + e.getMessage());
        }
    }

    /**
     * Extract plain text from verbose_json response.
     * Same as SupadataService rawText — used for AI script generation.
     */
    public String extractText(String verboseJson) {
        try {
            JsonNode root = objectMapper.readTree(verboseJson);
            String text = root.path("text").asText("").trim();
            log.info("Extracted text: {} chars", text.length());
            return text;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse text from Groq response: " + e.getMessage());
        }
    }

    /**
     * Convert verbose_json segments → SRT format.
     */
    public String convertToSrt(String verboseJson) {
        try {
            JsonNode root     = objectMapper.readTree(verboseJson);
            JsonNode segments = root.path("segments");

            // Fallback: no segments returned → single block SRT
            if (segments.isMissingNode() || !segments.isArray() || segments.isEmpty()) {
                log.warn("No segments in Groq response, using single-block SRT fallback");
                String text     = root.path("text").asText("").trim();
                double duration = root.path("duration").asDouble(0.0);
                return buildSingleBlockSrt(text, duration);
            }

            StringBuilder srt   = new StringBuilder();
            int           index = 1;

            for (JsonNode segment : segments) {
                double start = segment.path("start").asDouble(0.0);
                double end   = segment.path("end").asDouble(0.0);
                String text  = segment.path("text").asText("").trim();

                if (text.isEmpty()) continue;

                srt.append(index++).append("\n");
                srt.append(formatSrtTime(start))
                   .append(" --> ")
                   .append(formatSrtTime(end))
                   .append("\n");
                srt.append(text).append("\n\n");
            }

            log.info("Converted {} segments to SRT", index - 1);
            return srt.toString().trim();

        } catch (Exception e) {
            throw new RuntimeException("Failed to convert Groq response to SRT: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    private String buildSingleBlockSrt(String text, double durationSeconds) {
        return "1\n"
             + formatSrtTime(0.0)
             + " --> "
             + formatSrtTime(durationSeconds)
             + "\n"
             + text
             + "\n";
    }

    /**
     * Convert seconds (double) → SRT timestamp: HH:MM:SS,mmm
     *
     * Note: Groq gives seconds as double (e.g. 65.5)
     *       SupadataService uses milliseconds as long (e.g. 65500)
     *       Both produce the same SRT format output.
     *
     * Example: 65.5 → "00:01:05,500"
     */
    private String formatSrtTime(double seconds) {
        int totalMs  = (int) Math.round(seconds * 1000);
        int ms       = totalMs % 1000;
        int totalSec = totalMs / 1000;
        int sec      = totalSec % 60;
        int totalMin = totalSec / 60;
        int min      = totalMin % 60;
        int hours    = totalMin / 60;
        return String.format("%02d:%02d:%02d,%03d", hours, min, sec, ms);
    }
}