package com.narratemm.service;

import com.narratemm.dto.ExportDTOs.*;
import com.narratemm.entity.*;
import com.narratemm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final ExportJobRepository exportJobRepository;
    private final ProjectService projectService;
    private final StorageService storageService;
    private final TranscriptRepository transcriptRepository;
    private final ScriptRepository scriptRepository;
    private final VoiceOverRepository voiceOverRepository;

    @Value("${app.tools.yt-dlp-path:yt-dlp}")
    private String ytDlpPath;

    @Value("${app.tools.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    @Value("${app.tools.ffprobe-path:ffprobe}")
    private String ffprobePath;

    @Value("${app.tools.fonts-dir:}")
    private String fontsDir;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    public ExportResponse start(String projectId, StartRequest request) {
        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.EXPORTING);

        ExportSettings settings = request.getSettings();

        if (settings.getAspectRatio() == null || settings.getAspectRatio().isBlank()) {
            settings.setAspectRatio(project.getAspectRatio());
        }

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
                .subtitleLanguage(settings.getSubtitleLanguage())
                .build();

        job = exportJobRepository.save(job);
        runFFmpegAsync(job.getId(), project, settings);

        return toResponse(job);
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
            throw new RuntimeException("Output file not found on disk");
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

    // ─────────────────────────────────────────────────────────────────────────
    // ASYNC FFMPEG PIPELINE
    // ─────────────────────────────────────────────────────────────────────────

    @Async("taskExecutor")
    public void runFFmpegAsync(String jobId, Project project, ExportSettings settings) {
        ExportJob job = exportJobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        try {
            Path projectDir = storageService.getProjectDir(project.getId());
            Path outputPath = projectDir.resolve("final_output.mp4");

             Files.deleteIfExists(outputPath);

            // Step 1: Resolve source video
            Path sourcePath = resolveSourceVideo(project, projectDir);
            log.info("Source video: {}", sourcePath);

            // Step 2: Prepare SRT subtitles
            Path srtPath = null;
            if (Boolean.TRUE.equals(settings.getSubtitleEnabled())) {
                try {
                    srtPath = prepareSrtFile(
                            project, projectDir, settings.getSubtitleLanguage());
                } catch (Exception e) {
                    log.warn("SRT failed, exporting without subtitles: {}", e.getMessage());
                    settings.setSubtitleEnabled(false);
                    srtPath = null;
                }
            }

            // Step 3: Build FFmpeg argument list (no shell wrapper)
            List<String> ffmpegArgs = buildFFmpegArgs(
                    sourcePath, projectDir, outputPath, settings, srtPath);
            log.info("FFmpeg args: {}", ffmpegArgs);

            // Step 4: Run FFmpeg directly - NO cmd /c
            ProcessBuilder pb = new ProcessBuilder(ffmpegArgs);
            pb.redirectErrorStream(true);

            // Set font environment variables
            if (fontsDir != null && !fontsDir.isBlank()) {
                Map<String, String> env = pb.environment();
                String fontsDirWin = fontsDir.replace("/", "\\");
                env.put("FONTCONFIG_PATH", fontsDirWin);
                env.put("FC_CONFIG_DIR", fontsDirWin);
                log.info("Font dir: {}", fontsDirWin);
            }

            Process process = pb.start();

            // Step 5: Capture output + track progress
            StringBuilder ffmpegOutput = new StringBuilder();
            Pattern durationPat = Pattern.compile("Duration: (\\d{2}):(\\d{2}):(\\d{2})");
            Pattern timePat     = Pattern.compile("time=(\\d{2}):(\\d{2}):(\\d{2})");
            long totalSecs = 0;

            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("FFmpeg: {}", line);
                    ffmpegOutput.append(line).append("\n");

                    Matcher dm = durationPat.matcher(line);
                    if (dm.find()) {
                        totalSecs = toSeconds(dm.group(1), dm.group(2), dm.group(3));
                    }

                    Matcher tm = timePat.matcher(line);
                    if (tm.find() && totalSecs > 0) {
                        long current = toSeconds(tm.group(1), tm.group(2), tm.group(3));
                        int progress = (int) Math.min(99, current * 100 / totalSecs);
                        job.setProgress(progress);
                        exportJobRepository.save(job);
                    }
                }
            }

            int exitCode = process.waitFor();
            log.info("FFmpeg exit code: {}", exitCode);

            if (exitCode == 0 && Files.exists(outputPath)) {
                job.setStatus(ExportJob.ExportStatus.DONE);
                job.setProgress(100);
                job.setOutputPath(normalizePath(outputPath));
                job.setCompletedAt(LocalDateTime.now());
                projectService.updateStatus(project.getId(), Project.ProjectStatus.DONE);
                log.info("✅ Export complete: {}", outputPath);
            } else {
                String errorMsg = extractFFmpegError(ffmpegOutput.toString());
                log.error("FFmpeg full output:\n{}", ffmpegOutput);
                throw new RuntimeException("FFmpeg failed: " + errorMsg);
            }

        } catch (Exception e) {
            log.error("❌ Export failed [{}]: {}", jobId, e.getMessage(), e);
            job = exportJobRepository.findById(jobId).orElse(job);
            job.setStatus(ExportJob.ExportStatus.FAILED);

            String errMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            if (errMsg.length() > 1000) errMsg = errMsg.substring(0, 1000) + "...";
            job.setErrorMessage(errMsg);
            job.setCompletedAt(LocalDateTime.now());
            projectService.updateStatus(project.getId(), Project.ProjectStatus.FAILED);
        }

        exportJobRepository.save(job);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIDEO SOURCE RESOLUTION
    // ─────────────────────────────────────────────────────────────────────────

    private Path resolveSourceVideo(Project project, Path projectDir) throws Exception {

        if (project.getVideoPath() != null && !project.getVideoPath().isBlank()) {
            Path p = Paths.get(project.getVideoPath());
            if (Files.exists(p)) {
                log.info("Using uploaded video: {}", p);
                return p;
            }
            log.warn("videoPath set but file missing: {}", p);
        }

        for (String ext : new String[]{"mp4", "mkv", "webm", "mov", "avi"}) {
            Path candidate = projectDir.resolve("source." + ext);
            if (Files.exists(candidate) && Files.size(candidate) > 1024) {
                log.info("Found existing source file: {}", candidate);
                return candidate;
            }
        }

        if (project.getYoutubeUrl() != null && !project.getYoutubeUrl().isBlank()) {
            return downloadYoutubeVideo(
                    project.getYoutubeUrl(), project.getId(), projectDir);
        }

        throw new RuntimeException(
                "No video source found. Upload a video or provide a YouTube URL.");
    }

    private Path downloadYoutubeVideo(String youtubeUrl, String projectId, Path projectDir)
            throws Exception {

        Path outputFile = projectDir.resolve("source.mp4");

        if (Files.exists(outputFile) && Files.size(outputFile) > 1024) {
            log.info("YouTube video already downloaded: {}", outputFile);
            return outputFile;
        }

        log.info("Downloading YouTube video: {}", youtubeUrl);

        List<String> command = new ArrayList<>();
        command.add(ytDlpPath.replace("/", "\\"));
        command.add("-f");
        command.add("bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b");
        command.add("--merge-output-format");
        command.add("mp4");
        command.add("--no-playlist");
        command.add("--force-overwrites");
        command.add("-o");
        command.add(normalizePath(outputFile));
        command.add(youtubeUrl);

        log.info("yt-dlp command: {}", command);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder outputLog = new StringBuilder();
        try (BufferedReader reader =
                     new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.info("yt-dlp: {}", line);
                outputLog.append(line).append("\n");
            }
        }

        int exitCode = process.waitFor();

        if (exitCode != 0 || !Files.exists(outputFile)) {
            throw new RuntimeException(
                    "yt-dlp failed (exit code " + exitCode + ").\n" + outputLog);
        }

        projectService.updateVideoPath(projectId, normalizePath(outputFile));

        log.info("✅ Downloaded: {} ({} MB)",
                outputFile, Files.size(outputFile) / 1024 / 1024);

        return outputFile;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SRT PREPARATION
    // ─────────────────────────────────────────────────────────────────────────

    private Path prepareSrtFile(Project project, Path projectDir, String subtitleLanguage)
        throws Exception {

        Path srtPath = projectDir.resolve("subtitles.srt");

        // ✅ ALWAYS delete old SRT to force regeneration with correct language
        Files.deleteIfExists(srtPath);

        // Default to burmese if null
        if (subtitleLanguage == null || subtitleLanguage.isBlank()) {
            subtitleLanguage = "burmese";
        }

        log.info("🌐 Preparing SRT in language: {}", subtitleLanguage);

        if ("burmese".equalsIgnoreCase(subtitleLanguage)) {
            log.info("📝 Using Burmese SCRIPT for subtitles");

            Script script = scriptRepository.findByProjectId(project.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Script not found – generate the script first."));

            Path voiceoverPath = projectDir.resolve("voiceover.mp3");
            double duration = Files.exists(voiceoverPath)
                    ? getAudioDuration(voiceoverPath) : 60.0;

            String srtContent = generateSrtFromScript(script.getContent(), duration);

            // Write with UTF-8 BOM
            byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
            byte[] content = srtContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            byte[] withBom = new byte[bom.length + content.length];
            System.arraycopy(bom, 0, withBom, 0, bom.length);
            System.arraycopy(content, 0, withBom, bom.length, content.length);
            Files.write(srtPath, withBom);

            log.info("✅ Generated Burmese SRT ({} chars) → {}", srtContent.length(), srtPath);

        } else {
            log.info("📝 Using ORIGINAL transcript for subtitles");

            Transcript transcript = transcriptRepository.findByProjectId(project.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Transcript not found – transcribe first."));

            if (transcript.getSrtContent() == null || transcript.getSrtContent().isBlank()) {
                throw new RuntimeException(
                        "Original SRT is empty. Re-transcribe or use Burmese subtitles.");
            }

            byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
            byte[] content = transcript.getSrtContent()
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            byte[] withBom = new byte[bom.length + content.length];
            System.arraycopy(bom, 0, withBom, 0, bom.length);
            System.arraycopy(content, 0, withBom, bom.length, content.length);
            Files.write(srtPath, withBom);

            log.info("✅ Using original SRT → {}", srtPath);
        }

        return srtPath;
    }

    private String generateSrtFromScript(String script, double totalDuration) {
        // Clean script - remove standalone dots and empty lines
        String cleaned = script
                .replaceAll("(?m)^\\s*\\.\\s*$", "")
                .replaceAll("(?m)^\\s*$\\n", "")
                .trim();

        if (cleaned.isEmpty()) return "";

        String[] sentences = cleaned.split("(?<=[.!?။])\\s*");

        int validCount = 0;
        for (String s : sentences) {
            if (s.trim().length() > 2) validCount++;
        }
        if (validCount == 0) return "";

        double timePerSentence = totalDuration / validCount;
        StringBuilder srt = new StringBuilder();
        double currentTime = 0;
        int index = 1;

        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (sentence.length() <= 2) continue;

            if (sentence.length() > 80) {
                String[] parts = sentence.split("(?<=[,၊])\\s*");
                double subTime = timePerSentence / Math.max(parts.length, 1);
                for (String part : parts) {
                    part = part.trim();
                    if (part.length() <= 2) continue;
                    appendSrtEntry(srt, index++, currentTime, currentTime + subTime, part);
                    currentTime += subTime;
                }
            } else {
                appendSrtEntry(srt, index++, currentTime,
                        currentTime + timePerSentence, sentence);
                currentTime += timePerSentence;
            }
        }

        return srt.toString();
    }

    private void appendSrtEntry(StringBuilder srt, int index,
                                double start, double end, String text) {
        srt.append(index).append("\n")
           .append(formatSrtTimeDouble(start))
           .append(" --> ")
           .append(formatSrtTimeDouble(end)).append("\n")
           .append(text).append("\n\n");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FFMPEG ARG LIST BUILDER (no shell, no escaping issues)
    // ─────────────────────────────────────────────────────────────────────────

    private List<String> buildFFmpegArgs(Path source, Path projectDir, Path output,
                                          ExportSettings settings, Path srtPath) {

        Path voiceover = projectDir.resolve("voiceover.mp3");
        boolean hasVoiceover = Files.exists(voiceover);

        Path logo = projectDir.resolve("logo.png");
        boolean hasLogo = Files.exists(logo);

        boolean hasSrt = (srtPath != null) && Files.exists(srtPath)
                && Boolean.TRUE.equals(settings.getSubtitleEnabled());

        String[] wh = resolveResolution(settings.getAspectRatio()).split("x");
        String w = wh[0], h = wh[1];

        int mix        = settings.getAudioMix() != null ? settings.getAudioMix() : 70;
        float origVol  = (100 - mix) / 100.0f;
        float voiceVol = mix / 100.0f;

        double alpha = (settings.getLogoOpacity() != null
                ? settings.getLogoOpacity() : 80) / 100.0;
        int logoW = (int) (200.0 * (settings.getLogoSize() != null
                ? settings.getLogoSize() : 100) / 100.0);
        String logoPos = buildLogoPosition(settings.getLogoPosition());

        // ── Build filter_complex string ─────────────────────────────────────
        StringBuilder filter = new StringBuilder();

        // Scale + pad
        filter.append("[0:v]scale=").append(w).append(":").append(h)
              .append(":force_original_aspect_ratio=decrease,")
              .append("pad=").append(w).append(":").append(h)
              .append(":(ow-iw)/2:(oh-ih)/2:black[scaled]");

        String lastV = "scaled";

        // Subtitles
        if (hasSrt) {
            // For ProcessBuilder, use forward slashes and escape drive colon
            String srtForFilter = normalizePath(srtPath)
                    .replace("\\", "/")
                    .replaceFirst("^([A-Za-z]):/", "$1\\\\:/");

            String font = (settings.getSubtitleFont() != null
                    && !settings.getSubtitleFont().isBlank())
                    ? settings.getSubtitleFont() : "Myanmar Text";
            int fontSize = settings.getSubtitleSize() != null
                    ? settings.getSubtitleSize() : 24;

            filter.append(";[").append(lastV).append("]")
                  .append("subtitles=filename='").append(srtForFilter).append("'")
                  .append(":force_style='")
                  .append("FontName=").append(font).append(",")
                  .append("FontSize=").append(fontSize).append(",")
                  .append("PrimaryColour=16777215,")
                  .append("OutlineColour=0,")
                  .append("BorderStyle=1,")
                  .append("Outline=2,")
                  .append("Shadow=0,")
                  .append("MarginV=30,")
                  .append("Alignment=2")
                  .append("'[subtitled]");
            lastV = "subtitled";
        }

        // Logo overlay
        int logoIdx = hasVoiceover ? 2 : 1;
        if (hasLogo) {
            filter.append(";[").append(logoIdx).append(":v]")
                  .append("scale=").append(logoW).append(":-1,")
                  .append("format=rgba,")
                  .append("colorchannelmixer=aa=").append(String.format("%.2f", alpha))
                  .append("[logo]");
            filter.append(";[").append(lastV).append("][logo]overlay=")
                  .append(logoPos).append("[finalv]");
            lastV = "finalv";
        }

        // Audio mix
        if (hasVoiceover) {
            filter.append(";[0:a]volume=")
                  .append(String.format("%.2f", origVol)).append("[a0]")
                  .append(";[1:a]volume=")
                  .append(String.format("%.2f", voiceVol)).append("[a1]")
                  .append(";[a0][a1]amix=inputs=2:duration=first[aout]");
        }

        // ── Build argument list ─────────────────────────────────────────────
        List<String> args = new ArrayList<>();

        // FFmpeg executable - use backslashes on Windows
        args.add(ffmpegPath.replace("/", "\\"));
        args.add("-y");

        // Inputs
        args.add("-i"); args.add(normalizePath(source));
        if (hasVoiceover) {
            args.add("-i"); args.add(normalizePath(voiceover));
        }
        if (hasLogo) {
            args.add("-i"); args.add(normalizePath(logo));
        }

        // Filter complex
        args.add("-filter_complex");
        args.add(filter.toString());

        // Output mapping
        args.add("-map"); args.add("[" + lastV + "]");
        if (hasVoiceover) {
            args.add("-map"); args.add("[aout]");
        } else {
            args.add("-map"); args.add("0:a?");
        }

        // Encoding settings
        args.add("-c:v");      args.add("libx264");
        args.add("-preset");   args.add("fast");
        args.add("-crf");      args.add("23");
        args.add("-c:a");      args.add("aac");
        args.add("-b:a");      args.add("192k");
        args.add("-movflags"); args.add("+faststart");
        args.add("-shortest");

        // Output file
        args.add(normalizePath(output));

        return args;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalize path: resolves \.\ and returns clean absolute path string
     */
    private String normalizePath(Path path) {
        try {
            return path.toRealPath().toString();
        } catch (Exception e) {
            return path.normalize().toAbsolutePath().toString();
        }
    }

    private String extractFFmpegError(String output) {
        if (output == null || output.isBlank()) return "No FFmpeg output captured";
        String[] lines = output.split("\n");
        StringBuilder errors = new StringBuilder();
        for (String line : lines) {
            String lower = line.toLowerCase();
            if (lower.contains("error") || lower.contains("invalid")
                    || lower.contains("no such file") || lower.contains("failed")
                    || lower.contains("cannot open") || lower.contains("not found")) {
                errors.append(line.trim()).append(" | ");
            }
        }
        if (errors.length() > 0) {
            String result = errors.toString();
            return result.length() > 800 ? result.substring(0, 800) + "..." : result;
        }
        int start = Math.max(0, lines.length - 5);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < lines.length; i++) {
            if (!lines[i].trim().isEmpty()) sb.append(lines[i].trim()).append(" | ");
        }
        return sb.toString();
    }

    private long toSeconds(String hh, String mm, String ss) {
        return Integer.parseInt(hh) * 3600L
             + Integer.parseInt(mm) * 60L
             + Integer.parseInt(ss);
    }

    private String resolveResolution(String aspectRatio) {
        if (aspectRatio == null) return "1080x1920";
        return switch (aspectRatio) {
            case "9:16"  -> "1080x1920";
            case "4:5"   -> "1080x1350";
            case "1:1"   -> "1080x1080";
            case "16:9"  -> "1920x1080";
            default      -> "1080x1920";
        };
    }

    private String buildLogoPosition(String position) {
        int m = 20;
        if (position == null) position = "bottom-right";
        return switch (position) {
            case "top-left"      -> m + ":" + m;
            case "top-center"    -> "(main_w-overlay_w)/2:" + m;
            case "top-right"     -> "main_w-overlay_w-" + m + ":" + m;
            case "center-left"   -> m + ":(main_h-overlay_h)/2";
            case "center"        -> "(main_w-overlay_w)/2:(main_h-overlay_h)/2";
            case "center-right"  -> "main_w-overlay_w-" + m + ":(main_h-overlay_h)/2";
            case "bottom-left"   -> m + ":main_h-overlay_h-" + m;
            case "bottom-center" -> "(main_w-overlay_w)/2:main_h-overlay_h-" + m;
            default              -> "main_w-overlay_w-" + m + ":main_h-overlay_h-" + m;
        };
    }

    private double getAudioDuration(Path audioPath) {
        try {
            List<String> command = List.of(
                    ffprobePath.replace("/", "\\"),
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    normalizePath(audioPath)
            );

            ProcessBuilder pb = new ProcessBuilder(command);
            Process p = pb.start();

            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line = reader.readLine();
                p.waitFor();
                if (line != null && !line.isBlank()) {
                    return Double.parseDouble(line.trim());
                }
            }
        } catch (Exception e) {
            log.warn("ffprobe failed ({}), defaulting to 60s", e.getMessage());
        }
        return 60.0;
    }

    private String formatSrtTimeDouble(double seconds) {
        int h  = (int) (seconds / 3600);
        int m  = (int) ((seconds % 3600) / 60);
        int s  = (int) (seconds % 60);
        int ms = (int) Math.round((seconds - Math.floor(seconds)) * 1000);
        if (ms >= 1000) { ms = 0; s++; }
        return String.format("%02d:%02d:%02d,%03d", h, m, s, ms);
    }

    private ExportResponse toResponse(ExportJob job) {
        return ExportResponse.builder()
                .id(job.getId())
                .projectId(job.getProject().getId())
                .status(job.getStatus().name().toLowerCase())
                .progress(job.getProgress())
                .outputPath(job.getOutputPath())
                .errorMessage(job.getErrorMessage())
                .startedAt(job.getStartedAt()    != null
                        ? job.getStartedAt().toString()    : null)
                .completedAt(job.getCompletedAt() != null
                        ? job.getCompletedAt().toString() : null)
                .build();
    }
}