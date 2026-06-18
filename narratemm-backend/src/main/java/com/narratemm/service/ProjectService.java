package com.narratemm.service;

import com.narratemm.dto.ProjectDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.User;
import com.narratemm.repository.*;
import com.narratemm.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TranscriptRepository transcriptRepository;
    private final ScriptRepository scriptRepository;
    private final VoiceOverRepository voiceOverRepository;
    private final ExportJobRepository exportJobRepository;
    private final StorageService storageService;

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
