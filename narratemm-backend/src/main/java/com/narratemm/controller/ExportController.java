package com.narratemm.controller;

import com.narratemm.dto.ExportDTOs.*;
import com.narratemm.entity.ExportJob;
import com.narratemm.service.ExportService;
import com.narratemm.service.StorageService;
import lombok.RequiredArgsConstructor;

import java.nio.file.Files;
import java.nio.file.Paths;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;
    private final StorageService storageService;

    @PostMapping("/start/{projectId}")
    public ResponseEntity<ExportResponse> start(
            @PathVariable String projectId,
            @RequestBody StartRequest request) {
        return ResponseEntity.ok(exportService.start(projectId, request));
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<ExportResponse> status(@PathVariable String jobId) {
        return ResponseEntity.ok(exportService.getStatus(jobId));
    }

    @GetMapping("/project/{projectId}/latest")
    public ResponseEntity<ExportResponse> getLatestForProject(@PathVariable String projectId) {
        ExportResponse latest = exportService.getLatestForProject(projectId);
        if (latest == null) {
            return ResponseEntity.noContent().build(); // 204 = no previous export
        }
        return ResponseEntity.ok(latest);
    }

    @GetMapping("/download/{jobId}")
    public ResponseEntity<Resource> download(@PathVariable String jobId) {
        Resource resource = exportService.getDownloadResource(jobId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"final_output.mp4\"")
                .contentType(MediaType.parseMediaType("video/mp4"))
                .body(resource);
    }

    @GetMapping("/preview/{jobId}")
    public ResponseEntity<Resource> previewVideo(@PathVariable String jobId) {

        Resource resource = exportService.loadPreviewVideo(jobId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .cacheControl(CacheControl.noCache())
                .body(resource);
    }

    @GetMapping("/source/{projectId}")
    public ResponseEntity<Resource> sourceVideo(@PathVariable String projectId) {
        Resource resource = exportService.loadSourceVideo(projectId);

        if (resource == null) {
            return ResponseEntity.noContent().build(); // 204 instead of 404
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .cacheControl(CacheControl.noCache())
                .body(resource);
    }
 
    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> cancel(@PathVariable String jobId) {
        exportService.cancel(jobId);
        return ResponseEntity.noContent().build();
    }
}