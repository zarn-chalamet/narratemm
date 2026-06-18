package com.narratemm.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {
    private String error;
    private String message;
    @Builder.Default
    private String timestamp = LocalDateTime.now().toString();
    private String path;
}
