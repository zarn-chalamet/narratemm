package com.narratemm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class VoiceDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateRequest {
        @NotBlank
        private String voiceName; // Aoede, Puck, Charon, Kore

        private String stylePrompt;
        private Double speed; // 0.5 - 2.0
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VoiceResponse {
        private String id;
        private String projectId;
        private String audioPath;
        private String voiceName;
        private String stylePrompt;
        private Double speed;
        private Integer durationSeconds;
        private String createdAt;
    }
}
