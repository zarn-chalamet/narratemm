package com.narratemm.dto;

import jakarta.validation.constraints.*;
import lombok.*;

public class ProjectDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank
        private String aspectRatio; // "9:16", "16:9", "4:5", "1:1"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String title;
        private String status;
        private String aspectRatio;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProjectResponse {
        private String id;
        private String userId;
        private String title;
        private String status;
        private String thumbnail;
        private String videoPath;
        private String youtubeUrl;
        private String aspectRatio;
        private Integer durationSeconds;
        private String createdAt;
        private String updatedAt;
    }
}
