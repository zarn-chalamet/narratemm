package com.narratemm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
public class EdgeTTSService {

    @Value("${app.tts.edge-url}")
    private String edgeUrl;

    public byte[] generateTTS(String text, String voiceName, double speed, String language) {

        log.info("Calling Edge TTS | voice={} | lang={} | chars={}",
                voiceName, language, text.length());

        Map<String, Object> body = Map.of(
                "text",      text,
                "voiceName", voiceName != null ? voiceName : "ALLOY",
                "speed",     speed,
                "language",  language != null ? language : "english"
        );

        byte[] audio = WebClient.builder()
                .baseUrl(edgeUrl)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build()
                .post()
                .uri("/tts")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(byte[].class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (audio == null || audio.length == 0) {
            throw new RuntimeException("TTS returned empty audio");
        }

        log.info("Edge TTS success | {} bytes", audio.length);
        return audio;
    }
}