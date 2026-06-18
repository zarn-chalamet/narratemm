package com.narratemm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@Slf4j
public class SupadataService {

    @Value("${app.api.supadata-key}")
    private String apiKey;

    @Value("${app.api.supadata-url}")
    private String baseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Result wrapper for parsed captions
     */
    public static class CaptionResult {
        public String rawText;
        public String srtContent;
        public String language;
    }

    /**
     * Fetch YouTube video captions using Supadata API and parse them
     */
    public CaptionResult fetchCaptions(String youtubeUrl) {
        WebClient client = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key", apiKey)
                .build();

        try {
            String response = client
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/youtube/transcript")
                            .queryParam("url", youtubeUrl)
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseSupadataResponse(response);
        } catch (Exception e) {
            log.error("Supadata API error: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch YouTube captions: " + e.getMessage());
        }
    }

    /**
     * Parse Supadata JSON response into clean text and SRT
     */
    private CaptionResult parseSupadataResponse(String jsonResponse) throws Exception {
        JsonNode root = objectMapper.readTree(jsonResponse);
        JsonNode content = root.path("content");

        CaptionResult result = new CaptionResult();
        result.language = root.path("lang").asText("en");

        StringBuilder rawText = new StringBuilder();
        StringBuilder srtContent = new StringBuilder();

        int index = 1;
        for (JsonNode segment : content) {
            String text = segment.path("text").asText();
            long offsetMs = segment.path("offset").asLong();
            long durationMs = segment.path("duration").asLong();
            long endMs = offsetMs + durationMs;

            // Plain text (for AI script generation)
            rawText.append(text).append(" ");

            // SRT format (for subtitle burn-in)
            srtContent.append(index).append("\n")
                      .append(formatSrtTime(offsetMs))
                      .append(" --> ")
                      .append(formatSrtTime(endMs)).append("\n")
                      .append(text).append("\n\n");
            index++;
        }

        result.rawText = rawText.toString().trim();
        result.srtContent = srtContent.toString().trim();

        log.info("Parsed {} caption segments, language: {}", index - 1, result.language);
        return result;
    }

    /**
     * Convert milliseconds to SRT time format: HH:MM:SS,mmm
     */
    private String formatSrtTime(long milliseconds) {
        long hours = milliseconds / 3_600_000;
        long minutes = (milliseconds % 3_600_000) / 60_000;
        long seconds = (milliseconds % 60_000) / 1000;
        long ms = milliseconds % 1000;
        return String.format("%02d:%02d:%02d,%03d", hours, minutes, seconds, ms);
    }

    /**
     * Extract video ID from YouTube URL
     */
    public String extractVideoId(String url) {
        if (url.contains("youtu.be/")) {
            return url.split("youtu.be/")[1].split("[?&]")[0];
        }
        if (url.contains("v=")) {
            return url.split("v=")[1].split("[?&]")[0];
        }
        if (url.contains("/shorts/")) {
            return url.split("/shorts/")[1].split("[?&]")[0];
        }
        throw new RuntimeException("Invalid YouTube URL");
    }
}