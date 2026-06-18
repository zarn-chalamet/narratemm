package com.narratemm.controller;

import com.narratemm.dto.UploadDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.repository.ProjectRepository;
import com.narratemm.security.SecurityUtils;
import com.narratemm.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping("/logo/{projectId}")
    public ResponseEntity<LogoResponse> uploadLogo(
            @PathVariable String projectId,
            @RequestParam("logo") MultipartFile file) {

        String userId = SecurityUtils.getCurrentUserId();
        projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String logoPath = storageService.saveLogoFile(projectId, file);

        return ResponseEntity.ok(LogoResponse.builder()
                .logoPath(logoPath)
                .build());
    }
}
