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
    private final SubtitleRendererService subtitleRendererService;

    @Value("${app.tools.yt-dlp-path:yt-dlp}")
    private String ytDlpPath;

    @Value("${app.tools.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    @Value("${app.tools.ffprobe-path:ffprobe}")
    private String ffprobePath;

    @Value("${app.tools.fonts-dir:}")
    private String fontsDir;

    // Max characters per subtitle line (Burmese is wide → keep short)
    private static final int MAX_BURMESE_CHARS = 35;

    // atempo: 0.5 (slow) to 2.0 (fast) per filter instance
    // We chain filters for values outside this range
    private static final double TEMPO_TOLERANCE = 0.02; // 2% tolerance, skip adjustment

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
                .logoX(settings.getLogoX())
                .logoY(settings.getLogoY()) 
                .logoSize(settings.getLogoSize())
                .logoOpacity(settings.getLogoOpacity())
                .subtitleEnabled(settings.getSubtitleEnabled())
                .subtitleFont(settings.getSubtitleFont())
                .subtitleSize(settings.getSubtitleSize())
                .audioMix(settings.getAudioMix())
                .subtitleLanguage(settings.getSubtitleLanguage())
                .subtitleX(settings.getSubtitleX())
                .subtitleY(settings.getSubtitleY())
                .subtitleWidth(settings.getSubtitleWidth())
                .subtitleFontColor(settings.getSubtitleFontColor())
                .subtitleBgColor(settings.getSubtitleBgColor())
                .subtitleBorderStyle(settings.getSubtitleBorderStyle())
                .subtitleOutlineColor(settings.getSubtitleOutlineColor())
                .subtitleOutlineWidth(settings.getSubtitleOutlineWidth())
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

    public ExportResponse getLatestForProject(String projectId) {
        return exportJobRepository
                .findTopByProjectIdOrderByStartedAtDesc(projectId)
                .map(this::toResponse)
                .orElse(null);
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

    public Resource loadPreviewVideo(String jobId) {

        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Export job not found"));

        if (job.getStatus() != ExportJob.ExportStatus.DONE) {
            throw new RuntimeException("Export not completed yet");
        }

        Path videoPath = Paths.get(job.getOutputPath());

        if (!Files.exists(videoPath)) {
            throw new RuntimeException("Video file not found");
        }

        return new FileSystemResource(videoPath.toFile());
    }

    /**
     * Load the ORIGINAL source video (before export processing).
     * Used by the editor for live preview.
     */
    public Resource loadSourceVideo(String projectId) {
        log.info("Loading source video for project: {}", projectId);
        try {
            //uses authenticated user - works because JWT is sent
            Project project = projectService.getProjectEntity(projectId);
            
            String videoPath = project.getVideoPath();
            if (videoPath == null || videoPath.isBlank()) {
                log.warn("No video path for project: {}", projectId);
                return null;
            }

            Path path = Paths.get(videoPath);
            if (!Files.exists(path)) {
                log.warn("Video file not found at: {}", path);
                return null;
            }

            return new FileSystemResource(path);
        } catch (Exception e) {
            log.error("Failed to load source video for {}: {}", projectId, e.getMessage());
            return null;
        }
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

        Path adjustedVoicePath = null; // temp file, cleaned up in finally

        try {
            Path projectDir   = storageService.getProjectDir(project.getId());
            Path outputPath   = projectDir.resolve("final_output.mp4");
            Path voiceoverPath = projectDir.resolve("voiceover.mp3");

            Files.deleteIfExists(outputPath);

            // ── Step 1: Resolve source video ─────────────────────────────
            Path sourcePath = resolveSourceVideo(project, projectDir);
            log.info("Source video: {}", sourcePath);

            // ── Step 2: Measure REAL durations via ffprobe ───────────────
            double videoDuration = getMediaDuration(sourcePath);
            log.info("Video duration: {}s", videoDuration);

            boolean hasVoiceover = Files.exists(voiceoverPath)
                    && Files.size(voiceoverPath) > 0;

            double voiceDuration = 0.0;
            if (hasVoiceover) {
                voiceDuration = getMediaDuration(voiceoverPath);
                log.info("Voiceover duration: {}s", voiceDuration);
            }

            // ── Step 3: Calculate tempo ratio ────────────────────────────
            //
            //   tempoRatio = voiceDuration / videoDuration
            //
            //   Example: voice=240s, video=180s → ratio=1.333
            //   → speed up voice 1.333x so it finishes exactly at 180s
            //   → SRT timestamps ÷ 1.333 to match compressed timeline
            //
            double tempoRatio = 1.0;
            Path activeVoiceover = voiceoverPath;

            if (hasVoiceover && videoDuration > 1.0 && voiceDuration > 1.0) {
                tempoRatio = voiceDuration / videoDuration;
                log.info("Raw tempo ratio (voice/video): {}", String.format("%.4f", tempoRatio));

                // Clamp to supported range (0.25x – 4.0x)
                double clampedRatio = Math.max(0.25, Math.min(4.0, tempoRatio));
                if (clampedRatio != tempoRatio) {
                    log.warn("Tempo ratio clamped from {} to {}",
                            tempoRatio, clampedRatio);
                    tempoRatio = clampedRatio;
                }

                if (Math.abs(tempoRatio - 1.0) > TEMPO_TOLERANCE) {
                    adjustedVoicePath = projectDir.resolve("voiceover_adjusted.mp3");
                    Files.deleteIfExists(adjustedVoicePath);

                    log.info("Adjusting voiceover speed by {}x ...", tempoRatio);
                    adjustVoiceoverTempo(voiceoverPath, adjustedVoicePath, tempoRatio);

                    // Verify output
                    double adjustedDuration = getMediaDuration(adjustedVoicePath);
                    log.info("Adjusted voice duration: {}s (target: {}s)",
                            adjustedDuration, videoDuration);

                    activeVoiceover = adjustedVoicePath;
                } else {
                    log.info("Tempo ratio {:.4f} within {}% tolerance — skipping adjustment",
                            tempoRatio, (int)(TEMPO_TOLERANCE * 100));
                    tempoRatio = 1.0; // treat as no change for SRT remapping
                }
            }

            // ── Step 4: Generate synced SRT ───────────────────────────────
            //
            //  tempoRatio is used to remap SRT timestamps:
            //  newTimestamp = originalTimestamp / tempoRatio
            //
            Path srtPath = null;
            if (Boolean.TRUE.equals(settings.getSubtitleEnabled())) {
                try {
                    srtPath = prepareSrtFile(
                            project, projectDir,
                            settings.getSubtitleLanguage(),
                            videoDuration,
                            voiceDuration,
                            tempoRatio);
                } catch (Exception e) {
                    log.warn("SRT generation failed, proceeding without subtitles: {}",
                            e.getMessage());
                    settings.setSubtitleEnabled(false);
                }
            }

            // ── Step 5: Build & run FFmpeg ────────────────────────────────
            List<String> ffmpegArgs = buildFFmpegArgs(
                    sourcePath, projectDir, outputPath,
                    settings, srtPath, activeVoiceover);

            log.info("FFmpeg command: {}", ffmpegArgs);
            runFFmpeg(ffmpegArgs, job);

        } catch (Exception e) {
            log.error("❌ Export failed [{}]: {}", jobId, e.getMessage(), e);
            job = exportJobRepository.findById(jobId).orElse(job);
            job.setStatus(ExportJob.ExportStatus.FAILED);
            String errMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            if (errMsg.length() > 1000) errMsg = errMsg.substring(0, 1000) + "...";
            job.setErrorMessage(errMsg);
            job.setCompletedAt(LocalDateTime.now());
            projectService.updateStatus(project.getId(), Project.ProjectStatus.FAILED);
            exportJobRepository.save(job);
        } finally {
            // Always clean up temp adjusted voice file
            if (adjustedVoicePath != null) {
                try {
                    Files.deleteIfExists(adjustedVoicePath);
                    log.info("Cleaned up temp file: {}", adjustedVoicePath);
                } catch (Exception ignored) {}
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FFMPEG RUNNER
    // ─────────────────────────────────────────────────────────────────────────

    private void runFFmpeg(List<String> args, ExportJob job) throws Exception {
        Path projectDir = storageService.getProjectDir(job.getProject().getId());
        Path outputPath = projectDir.resolve("final_output.mp4");

        ProcessBuilder pb = new ProcessBuilder(args);
        pb.redirectErrorStream(true);

        if (fontsDir != null && !fontsDir.isBlank()) {
            Map<String, String> env = pb.environment();
            String fontsDirWin = fontsDir.replace("/", "\\");
            env.put("FONTCONFIG_PATH", fontsDirWin);
            env.put("FC_CONFIG_DIR",   fontsDirWin);
        }

        Process process = pb.start();

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
            projectService.updateStatus(job.getProject().getId(), Project.ProjectStatus.DONE);
            exportJobRepository.save(job);
            log.info("✅ Export complete: {}", outputPath);
        } else {
            throw new RuntimeException(
                    "FFmpeg failed (exit " + exitCode + "): "
                    + extractFFmpegError(ffmpegOutput.toString()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VOICEOVER TEMPO ADJUSTMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Speed-adjust voiceover to match video duration.
     *
     * tempoRatio = voiceDuration / videoDuration
     *   > 1.0 = voice is LONGER than video → speed UP (compress)
     *   < 1.0 = voice is SHORTER than video → slow DOWN (stretch)
     *
     * FFmpeg atempo range per filter: [0.5, 2.0]
     * For values outside this, we CHAIN filters.
     */
    private void adjustVoiceoverTempo(Path input, Path output, double tempoRatio)
            throws Exception {

        String filterChain = buildAtempoFilterChain(tempoRatio);
        log.info("atempo filter chain: {} (ratio={})", filterChain, tempoRatio);

        List<String> args = List.of(
                ffmpegPath.replace("/", "\\"),
                "-y",
                "-i", normalizePath(input),
                "-filter:a", filterChain,
                "-c:a", "libmp3lame",
                "-q:a", "2",
                normalizePath(output)
        );

        ProcessBuilder pb = new ProcessBuilder(args);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        StringBuilder out = new StringBuilder();
        try (BufferedReader r =
                     new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            String line;
            while ((line = r.readLine()) != null) {
                log.debug("atempo: {}", line);
                out.append(line).append("\n");
            }
        }

        int exit = p.waitFor();
        if (exit != 0 || !Files.exists(output)) {
            throw new RuntimeException(
                    "Tempo adjustment failed (exit " + exit + "): "
                    + extractFFmpegError(out.toString()));
        }
    }

    /**
     * Build chained atempo filter.
     *
     * atempo only accepts 0.5 – 2.0 per instance.
     * Chain multiple to handle extreme ratios:
     *   ratio=3.0  → atempo=2.0,atempo=1.5
     *   ratio=0.25 → atempo=0.5,atempo=0.5
     */
    private String buildAtempoFilterChain(double ratio) {
        List<String> filters = new ArrayList<>();

        if (ratio > 2.0) {
            // Speed up: keep dividing by 2.0 until within range
            while (ratio > 2.0) {
                filters.add("atempo=2.0");
                ratio /= 2.0;
            }
        } else if (ratio < 0.5) {
            // Slow down: keep multiplying by 0.5 until within range
            while (ratio < 0.5) {
                filters.add("atempo=0.5");
                ratio /= 0.5;
            }
        }

        // Add the remaining ratio (now guaranteed within [0.5, 2.0])
        filters.add(String.format(Locale.US, "atempo=%.6f", ratio));

        return String.join(",", filters);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SRT PREPARATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param subtitleLanguage "burmese" → Burmese script, else original transcript SRT
     * @param videoDuration    real video duration (seconds) — the final timeline
     * @param voiceDuration    real voiceover duration BEFORE tempo adjustment
     * @param tempoRatio       voiceDuration / videoDuration (applied to voice)
     *                         All SRT timestamps are divided by this ratio to sync
     */
    private Path prepareSrtFile(Project project, Path projectDir,
                                String subtitleLanguage,
                                double videoDuration,
                                double voiceDuration,
                                double tempoRatio) throws Exception {

        Path srtPath = projectDir.resolve("subtitles.srt");
        Files.deleteIfExists(srtPath);

        if (subtitleLanguage == null || subtitleLanguage.isBlank()) {
            subtitleLanguage = "burmese";
        }

        log.info("Preparing SRT | lang={} | videoDuration={}s | voiceDuration={}s | ratio={}",
                subtitleLanguage, videoDuration, voiceDuration, tempoRatio);

        String srtContent;

        if ("burmese".equalsIgnoreCase(subtitleLanguage)) {
            // ── Burmese: distribute script evenly over voiceDuration, ─────
            //            then remap timestamps by ÷ tempoRatio
            Script script = scriptRepository.findByProjectId(project.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Script not found. Generate script first."));

            // Use voiceDuration as the base (original speech timing),
            // then compress by tempoRatio to get final video-synced timing
            double baseDuration = voiceDuration > 1.0 ? voiceDuration : videoDuration;
            srtContent = generateBurmeseAlignedSrt(
                    script.getContent(), baseDuration, tempoRatio);

        } else {
            // ── Original language: use stored SRT, remap timestamps ───────
            Transcript transcript = transcriptRepository.findByProjectId(project.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Transcript not found. Transcribe first."));

            if (transcript.getSrtContent() == null
                    || transcript.getSrtContent().isBlank()) {
                throw new RuntimeException(
                        "Original SRT is empty. Re-transcribe or use Burmese subtitles.");
            }

            srtContent = transcript.getSrtContent();

            // Remap timestamps if tempo was changed
            if (Math.abs(tempoRatio - 1.0) > TEMPO_TOLERANCE) {
                log.info("Remapping original SRT timestamps by ratio={}", tempoRatio);
                srtContent = remapSrtTimestamps(srtContent, tempoRatio);
            }
        }

        writeSrtWithBom(srtPath, srtContent);
        log.info("SRT written: {} ({} chars)", srtPath, srtContent.length());
        return srtPath;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SRT GENERATORS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate Burmese SRT:
     * 1. Distribute sentences evenly over baseDuration (= original voice duration)
     * 2. Remap each timestamp by ÷ tempoRatio to get compressed/stretched timing
     *
     * Result: subtitles appear exactly in sync with the tempo-adjusted voice.
     */

    private String generateBurmeseAlignedSrt(String script,
                                              double baseDuration,
                                              double tempoRatio) {
        String cleaned = cleanScript(script);
        if (cleaned.isEmpty()) return "";

        // Split into sentences first
        String[] sentences = splitSentences(cleaned);
        if (sentences.length == 0) return "";

        // Further split into short chunks (max 35 chars each)
        List<String> chunks = new ArrayList<>();
        for (String sentence : sentences) {
            chunks.addAll(splitIntoChunks(sentence, MAX_BURMESE_CHARS));
        }

        if (chunks.isEmpty()) return "";

        log.info("Burmese SRT: {} sentences → {} chunks", sentences.length, chunks.size());

        // Distribute time proportionally by character count (not equally)
        int totalChars = chunks.stream().mapToInt(String::length).sum();
        if (totalChars == 0) return "";

        StringBuilder srt = new StringBuilder();
        double cursor = 0.0;
        int index = 1;

        for (String chunk : chunks) {
            // Time proportional to chunk length
            double chunkTime = baseDuration * ((double) chunk.length() / totalChars);

            // Minimum 1.2s per subtitle (readable), max 5s
            chunkTime = Math.max(1.2, Math.min(5.0, chunkTime));

            double startRemapped = cursor / tempoRatio;
            double endRemapped   = (cursor + chunkTime) / tempoRatio;

            appendSrtEntry(srt, index++, startRemapped, endRemapped, chunk);
            cursor += chunkTime;
        }

        return srt.toString();
    }

    /**
     * Split a sentence into chunks ≤ maxLen characters.
     * Prefers breaking at Burmese punctuation (၊ ။ ,), then spaces.
     */
    private List<String> splitIntoChunks(String text, int maxLen) {
        List<String> chunks = new ArrayList<>();
        text = text.trim();
        if (text.isEmpty()) return chunks;

        // Short enough → return as-is
        if (text.length() <= maxLen) {
            chunks.add(text);
            return chunks;
        }

        // Try splitting at Burmese punctuation first
        String[] segments = text.split("(?<=[၊။,])\\s*");

        StringBuilder current = new StringBuilder();
        for (String seg : segments) {
            seg = seg.trim();
            if (seg.isEmpty()) continue;

            if (current.length() + seg.length() + 1 <= maxLen) {
                if (current.length() > 0) current.append(" ");
                current.append(seg);
            } else {
                // Flush current
                if (current.length() > 0) {
                    chunks.add(current.toString().trim());
                    current.setLength(0);
                }

                // Segment itself is too long → break at spaces
                if (seg.length() > maxLen) {
                    chunks.addAll(breakAtSpaces(seg, maxLen));
                } else {
                    current.append(seg);
                }
            }
        }

        if (current.length() > 0) {
            chunks.add(current.toString().trim());
        }

        return chunks;
    }

    /**
     * Hard-break long text at word boundaries (spaces).
     */
    private List<String> breakAtSpaces(String text, int maxLen) {
        List<String> result = new ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            if (current.length() + word.length() + 1 <= maxLen) {
                if (current.length() > 0) current.append(" ");
                current.append(word);
            } else {
                if (current.length() > 0) {
                    result.add(current.toString().trim());
                    current.setLength(0);
                }
                // Single word longer than maxLen → just push it (rare for Burmese)
                if (word.length() > maxLen) {
                    result.add(word);
                } else {
                    current.append(word);
                }
            }
        }

        if (current.length() > 0) {
            result.add(current.toString().trim());
        }

        return result;
    }

    /**
     * Remap all SRT timestamps by dividing by tempoRatio.
     *
     * When voice is sped up (tempoRatio > 1.0):
     *   original subtitle at 00:02:00 → remapped to 00:01:30 (for ratio=1.333)
     *   This matches where the sped-up audio is actually saying those words.
     */
    private String remapSrtTimestamps(String srtContent, double tempoRatio) {
        if (Math.abs(tempoRatio - 1.0) < 0.001) return srtContent;

        // Matches both "00:00:00,000" and "00:00:00.000"
        Pattern tsPattern = Pattern.compile(
                "(\\d{2}):(\\d{2}):(\\d{2})[,\\.](\\d{3})");

        StringBuilder result = new StringBuilder();
        Matcher m = tsPattern.matcher(srtContent);

        while (m.find()) {
            long h  = Long.parseLong(m.group(1));
            long mi = Long.parseLong(m.group(2));
            long s  = Long.parseLong(m.group(3));
            long ms = Long.parseLong(m.group(4));

            // Total milliseconds
            double totalMs = (h * 3600L + mi * 60L + s) * 1000.0 + ms;

            // Remap
            double remappedMs = totalMs / tempoRatio;

            long rh  = (long) remappedMs / 3_600_000;
            long rmi = ((long) remappedMs % 3_600_000) / 60_000;
            long rs  = ((long) remappedMs % 60_000) / 1_000;
            long rms = (long) remappedMs % 1_000;

            m.appendReplacement(result,
                    String.format("%02d:%02d:%02d,%03d", rh, rmi, rs, rms));
        }
        m.appendTail(result);

        return result.toString();
    }

    private List<String> buildFFmpegArgs(Path source, Path projectDir, Path output,
                                      ExportSettings settings, Path srtPath,
                                      Path activeVoiceover) throws Exception {

        boolean hasVoiceover = activeVoiceover != null
                && Files.exists(activeVoiceover) && Files.size(activeVoiceover) > 0;

        Path logo = projectDir.resolve("logo.png");
        boolean hasLogo = Files.exists(logo);

        boolean hasSrt = srtPath != null && Files.exists(srtPath)
                && Boolean.TRUE.equals(settings.getSubtitleEnabled());

        String[] wh = resolveResolution(settings.getAspectRatio()).split("x");
        int videoW = Integer.parseInt(wh[0]);
        int videoH = Integer.parseInt(wh[1]);

        // ════════════════════════════════════════════════════════════
        // STEP 1: Render Burmese subtitles to PNG using Java AWT
        // ════════════════════════════════════════════════════════════
        List<SubtitleRendererService.SubtitleFrame> subFrames = new ArrayList<>();
        if (hasSrt) {
            try {
                Path framesDir = projectDir.resolve("subtitle_frames");
                subFrames = subtitleRendererService.renderSubtitlesToPng(
                        srtPath, framesDir, settings, videoW, videoH);
                log.info("✅ Generated {} subtitle PNG frames", subFrames.size());
            } catch (Exception e) {
                log.error("Subtitle rendering failed: {}", e.getMessage(), e);
                hasSrt = false;
            }
        }

        int mix = settings.getAudioMix() != null ? settings.getAudioMix() : 70;
        float origVol = (100 - mix) / 100.0f;
        float voiceVol = mix / 100.0f;

        double alpha = (settings.getLogoOpacity() != null
                ? settings.getLogoOpacity() : 80) / 100.0;
        int logoW = (int) (200.0 * (settings.getLogoSize() != null
                ? settings.getLogoSize() : 100) / 100.0);
        String logoPos = buildLogoPosition(settings);

        // ════════════════════════════════════════════════════════════
        // STEP 2: Build FFmpeg inputs
        // ════════════════════════════════════════════════════════════
        List<String> args = new ArrayList<>();
        args.add(ffmpegPath.replace("/", "\\"));
        args.add("-y");

        // Input 0: video
        args.add("-i"); args.add(normalizePath(source));
        int inputIdx = 1;

        int voiceInputIdx = -1;
        if (hasVoiceover) {
            args.add("-i"); args.add(normalizePath(activeVoiceover));
            voiceInputIdx = inputIdx++;
        }

        int logoInputIdx = -1;
        if (hasLogo) {
            args.add("-i"); args.add(normalizePath(logo));
            logoInputIdx = inputIdx++;
        }

        // Subtitle PNG inputs
        List<int[]> subInputs = new ArrayList<>();
        for (var frame : subFrames) {
            args.add("-i"); args.add(normalizePath(frame.pngPath()));
            subInputs.add(new int[]{
                    inputIdx,
                    (int) (frame.startSec() * 1000),
                    (int) (frame.endSec() * 1000)
            });
            inputIdx++;
        }

        // ════════════════════════════════════════════════════════════
        // STEP 3: Build filter_complex
        // ════════════════════════════════════════════════════════════
        StringBuilder filter = new StringBuilder();

        // 1. Scale + pad video
        filter.append("[0:v]scale=").append(videoW).append(":").append(videoH)
            .append(":force_original_aspect_ratio=decrease,")
            .append("pad=").append(videoW).append(":").append(videoH)
            .append(":(ow-iw)/2:(oh-ih)/2:black[v0]");
        String lastV = "v0";

        // 2. Overlay subtitle PNGs with time-based enable
        for (int i = 0; i < subInputs.size(); i++) {
            int[] sub = subInputs.get(i);
            int idx = sub[0];
            double startSec = sub[1] / 1000.0;
            double endSec = sub[2] / 1000.0;

            String nextV = "vs" + i;
            filter.append(";[").append(lastV).append("][").append(idx).append(":v]")
                .append("overlay=0:0:enable='between(t,")
                .append(String.format(Locale.US, "%.3f", startSec))
                .append(",")
                .append(String.format(Locale.US, "%.3f", endSec))
                .append(")'[").append(nextV).append("]");
            lastV = nextV;
        }

        // 3. Logo overlay
        if (hasLogo) {
            filter.append(";[").append(logoInputIdx).append(":v]")
                .append("scale=").append(logoW).append(":-1,")
                .append("format=rgba,")
                .append("colorchannelmixer=aa=")
                .append(String.format(Locale.US, "%.2f", alpha))
                .append("[logo]")
                .append(";[").append(lastV).append("][logo]overlay=")
                .append(logoPos).append("[finalv]");
            lastV = "finalv";
        }

        // 4. Audio mix
        if (hasVoiceover) {
            filter.append(";[0:a]volume=")
                .append(String.format(Locale.US, "%.2f", origVol)).append("[a0]")
                .append(";[").append(voiceInputIdx).append(":a]volume=")
                .append(String.format(Locale.US, "%.2f", voiceVol)).append("[a1]")
                .append(";[a0][a1]amix=inputs=2:duration=first[aout]");
        }

        // ════════════════════════════════════════════════════════════
        // STEP 4: Output args
        // ════════════════════════════════════════════════════════════
        args.add("-filter_complex"); args.add(filter.toString());
        args.add("-map"); args.add("[" + lastV + "]");
        if (hasVoiceover) {
            args.add("-map"); args.add("[aout]");
        } else {
            args.add("-map"); args.add("0:a?");
        }

        args.add("-c:v"); args.add("libx264");
        args.add("-preset"); args.add("fast");
        args.add("-crf"); args.add("23");
        args.add("-c:a"); args.add("aac");
        args.add("-b:a"); args.add("192k");
        args.add("-movflags"); args.add("+faststart");
        args.add("-shortest");

        args.add(normalizePath(output));
        return args;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // VIDEO SOURCE
    // ─────────────────────────────────────────────────────────────────────────

    private Path resolveSourceVideo(Project project, Path projectDir) throws Exception {
        if (project.getVideoPath() != null && !project.getVideoPath().isBlank()) {
            Path p = Paths.get(project.getVideoPath());
            if (Files.exists(p)) return p;
            log.warn("videoPath set but file missing: {}", p);
        }

        for (String ext : new String[]{"mp4", "mkv", "webm", "mov", "avi"}) {
            Path candidate = projectDir.resolve("source." + ext);
            if (Files.exists(candidate) && Files.size(candidate) > 1024) {
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
            projectService.updateVideoPath(projectId, outputFile.toAbsolutePath().toString());
            return outputFile;
        }

        List<String> command = List.of(
                ytDlpPath.replace("/", "\\"),
                "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--force-overwrites",
                "-o", normalizePath(outputFile),
                youtubeUrl
        );

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder log_ = new StringBuilder();
        try (BufferedReader r =
                     new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = r.readLine()) != null) {
                log.info("yt-dlp: {}", line);
                log_.append(line).append("\n");
            }
        }

        int exit = process.waitFor();
        if (exit != 0 || !Files.exists(outputFile)) {
            throw new RuntimeException("yt-dlp failed (exit " + exit + "):\n" + log_);
        }

        projectService.updateVideoPath(projectId, normalizePath(outputFile));
        log.info("✅ Downloaded YouTube video: {} ({}MB)",
                outputFile, Files.size(outputFile) / 1024 / 1024);
        return outputFile;
    }

    @Async("taskExecutor")
    public void downloadYoutubeAsync(String projectId, String youtubeUrl) {
        log.info("Background YouTube download started for project: {}", projectId);
        try {
            Path projectDir = storageService.getProjectDir(projectId);
            Files.createDirectories(projectDir);

            Path outputFile = projectDir.resolve("source.mp4");

            // Skip if already downloaded
            if (Files.exists(outputFile) && Files.size(outputFile) > 1024) {
                log.info("YouTube video already exists, skipping download: {}", outputFile);
                projectService.updateVideoPath(projectId, outputFile.toAbsolutePath().toString());
                return;
            }

            List<String> command = List.of(
                ytDlpPath.replace("/", "\\"),
                "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--force-overwrites",
                "-o", outputFile.toAbsolutePath().toString(),
                youtubeUrl
            );

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    log.info("yt-dlp: {}", line);
                }
            }

            int exit = process.waitFor();

            if (exit == 0 && Files.exists(outputFile) && Files.size(outputFile) > 1024) {
                // Save videoPath so preview works immediately
                projectService.updateVideoPath(
                    projectId, 
                    outputFile.toAbsolutePath().toString()
                );
                log.info("YouTube video downloaded and videoPath updated for: {}", projectId);
            } else {
                log.error("yt-dlp failed for project: {}", projectId);
            }

        } catch (Exception e) {
            log.error("YouTube download failed for {}: {}", projectId, e.getMessage(), e);
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // SCRIPT / TEXT UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    private String cleanScript(String script) {
        if (script == null) return "";

        return script
                // Remove markdown headers like **[Hook]**, **Setup:**, [Cliffhanger]
                .replaceAll("\\*{1,3}\\[[^\\]]+\\]\\*{1,3}", "")
                .replaceAll("\\*{1,3}[A-Za-z][^*\\n:]{0,30}:\\*{1,3}", "")
                .replaceAll("\\[[A-Za-z][^\\]]{0,40}\\]", "")
                // Remove markdown bold/italic markers
                .replaceAll("\\*{1,3}", "")
                .replaceAll("_{2,3}", "")
                // Remove emojis (broad Unicode emoji ranges)
                .replaceAll("[\\p{So}\\p{Cn}]", "")
                .replaceAll("[\\x{1F300}-\\x{1F9FF}]", "")
                .replaceAll("[\\x{2600}-\\x{27BF}]", "")
                .replaceAll("[\\x{1F000}-\\x{1F02F}]", "")
                .replaceAll("[\\x{1F0A0}-\\x{1F0FF}]", "")
                .replaceAll("[\\x{1F100}-\\x{1F1FF}]", "")
                .replaceAll("[\\x{1F200}-\\x{1F2FF}]", "")
                // Remove standalone dots/dashes on their own line
                .replaceAll("(?m)^\\s*[\\.\\-_=]+\\s*$", "")
                // Remove "..." (ellipsis used for dramatic pauses)
                .replaceAll("\\.{3,}", " ")
                .replaceAll("…", " ")
                // Collapse multiple spaces/newlines
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n{2,}", "\n")
                .replaceAll("(?m)^\\s+|\\s+$", "")
                .trim();
    }

    private String[] splitSentences(String cleaned) {
        return Arrays.stream(cleaned.split("(?<=[.!?။])\\s*"))
                .map(String::trim)
                .filter(s -> s.length() > 1)
                .toArray(String[]::new);
    }

    private void appendSrtEntry(StringBuilder srt, int index,
                                double start, double end, String text) {
        if (start < 0) start = 0;
        if (end <= start) end = start + 0.5;
        srt.append(index).append("\n")
           .append(formatSrtTime(start)).append(" --> ").append(formatSrtTime(end)).append("\n")
           .append(text.trim()).append("\n\n");
    }

    private void writeSrtWithBom(Path path, String content) throws IOException {
        byte[] bom     = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] body    = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] full    = new byte[bom.length + body.length];
        System.arraycopy(bom, 0, full, 0, bom.length);
        System.arraycopy(body, 0, full, bom.length, body.length);
        Files.write(path, full);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MEDIA UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    private double getMediaDuration(Path mediaPath) {
        try {
            List<String> command = List.of(
                    ffprobePath.replace("/", "\\"),
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    normalizePath(mediaPath)
            );

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process p = pb.start();

            String result;
            try (BufferedReader r =
                         new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                result = r.readLine();
                p.waitFor();
            }

            if (result != null && !result.isBlank()) {
                return Double.parseDouble(result.trim());
            }
        } catch (Exception e) {
            log.warn("ffprobe failed for {} : {}", mediaPath, e.getMessage());
        }
        return 0.0;
    }

    private String normalizePath(Path path) {
        try {
            return path.toRealPath().toString();
        } catch (Exception e) {
            return path.normalize().toAbsolutePath().toString();
        }
    }

    private String extractFFmpegError(String output) {
        if (output == null || output.isBlank()) return "No output captured";
        StringBuilder errors = new StringBuilder();
        for (String line : output.split("\n")) {
            String lower = line.toLowerCase();
            if (lower.contains("error") || lower.contains("invalid")
                    || lower.contains("no such file") || lower.contains("failed")
                    || lower.contains("cannot open") || lower.contains("not found")) {
                errors.append(line.trim()).append(" | ");
            }
        }
        if (errors.length() > 0) {
            String r = errors.toString();
            return r.length() > 800 ? r.substring(0, 800) + "..." : r;
        }
        String[] lines = output.split("\n");
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

    private String formatSrtTime(double seconds) {
        if (seconds < 0) seconds = 0;
        int h  = (int) (seconds / 3600);
        int m  = (int) ((seconds % 3600) / 60);
        int s  = (int) (seconds % 60);
        int ms = (int) Math.round((seconds - Math.floor(seconds)) * 1000);
        if (ms >= 1000) { ms = 0; s++; }
        return String.format("%02d:%02d:%02d,%03d", h, m, s, ms);
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

    private String buildLogoPosition(ExportSettings settings) {
        int margin = 20;

        // PRIORITY 1: Use exact X/Y coordinates if provided
        if (settings.getLogoX() != null && settings.getLogoY() != null) {
            double x = Math.max(0.0, Math.min(1.0, settings.getLogoX()));
            double y = Math.max(0.0, Math.min(1.0, settings.getLogoY()));
            
            log.info("Using custom logo position: x={}, y={}", x, y);
            
            // FFmpeg formula:
            //   (main_w - overlay_w) * x → horizontal position (logo top-left)
            //   (main_h - overlay_h) * y → vertical position
            // Result: x=0 logo at left edge, x=1 at right edge, x=0.5 centered
            return String.format(Locale.US,
                    "(main_w-overlay_w)*%.4f:(main_h-overlay_h)*%.4f",
                    x, y);
        }

        // PRIORITY 2: Fall back to preset position names
        String position = settings.getLogoPosition();
        if (position == null) position = "bottom-right";
        
        return switch (position) {
            case "top-left"      -> margin + ":" + margin;
            case "top-center"    -> "(main_w-overlay_w)/2:" + margin;
            case "top-right"     -> "main_w-overlay_w-" + margin + ":" + margin;
            case "center-left"   -> margin + ":(main_h-overlay_h)/2";
            case "center"        -> "(main_w-overlay_w)/2:(main_h-overlay_h)/2";
            case "center-right"  -> "main_w-overlay_w-" + margin + ":(main_h-overlay_h)/2";
            case "bottom-left"   -> margin + ":main_h-overlay_h-" + margin;
            case "bottom-center" -> "(main_w-overlay_w)/2:main_h-overlay_h-" + margin;
            default              -> "main_w-overlay_w-" + margin + ":main_h-overlay_h-" + margin;
        };
    }

    /**
     * Convert "#RRGGBB" or "#AARRGGBB" → libass "&HAABBGGRR" format.
     * libass uses BGR order (not RGB) and inverted alpha (0=opaque).
     */
    private String hexToAss(String hex, String fallback) {
        if (hex == null || hex.isBlank()) return fallback;
        try {
            hex = hex.replace("#", "").trim();
            int a, r, g, b;
            if (hex.length() == 6) {
                a = 0;  // opaque
                r = Integer.parseInt(hex.substring(0, 2), 16);
                g = Integer.parseInt(hex.substring(2, 4), 16);
                b = Integer.parseInt(hex.substring(4, 6), 16);
            } else if (hex.length() == 8) {
                int alphaIn = Integer.parseInt(hex.substring(0, 2), 16);
                a = 255 - alphaIn;
                r = Integer.parseInt(hex.substring(2, 4), 16);
                g = Integer.parseInt(hex.substring(4, 6), 16);
                b = Integer.parseInt(hex.substring(6, 8), 16);
            } else {
                return fallback;
            }
            return String.format("&H%02X%02X%02X%02X", a, b, g, r);
        } catch (Exception e) {
            log.warn("Invalid hex color '{}', using fallback", hex);
            return fallback;
        }
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
                        .aspectRatio(job.getAspectRatio())
                .logoPath(job.getLogoPath())
                .logoPosition(job.getLogoPosition())
                .logoX(job.getLogoX())
                .logoY(job.getLogoY())
                .logoSize(job.getLogoSize())
                .logoOpacity(job.getLogoOpacity())
                .subtitleEnabled(job.getSubtitleEnabled())
                .subtitleFont(job.getSubtitleFont())
                .subtitleSize(job.getSubtitleSize())
                .audioMix(job.getAudioMix())
                .subtitleLanguage(job.getSubtitleLanguage())
                .subtitleX(job.getSubtitleX())
                .subtitleY(job.getSubtitleY())
                .subtitleWidth(job.getSubtitleWidth())
                .subtitleFontColor(job.getSubtitleFontColor())
                .subtitleBgColor(job.getSubtitleBgColor())
                .subtitleBorderStyle(job.getSubtitleBorderStyle())
                .subtitleOutlineColor(job.getSubtitleOutlineColor())
                .subtitleOutlineWidth(job.getSubtitleOutlineWidth())
                .build();
    }
}