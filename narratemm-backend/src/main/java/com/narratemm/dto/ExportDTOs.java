package com.narratemm.dto;

import lombok.*;

public class ExportDTOs {

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

        private Double logoX;   // 0.0 = left, 1.0 = right
        private Double logoY;   // 0.0 = top,  1.0 = bottom

        private Boolean subtitleEnabled;
        private String subtitleFont;
        private Integer subtitleSize;
        private Integer audioMix;
        private String subtitleLanguage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartRequest {
        private ExportSettings settings;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportResponse {
        private String id;
        private String projectId;
        private String status;
        private int progress;
        private String outputPath;
        private String errorMessage;
        private String startedAt;
        private String completedAt;

        private String aspectRatio;
        private String logoPath;
        private String logoPosition;
        private Double logoX;
        private Double logoY;
        private Integer logoSize;
        private Integer logoOpacity;
        private Boolean subtitleEnabled;
        private String subtitleFont;
        private Integer subtitleSize;
        private Integer audioMix;
        private String subtitleLanguage;
        }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgressUpdate {
        private String jobId;
        private String projectId;
        private String status;
        private int progress;
        private String timestamp;
    }
}