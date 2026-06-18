package com.narratemm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.List;

public class ScriptDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateRequest {
        @NotBlank
        private String style; // dramatic, casual, spoiler, hype

        @NotBlank
        private String language; // myanmar, english, both
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String content;
        private List<SegmentDTO> segments;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateSegmentRequest {
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScriptResponse {
        private String id;
        private String projectId;
        private String content;
        private String style;
        private String language;
        private List<SegmentDTO> segments;
        private String geminiModel;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SegmentDTO {
        private String id;
        private Double startTime;
        private Double endTime;
        private String text;
    }
}
