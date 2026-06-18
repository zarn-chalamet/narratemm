package com.narratemm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import java.nio.file.Path;

@Service
@Slf4j
public class GroqService {

    @Value("${app.api.groq-key}")
    private String apiKey;

    @Value("${app.api.groq-url}")
    private String baseUrl;

    /**
     * Transcribe audio file using Groq Whisper API
     * Returns SRT formatted transcription
     */
    public String transcribe(Path audioFilePath, String responseFormat) {
        WebClient client = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))
                .build();

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new FileSystemResource(audioFilePath.toFile()));
        builder.part("model", "whisper-large-v3");
        builder.part("response_format", responseFormat); // "srt" or "text" or "verbose_json"
        builder.part("language", "my"); // Myanmar language

        try {
            String response = client
                    .post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return response;
        } catch (Exception e) {
            log.error("Groq transcription error: {}", e.getMessage());
            throw new RuntimeException("Transcription failed: " + e.getMessage());
        }
    }

    /**
     * Transcribe and get plain text
     */
    public String transcribeText(Path audioFilePath) {
        return transcribe(audioFilePath, "text");
    }

    /**
     * Transcribe and get SRT format
     */
    public String transcribeSrt(Path audioFilePath) {
        return transcribe(audioFilePath, "srt");
    }
}
