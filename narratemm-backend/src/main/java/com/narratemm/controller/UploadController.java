package com.narratemm.controller;

import com.narratemm.dto.UploadDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.repository.ProjectRepository;
import com.narratemm.security.SecurityUtils;
import com.narratemm.service.StorageService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final StorageService storageService;
    private final ProjectRepository projectRepository;

    @PostMapping("/file")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") String projectId) {

        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String videoPath = storageService.saveVideoFile(projectId, file);
        project.setVideoPath(videoPath);
        projectRepository.save(project);

        return ResponseEntity.ok(UploadResponse.builder()
                .projectId(projectId)
                .videoPath(videoPath)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .message("File uploaded successfully")
                .build());
    }

    @PostMapping("/youtube")
    public ResponseEntity<UploadResponse> uploadYoutube(@RequestBody YoutubeRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(request.getProjectId(), userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setYoutubeUrl(request.getYoutubeUrl());
        projectRepository.save(project);

        return ResponseEntity.ok(UploadResponse.builder()
                .projectId(request.getProjectId())
                .message("YouTube URL registered successfully")
                .build());
    }

    @PostMapping(
        value = "/logo/{projectId}",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<LogoResponse> uploadLogo(
            @PathVariable String projectId,
            @RequestParam("logo") MultipartFile file) {

        String userId = SecurityUtils.getCurrentUserId();
        projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Logo file is missing or empty"
            );
        }

        String contentType = file.getContentType();
        if (contentType == null ||
                !(contentType.equals("image/png")
                || contentType.equals("image/jpeg")
                || contentType.equals("image/webp"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid file type. Please upload PNG, JPG, or WEBP."
            );
        }

        String logoPath = storageService.saveLogoFile(projectId, file);

        return ResponseEntity.ok(LogoResponse.builder()
                .logoPath(logoPath)
                .message("Logo uploaded successfully")
                .build());
    }
}
