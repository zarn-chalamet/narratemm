package com.narratemm.service;

import com.narratemm.dto.TranscriptDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.Transcript;
import com.narratemm.repository.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptService {

    private final TranscriptRepository transcriptRepository;
    private final ProjectService projectService;
    private final GroqService groqService;
    private final SupadataService supadataService;
    private final StorageService storageService;

    @Value("${app.tools.ffprobe-path:ffprobe}")
    private String ffprobePath;

    public TranscribeResponse transcribe(String projectId) {
        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.TRANSCRIBING);

        String rawText;
        String srtContent;
        String detectedLanguage = "en";
        Transcript.TranscriptSource source;
        int durationSeconds = 0;

        try {
            if (project.getYoutubeUrl() != null && !project.getYoutubeUrl().isEmpty()) {
                // Use Supadata for YouTube
                SupadataService.CaptionResult captions =
                        supadataService.fetchCaptions(project.getYoutubeUrl());
                rawText          = captions.rawText;
                srtContent       = captions.srtContent;
                detectedLanguage = captions.language;
                source           = Transcript.TranscriptSource.SUPADATA;

                // ── Get video duration from SRT last timestamp ────────────
                durationSeconds = extractDurationFromSrt(srtContent);
                log.info("YouTube video duration from SRT: {}s", durationSeconds);

            } else if (project.getVideoPath() != null) {
                // Use Groq Whisper for uploaded files
                Path videoPath = Paths.get(project.getVideoPath());
                rawText    = groqService.transcribeText(videoPath);
                srtContent = groqService.transcribeSrt(videoPath);
                source     = Transcript.TranscriptSource.GROQ;

                // ── Get real video duration via ffprobe ───────────────────
                durationSeconds = getVideoDurationSeconds(videoPath);
                log.info("Uploaded video duration: {}s", durationSeconds);

            } else {
                throw new RuntimeException(
                        "No video source available for transcription");
            }

            // ── Update project duration ───────────────────────────────────
            if (durationSeconds > 0) {
                projectService.updateDurationSeconds(projectId, durationSeconds);
                log.info("Updated project durationSeconds={}", durationSeconds);
            }

            // Delete old transcript if exists
            transcriptRepository.findByProjectId(projectId)
                    .ifPresent(transcriptRepository::delete);

            Transcript transcript = Transcript.builder()
                    .project(project)
                    .rawText(rawText)
                    .srtContent(srtContent)
                    .language(detectedLanguage)
                    .source(source)
                    .durationSeconds(durationSeconds)
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

        if (request.getRawText() != null)    transcript.setRawText(request.getRawText());
        if (request.getSrtContent() != null) transcript.setSrtContent(request.getSrtContent());

        transcript = transcriptRepository.save(transcript);
        return toResponse(transcript);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parse the last timestamp from SRT content to get total duration.
     * SRT format: 00:00:05,000 --> 00:00:08,500
     */
    private int extractDurationFromSrt(String srtContent) {
        if (srtContent == null || srtContent.isBlank()) return 0;

        // Find all end timestamps (after " --> ")
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(
                "--> (\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})");
        java.util.regex.Matcher m = p.matcher(srtContent);

        int lastSeconds = 0;
        while (m.find()) {
            int h  = Integer.parseInt(m.group(1));
            int mi = Integer.parseInt(m.group(2));
            int s  = Integer.parseInt(m.group(3));
            int total = h * 3600 + mi * 60 + s;
            if (total > lastSeconds) lastSeconds = total;
        }

        return lastSeconds;
    }

    /**
     * Use ffprobe to get video duration in seconds.
     */
    private int getVideoDurationSeconds(Path videoPath) {
        try {
            List<String> command = List.of(
                    ffprobePath.replace("/", "\\"),
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    videoPath.toAbsolutePath().toString()
            );

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process proc = pb.start();

            String result;
            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(proc.getInputStream()))) {
                result = reader.readLine();
                proc.waitFor();
            }

            if (result != null && !result.isBlank()) {
                return (int) Math.ceil(Double.parseDouble(result.trim()));
            }
        } catch (Exception e) {
            log.warn("ffprobe failed for {}: {}", videoPath, e.getMessage());
        }
        return 0;
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
                .createdAt(t.getCreatedAt() != null
                        ? t.getCreatedAt().toString() : null)
                .build();
    }
}