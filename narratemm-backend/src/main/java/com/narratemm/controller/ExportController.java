package com.narratemm.controller;

import com.narratemm.dto.ExportDTOs.*;
import com.narratemm.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @PostMapping("/start/{projectId}")
    public ResponseEntity<ExportResponse> start(
            @PathVariable String projectId,
            @RequestBody StartRequest request) {
        return ResponseEntity.accepted().body(exportService.start(projectId, request));
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<ExportResponse> getStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(exportService.getStatus(jobId));
    }

    @GetMapping("/download/{jobId}")
    public ResponseEntity<Resource> download(@PathVariable String jobId) {
        Resource resource = exportService.getDownloadResource(jobId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"narratemm-recap.mp4\"")
                .body(resource);
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> cancel(@PathVariable String jobId) {
        exportService.cancel(jobId);
        return ResponseEntity.noContent().build();
    }
}
