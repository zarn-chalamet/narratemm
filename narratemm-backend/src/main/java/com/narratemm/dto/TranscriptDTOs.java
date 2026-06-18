package com.narratemm.dto;

import lombok.*;

public class TranscriptDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TranscriptResponse {
        private String id;
        private String projectId;
        private String rawText;
        private String srtContent;
        private String language;
        private String source;
        private Integer durationSeconds;
        private String createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TranscribeResponse {
        private TranscriptResponse transcript;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String rawText;
        private String srtContent;
    }
}
