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
import java.nio.file.Files;
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

    @Value("${app.tools.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

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
                // ── YouTube path: use Supadata ────────────────────────
                SupadataService.CaptionResult captions =
                        supadataService.fetchCaptions(project.getYoutubeUrl());
                rawText          = captions.rawText;
                srtContent       = captions.srtContent;
                detectedLanguage = captions.language;
                source           = Transcript.TranscriptSource.SUPADATA;

                durationSeconds = extractDurationFromSrt(srtContent);
                log.info("YouTube video duration from SRT: {}s", durationSeconds);

            } else if (project.getVideoPath() != null) {
                // ── Uploaded file path: extract audio → Groq ──────────
                Path videoPath = Paths.get(project.getVideoPath());

                // Step 1: Extract small MP3 from video
                Path audioPath = extractAudioFromVideo(videoPath, projectId);

                // Step 2: Send small MP3 to Groq (not the big MP4)
                String verboseJson = groqService.transcribeVerboseJson(audioPath);
                rawText    = groqService.extractText(verboseJson);
                srtContent = groqService.convertToSrt(verboseJson);
                source     = Transcript.TranscriptSource.GROQ;

                // Step 3: Get duration from original video
                durationSeconds = getVideoDurationSeconds(videoPath);
                log.info("Uploaded video duration: {}s", durationSeconds);

                // Step 4: Clean up extracted audio (no longer needed)
                try {
                    Files.deleteIfExists(audioPath);
                    log.info("Cleaned up temp audio: {}", audioPath);
                } catch (Exception e) {
                    log.warn("Could not delete temp audio: {}", e.getMessage());
                }

            } else {
                throw new RuntimeException("No video source available for transcription");
            }

            // ── Update project duration ───────────────────────────────
            if (durationSeconds > 0) {
                projectService.updateDurationSeconds(projectId, durationSeconds);
                log.info("Updated project durationSeconds={}", durationSeconds);
            }

            // ── Delete old transcript if exists ───────────────────────
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
     * Extract audio track from video using FFmpeg.
     * Produces a small mono 16kHz MP3 that's perfect for Whisper.
     */
    private Path extractAudioFromVideo(Path videoPath, String projectId) throws Exception {
        Path projectDir = storageService.getProjectDir(projectId);
        Path audioPath = projectDir.resolve("audio_for_transcribe.mp3");

        log.info("Extracting audio: {} → {}", videoPath.getFileName(), audioPath.getFileName());

        List<String> command = List.of(
                ffmpegPath.replace("/", "\\"),
                "-y",                          // overwrite if exists
                "-i", videoPath.toAbsolutePath().toString(),
                "-vn",                         // no video
                "-acodec", "libmp3lame",       // MP3 codec
                "-ar", "16000",                // 16kHz (Whisper standard)
                "-ac", "1",                    // mono
                "-b:a", "64k",                 // low bitrate = small file
                audioPath.toAbsolutePath().toString()
        );

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        // Consume output to prevent hang
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            while (r.readLine() != null) { /* discard */ }
        }

        int exit = p.waitFor();
        if (exit != 0 || !Files.exists(audioPath)) {
            throw new RuntimeException("Audio extraction failed (exit code: " + exit + ")");
        }

        long sizeKB = Files.size(audioPath) / 1024;
        log.info("Audio extracted successfully: {} KB", sizeKB);
        return audioPath;
    }

    /**
     * Parse the last timestamp from SRT content to get total duration.
     */
    private int extractDurationFromSrt(String srtContent) {
        if (srtContent == null || srtContent.isBlank()) return 0;

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