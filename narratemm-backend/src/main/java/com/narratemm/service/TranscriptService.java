package com.narratemm.service;

import com.narratemm.dto.TranscriptDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.Transcript;
import com.narratemm.repository.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptService {

    private final TranscriptRepository transcriptRepository;
    private final ProjectService projectService;
    private final GroqService groqService;
    private final SupadataService supadataService;
    private final StorageService storageService;

    public TranscribeResponse transcribe(String projectId) {
        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.TRANSCRIBING);

        String rawText;
        String srtContent;
        String detectedLanguage = "en";
        Transcript.TranscriptSource source;

        try {
            if (project.getYoutubeUrl() != null && !project.getYoutubeUrl().isEmpty()) {
                // Use Supadata for YouTube
                SupadataService.CaptionResult captions = supadataService.fetchCaptions(project.getYoutubeUrl());
                rawText = captions.rawText;
                srtContent = captions.srtContent;
                detectedLanguage = captions.language;
                source = Transcript.TranscriptSource.SUPADATA;
            } else if (project.getVideoPath() != null) {
                // Use Groq Whisper for uploaded files
                Path videoPath = Paths.get(project.getVideoPath());
                rawText = groqService.transcribeText(videoPath);
                srtContent = groqService.transcribeSrt(videoPath);
                source = Transcript.TranscriptSource.GROQ;
            } else {
                throw new RuntimeException("No video source available for transcription");
            }

            // Delete old transcript if exists
            transcriptRepository.findByProjectId(projectId).ifPresent(transcriptRepository::delete);

            Transcript transcript = Transcript.builder()
                    .project(project)
                    .rawText(rawText)
                    .srtContent(srtContent)
                    .language(detectedLanguage)
                    .source(source)
                    .durationSeconds(project.getDurationSeconds())
                    .build();

            transcript = transcriptRepository.save(transcript);
            projectService.updateStatus(projectId, Project.ProjectStatus.DRAFT);

            return TranscribeResponse.builder()
                    .transcript(toResponse(transcript))
                    .message("Transcription completed successfully")
                    .build();

        } catch (Exception e) {
            projectService.updateStatus(projectId, Project.ProjectStatus.FAILED);
            throw new RuntimeException("Transcription failed: " + e.getMessage());
        }
    }

    public TranscriptResponse get(String projectId) {
        Transcript transcript = transcriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Transcript not found"));
        return toResponse(transcript);
    }

    public TranscriptResponse update(String projectId, UpdateRequest request) {
        Transcript transcript = transcriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Transcript not found"));

        if (request.getRawText() != null) transcript.setRawText(request.getRawText());
        if (request.getSrtContent() != null) transcript.setSrtContent(request.getSrtContent());

        transcript = transcriptRepository.save(transcript);
        return toResponse(transcript);
    }

    private TranscriptResponse toResponse(Transcript t) {
        return TranscriptResponse.builder()
                .id(t.getId())
                .projectId(t.getProject().getId())
                .rawText(t.getRawText())
                .srtContent(t.getSrtContent())
                .language(t.getLanguage())
                .source(t.getSource().name().toLowerCase())
                .durationSeconds(t.getDurationSeconds())
                .createdAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : null)
                .build();
    }
}
