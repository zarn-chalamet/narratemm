package com.narratemm.dto;

import lombok.*;

public class ExportDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartRequest {
        private ExportSettings settings;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportSettings {
        private String aspectRatio;
        private String logoPath;
        private String logoPosition;
        private Integer logoSize;
        private Integer logoOpacity;
        private Boolean subtitleEnabled;
        private String subtitleFont;
        private Integer subtitleSize;
        private Integer audioMix;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportResponse {
        private String id;
        private String projectId;
        private String status;
        private Integer progress;
        private String outputPath;
        private String errorMessage;
        private String startedAt;
        private String completedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProgressUpdate {
        private String jobId;
        private String projectId;
        private String status;
        private Integer progress;
        private String timestamp;
    }
}
