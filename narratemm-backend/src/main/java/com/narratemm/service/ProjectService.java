package com.narratemm.service;

import com.narratemm.dto.ProjectDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.User;
import com.narratemm.repository.*;
import com.narratemm.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import java.io.*;
import java.nio.file.*;
import java.util.List;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TranscriptRepository transcriptRepository;
    private final ScriptRepository scriptRepository;
    private final VoiceOverRepository voiceOverRepository;
    private final ExportJobRepository exportJobRepository;
    private final StorageService storageService;

    @Value("${app.tools.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    public ProjectResponse create(CreateRequest request) {
        User user = SecurityUtils.getCurrentUser();

        Project project = Project.builder()
                .user(user)
                .title(request.getTitle())
                .aspectRatio(request.getAspectRatio())
                .build();

        project = projectRepository.save(project);
        storageService.createProjectDirectory(project.getId());
        return toResponse(project);
    }

    public List<ProjectResponse> getAllForCurrentUser() {
        String userId = SecurityUtils.getCurrentUserId();
        return projectRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProjectResponse getById(String id) {
        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        return toResponse(project);
    }

    public ProjectResponse update(String id, UpdateRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (request.getTitle() != null) project.setTitle(request.getTitle());
        if (request.getAspectRatio() != null) project.setAspectRatio(request.getAspectRatio());
        if (request.getStatus() != null) {
            project.setStatus(Project.ProjectStatus.valueOf(request.getStatus().toUpperCase()));
        }

        project = projectRepository.save(project);
        return toResponse(project);
    }

    @Transactional
    public void delete(String id) {
        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        exportJobRepository.deleteByProjectId(id);
        voiceOverRepository.deleteByProjectId(id);
        scriptRepository.deleteByProjectId(id);
        transcriptRepository.deleteByProjectId(id);
        projectRepository.delete(project);
        storageService.deleteProjectDirectory(id);
    }

    public Project getProjectEntity(String id) {
        String userId = SecurityUtils.getCurrentUserId();
        return projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public void updateStatus(String projectId, Project.ProjectStatus status) {
        projectRepository.findById(projectId).ifPresent(p -> {
            p.setStatus(status);
            projectRepository.save(p);
        });
    }

    public void updateVideoPath(String projectId, String videoPath) {
        projectRepository.findById(projectId).ifPresent(p -> {
            p.setVideoPath(videoPath);
            projectRepository.save(p);
            log.info("Updated videoPath for project {}: {}", projectId, videoPath);

            // Generate thumbnail immediately when video is ready
            try {
                Path video = Paths.get(videoPath);
                Path thumb = storageService.getProjectDir(projectId).resolve("thumbnail.jpg");
                if (Files.exists(video) && !Files.exists(thumb)) {
                    generateThumbnail(video, thumb);
                }
            } catch (Exception e) {
                log.warn("Failed to pre-generate thumbnail for {}: {}", projectId, e.getMessage());
            }
        });
    }

    public void updateDurationSeconds(String projectId, int durationSeconds) {
        projectRepository.findById(projectId).ifPresent(p -> {
            p.setDurationSeconds(durationSeconds);
            projectRepository.save(p);
            log.info("Updated durationSeconds for project {}: {}s", projectId, durationSeconds);
        });
    }

    
    /**
     * Get thumbnail for project - generate from source video if not exists.
     */
    public Resource getThumbnail(String projectId) {
        String userId = SecurityUtils.getCurrentUserId();
        Project project = projectRepository.findByIdAndUserId(projectId, userId)
                .orElse(null);
        if (project == null) return null;

        Path thumbnailPath = storageService.getProjectDir(projectId).resolve("thumbnail.jpg");

        // Return cached thumbnail if exists
        if (Files.exists(thumbnailPath)) {
            return new FileSystemResource(thumbnailPath);
        }

        // Try to generate from source video
        if (project.getVideoPath() == null || project.getVideoPath().isBlank()) {
            return null;
        }

        Path videoPath = Paths.get(project.getVideoPath());
        if (!Files.exists(videoPath)) {
            return null;
        }

        try {
            generateThumbnail(videoPath, thumbnailPath);
            if (Files.exists(thumbnailPath)) {
                return new FileSystemResource(thumbnailPath);
            }
        } catch (Exception e) {
            log.error("Failed to generate thumbnail for {}: {}", projectId, e.getMessage());
        }
        return null;
    }

    private void generateThumbnail(Path videoPath, Path outputPath) throws Exception {
        Files.createDirectories(outputPath.getParent());

        List<String> command = List.of(
                ffmpegPath.replace("/", "\\"),
                "-y",
                "-ss", "00:00:01",
                "-i", videoPath.toAbsolutePath().toString(),
                "-vframes", "1",
                "-vf", "scale=480:-1",
                "-q:v", "3",
                outputPath.toAbsolutePath().toString()
        );

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            while (r.readLine() != null) {  }
        }
        int exit = p.waitFor();
        if (exit == 0 && Files.exists(outputPath)) {
            log.info("Generated thumbnail: {}", outputPath);
        } else {
            log.warn("Thumbnail generation failed (exit={}) for: {}", exit, videoPath);
        }
    }

    private ProjectResponse toResponse(Project p) {
        return ProjectResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .title(p.getTitle())
                .status(p.getStatus().name().toLowerCase())
                .thumbnail(p.getThumbnail())
                .videoPath(p.getVideoPath())
                .youtubeUrl(p.getYoutubeUrl())
                .aspectRatio(p.getAspectRatio())
                .durationSeconds(p.getDurationSeconds())
                .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null)
                .updatedAt(p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null)
                .build();
    }
}
