package com.narratemm.service;

import com.narratemm.dto.VoiceDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.Script;
import com.narratemm.entity.VoiceOver;
import com.narratemm.repository.ScriptRepository;
import com.narratemm.repository.VoiceOverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceService {

    private final VoiceOverRepository voiceOverRepository;
    private final ScriptRepository scriptRepository;
    private final ProjectService projectService;
    private final EdgeTTSService edgeTTSService;
    private final StorageService storageService;

    public VoiceResponse generate(String projectId, GenerateRequest request) {

        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.VOICEOVER);

        Script script = scriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException(
                        "Script not found. Please generate script first."));

        try {
            // Get language: request first, then project, then default to myanmar
            String language = request.getLanguage() != null
                    ? request.getLanguage()
                    :"myanmar";

            log.info("Generating voice for project {} | language={}", projectId, language);

            byte[] audioData = edgeTTSService.generateTTS(
                    script.getContent(),
                    request.getVoiceName(),
                    request.getSpeed() != null ? request.getSpeed() : 1.0,
                    language
            );

            String audioPath = storageService.saveAudioFile(projectId, audioData, "mp3");

            voiceOverRepository.findByProjectId(projectId)
                    .ifPresent(voiceOverRepository::delete);

            VoiceOver voiceOver = VoiceOver.builder()
                    .project(project)
                    .audioPath(audioPath)
                    .voiceName(VoiceOver.VoiceName.valueOf(request.getVoiceName()))
                    .stylePrompt(request.getStylePrompt())
                    .speed(request.getSpeed() != null ? request.getSpeed() : 1.0)
                    .build();

            voiceOver = voiceOverRepository.save(voiceOver);
            projectService.updateStatus(projectId, Project.ProjectStatus.DRAFT);

            return toResponse(voiceOver);

        } catch (Exception e) {
            log.error("Voice generation failed: {}", e.getMessage());
            projectService.updateStatus(projectId, Project.ProjectStatus.FAILED);
            throw new RuntimeException("Voice-over generation failed: " + e.getMessage());
        }
    }

    public VoiceResponse get(String projectId) {
        VoiceOver vo = voiceOverRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Voice-over not found"));
        return toResponse(vo);
    }

    public Resource getAudioResource(String projectId) {
        VoiceOver vo = voiceOverRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Voice-over not found"));
        Path path = Paths.get(vo.getAudioPath());
        return new FileSystemResource(path.toFile());
    }

    private VoiceResponse toResponse(VoiceOver vo) {
        return VoiceResponse.builder()
                .id(vo.getId())
                .projectId(vo.getProject().getId())
                .audioPath(vo.getAudioPath())
                .voiceName(vo.getVoiceName().name())
                .stylePrompt(vo.getStylePrompt())
                .speed(vo.getSpeed())
                .durationSeconds(vo.getDurationSeconds())
                .createdAt(vo.getCreatedAt() != null
                        ? vo.getCreatedAt().toString() : null)
                .build();
    }
}
