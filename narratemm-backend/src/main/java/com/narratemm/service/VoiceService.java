package com.narratemm.service;

import com.narratemm.dto.VoiceDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.Script;
import com.narratemm.entity.VoiceOver;
import com.narratemm.repository.ScriptRepository;
import com.narratemm.repository.VoiceOverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceService {

    private final VoiceOverRepository voiceOverRepository;
    private final ScriptRepository scriptRepository;
    private final ProjectService projectService;
    private final EdgeTTSService edgeTTSService;
    private final StorageService storageService;

    @Value("${app.tools.ffprobe-path:ffprobe}")
    private String ffprobePath;

    public VoiceResponse generate(String projectId, GenerateRequest request) {

        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.VOICEOVER);

        Script script = scriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException(
                        "Script not found. Please generate script first."));

        try {
            String language = request.getLanguage() != null
                    ? request.getLanguage() : "myanmar";

            double speed = request.getSpeed() != null ? request.getSpeed() : 1.0;

            log.info("Generating voice for project {} | language={} | speed={}",
                    projectId, language, speed);

            byte[] audioData = edgeTTSService.generateTTS(
                    script.getContent(),
                    request.getVoiceName(),
                    speed,
                    language
            );

            // Save audio file
            String audioPath = storageService.saveAudioFile(projectId, audioData, "mp3");

            // ── Measure real duration via ffprobe ─────────────────────────
            int durationSeconds = 0;
            try {
                Path audioFilePath = Paths.get(audioPath);
                double durationDouble = getAudioDurationSeconds(audioFilePath);
                durationSeconds = (int) Math.ceil(durationDouble);
                log.info("Voiceover duration: {}s ({}s raw)", durationSeconds, durationDouble);
            } catch (Exception e) {
                log.warn("Could not measure voiceover duration: {}", e.getMessage());
            }

            // Delete old voiceover record
            voiceOverRepository.findByProjectId(projectId)
                    .ifPresent(voiceOverRepository::delete);

            VoiceOver voiceOver = VoiceOver.builder()
                    .project(project)
                    .audioPath(audioPath)
                    .voiceName(VoiceOver.VoiceName.valueOf(request.getVoiceName()))
                    .stylePrompt(request.getStylePrompt())
                    .speed(speed)
                    .durationSeconds(durationSeconds)
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

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Use ffprobe to get exact audio duration in seconds.
     */
    private double getAudioDurationSeconds(Path audioPath) throws Exception {
        List<String> command = List.of(
                ffprobePath.replace("/", "\\"),
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audioPath.toAbsolutePath().toString()
        );

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        String result = null;
        try (BufferedReader reader =
                     new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            result = reader.readLine();
            p.waitFor();
        }

        if (result != null && !result.isBlank()) {
            return Double.parseDouble(result.trim());
        }

        throw new RuntimeException("ffprobe returned no duration for: " + audioPath);
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