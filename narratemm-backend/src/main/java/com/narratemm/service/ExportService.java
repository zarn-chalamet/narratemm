package com.narratemm.service;

import com.narratemm.dto.ExportDTOs.*;
import com.narratemm.entity.ExportJob;
import com.narratemm.entity.Project;
import com.narratemm.repository.ExportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final ExportJobRepository exportJobRepository;
    private final ProjectService projectService;
    private final StorageService storageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ExportResponse start(String projectId, StartRequest request) {
        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.EXPORTING);

        ExportSettings settings = request.getSettings();

        ExportJob job = ExportJob.builder()
                .project(project)
                .status(ExportJob.ExportStatus.PROCESSING)
                .aspectRatio(settings.getAspectRatio())
                .logoPath(settings.getLogoPath())
                .logoPosition(settings.getLogoPosition())
                .logoSize(settings.getLogoSize())
                .logoOpacity(settings.getLogoOpacity())
                .subtitleEnabled(settings.getSubtitleEnabled())
                .subtitleFont(settings.getSubtitleFont())
                .subtitleSize(settings.getSubtitleSize())
                .audioMix(settings.getAudioMix())
                .build();

        job = exportJobRepository.save(job);

        // Start async FFmpeg job
        runFFmpegAsync(job.getId(), project, settings);

        return toResponse(job);
    }

    @Async("taskExecutor")
    public void runFFmpegAsync(String jobId, Project project, ExportSettings settings) {
        ExportJob job = exportJobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        try {
            Path projectDir = storageService.getProjectDir(project.getId());
            Path outputPath = projectDir.resolve("final_output.mp4");
            Path sourcePath = Paths.get(project.getVideoPath());

            // Build FFmpeg command
            String ffmpegCmd = buildFFmpegCommand(sourcePath, projectDir, outputPath, settings);
            log.info("FFmpeg command: {}", ffmpegCmd);

            ProcessBuilder pb = new ProcessBuilder("bash", "-c", ffmpegCmd);
            // Windows: use cmd /c instead
            // ProcessBuilder pb = new ProcessBuilder("cmd", "/c", ffmpegCmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Parse progress from FFmpeg output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            Pattern durationPattern = Pattern.compile("Duration: (\\d{2}):(\\d{2}):(\\d{2})");
            Pattern timePattern = Pattern.compile("time=(\\d{2}):(\\d{2}):(\\d{2})");
            long totalDuration = 0;

            while ((line = reader.readLine()) != null) {
                // Extract total duration
                Matcher durationMatcher = durationPattern.matcher(line);
                if (durationMatcher.find()) {
                    int h = Integer.parseInt(durationMatcher.group(1));
                    int m = Integer.parseInt(durationMatcher.group(2));
                    int s = Integer.parseInt(durationMatcher.group(3));
                    totalDuration = h * 3600L + m * 60L + s;
                }

                // Extract current time progress
                Matcher timeMatcher = timePattern.matcher(line);
                if (timeMatcher.find() && totalDuration > 0) {
                    int h = Integer.parseInt(timeMatcher.group(1));
                    int m = Integer.parseInt(timeMatcher.group(2));
                    int s = Integer.parseInt(timeMatcher.group(3));
                    long currentTime = h * 3600L + m * 60L + s;
                    int progress = (int) Math.min(100, (currentTime * 100) / totalDuration);

                    // Update database and push to WebSocket
                    job.setProgress(progress);
                    exportJobRepository.save(job);

                    messagingTemplate.convertAndSend("/topic/progress/" + jobId,
                            ProgressUpdate.builder()
                                    .jobId(jobId)
                                    .projectId(project.getId())
                                    .status("processing")
                                    .progress(progress)
                                    .timestamp(LocalDateTime.now().toString())
                                    .build()
                    );
                }
            }

            int exitCode = process.waitFor();

            if (exitCode == 0 && Files.exists(outputPath)) {
                job.setStatus(ExportJob.ExportStatus.DONE);
                job.setProgress(100);
                job.setOutputPath(outputPath.toString());
                job.setCompletedAt(LocalDateTime.now());
                projectService.updateStatus(project.getId(), Project.ProjectStatus.DONE);

                messagingTemplate.convertAndSend("/topic/progress/" + jobId,
                        ProgressUpdate.builder()
                                .jobId(jobId)
                                .projectId(project.getId())
                                .status("done")
                                .progress(100)
                                .timestamp(LocalDateTime.now().toString())
                                .build()
                );
            } else {
                throw new RuntimeException("FFmpeg exited with code: " + exitCode);
            }

        } catch (Exception e) {
            log.error("FFmpeg job failed: {}", e.getMessage());
            job.setStatus(ExportJob.ExportStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            projectService.updateStatus(project.getId(), Project.ProjectStatus.FAILED);

            messagingTemplate.convertAndSend("/topic/progress/" + jobId,
                    ProgressUpdate.builder()
                            .jobId(jobId)
                            .projectId(project.getId())
                            .status("failed")
                            .progress(job.getProgress())
                            .timestamp(LocalDateTime.now().toString())
                            .build()
            );
        }

        exportJobRepository.save(job);
    }

    public ExportResponse getStatus(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Export job not found"));
        return toResponse(job);
    }

    public Resource getDownloadResource(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Export job not found"));

        if (job.getStatus() != ExportJob.ExportStatus.DONE) {
            throw new RuntimeException("Export not yet complete");
        }

        Path path = Paths.get(job.getOutputPath());
        if (!Files.exists(path)) {
            throw new RuntimeException("Output file not found");
        }

        return new FileSystemResource(path.toFile());
    }

    public void cancel(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Export job not found"));
        job.setStatus(ExportJob.ExportStatus.FAILED);
        job.setErrorMessage("Cancelled by user");
        job.setCompletedAt(LocalDateTime.now());
        exportJobRepository.save(job);
    }

    private String buildFFmpegCommand(Path source, Path projectDir, Path output, ExportSettings settings) {
        StringBuilder cmd = new StringBuilder();
        cmd.append("ffmpeg -y -i ").append(source);

        // Add voiceover audio if exists
        Path voiceover = projectDir.resolve("voiceover.mp3");
        if (Files.exists(voiceover)) {
            cmd.append(" -i ").append(voiceover);
        }

        // Add logo if exists
        Path logo = projectDir.resolve("logo.png");
        boolean hasLogo = Files.exists(logo) && settings.getLogoPath() != null;
        if (hasLogo) {
            cmd.append(" -i ").append(logo);
        }

        // Filter complex
        cmd.append(" -filter_complex \"");

        // Video scaling based on aspect ratio
        String scale = switch (settings.getAspectRatio()) {
            case "9:16" -> "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:black";
            case "4:5" -> "scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:-1:-1:black";
            case "1:1" -> "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:-1:-1:black";
            default -> "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1:black";
        };
        cmd.append("[0:v]").append(scale).append("[v]");

        // Subtitles
        if (Boolean.TRUE.equals(settings.getSubtitleEnabled())) {
            Path srtFile = projectDir.resolve("subtitles.srt");
            if (Files.exists(srtFile)) {
                String font = settings.getSubtitleFont() != null ? settings.getSubtitleFont() : "Noto Serif Myanmar";
                int fontSize = settings.getSubtitleSize() != null ? settings.getSubtitleSize() : 24;
                cmd.append(";[v]subtitles=").append(srtFile)
                   .append(":force_style='FontName=").append(font)
                   .append(",FontSize=").append(fontSize)
                   .append(",PrimaryColour=&HFFFFFF&'[v]");
            }
        }

        cmd.append("\"");

        // Output
        cmd.append(" -map \"[v]\"");

        // Audio mixing
        if (Files.exists(voiceover)) {
            int mix = settings.getAudioMix() != null ? settings.getAudioMix() : 70;
            float originalVol = (100 - mix) / 100.0f;
            float voiceoverVol = mix / 100.0f;
            cmd.append(" -filter:a \"[0:a]volume=").append(originalVol)
               .append("[a1];[1:a]volume=").append(voiceoverVol)
               .append("[a2];[a1][a2]amix=inputs=2[a]\" -map \"[a]\"");
        } else {
            cmd.append(" -map 0:a?");
        }

        cmd.append(" -c:v libx264 -c:a aac -shortest ").append(output);
        return cmd.toString();
    }

    private ExportResponse toResponse(ExportJob job) {
        return ExportResponse.builder()
                .id(job.getId())
                .projectId(job.getProject().getId())
                .status(job.getStatus().name().toLowerCase())
                .progress(job.getProgress())
                .outputPath(job.getOutputPath())
                .errorMessage(job.getErrorMessage())
                .startedAt(job.getStartedAt() != null ? job.getStartedAt().toString() : null)
                .completedAt(job.getCompletedAt() != null ? job.getCompletedAt().toString() : null)
                .build();
    }
}
