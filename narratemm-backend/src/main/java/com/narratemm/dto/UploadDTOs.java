package com.narratemm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class UploadDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class YoutubeRequest {
        @NotBlank
        private String projectId;

        @NotBlank
        private String youtubeUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UploadResponse {
        private String projectId;
        private String videoPath;
        private String fileName;
        private Long fileSize;
        private Integer durationSeconds;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogoResponse {
        private String logoPath;
        private String message;
    }
}
