package com.narratemm.service;

import com.narratemm.dto.ExportDTOs.ExportSettings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.font.FontRenderContext;
import java.awt.font.LineBreakMeasurer;
import java.awt.font.TextAttribute;
import java.awt.font.TextLayout;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.text.AttributedString;
import java.util.*;
import java.util.List;
import java.util.regex.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubtitleRendererService {

    @Value("${app.tools.fonts-dir:}")
    private String fontsDir;

    /**
     * Render all subtitles from SRT file to PNG frames.
     */
    public List<SubtitleFrame> renderSubtitlesToPng(
            Path srtPath, Path outputDir,
            ExportSettings settings, int videoW, int videoH) throws Exception {

        Files.createDirectories(outputDir);

        // Clean old PNGs
        try (var stream = Files.list(outputDir)) {
            stream.filter(p -> p.toString().endsWith(".png"))
                  .forEach(p -> { 
                      try { Files.deleteIfExists(p); } catch (Exception ignored) {} 
                  });
        }

        // Parse SRT
        String srtContent = Files.readString(srtPath, StandardCharsets.UTF_8);
        List<SrtEntry> entries = parseSrt(srtContent);
        log.info("Rendering {} subtitle entries to PNG", entries.size());

        // Load font
        Font font = loadFont(settings);
        log.info("Loaded font: {} (size: {})", font.getFontName(), font.getSize());

        List<SubtitleFrame> frames = new ArrayList<>();

        for (int i = 0; i < entries.size(); i++) {
            SrtEntry entry = entries.get(i);
            Path pngPath = outputDir.resolve(String.format("sub_%05d.png", i));

            renderSubtitleFrame(entry.text, pngPath, font, settings, videoW, videoH);
            frames.add(new SubtitleFrame(pngPath, entry.start, entry.end));

            if (i % 10 == 0) {
                log.info("Rendered {}/{} subtitles", i + 1, entries.size());
            }
        }

        log.info("✅ All {} subtitle PNGs rendered", frames.size());
        return frames;
    }

    // ─────────────────────────────────────────────────────────────
    // FONT LOADING
    // ─────────────────────────────────────────────────────────────

    private Font loadFont(ExportSettings settings) throws Exception {
        String fontName = settings.getSubtitleFont() != null
                ? settings.getSubtitleFont() : "Padauk";
        int fontSize = settings.getSubtitleSize() != null
                ? settings.getSubtitleSize() : 24;

        Map<String, String> fontMap = Map.of(
                "Padauk", "Padauk-Regular.ttf",
                "Pyidaungsu", "Pyidaungsu-Regular.ttf",
                "Noto Serif Myanmar", "NotoSerifMyanmar-Regular.ttf",
                "Myanmar3", "Myanmar3.ttf"
        );

        String fileName = fontMap.getOrDefault(fontName, "Padauk-Regular.ttf");
        Path fontFile = Paths.get(fontsDir, fileName);

        // Fallback chain
        if (!Files.exists(fontFile)) {
            for (String fb : List.of("Padauk-Regular.ttf", "Pyidaungsu-Regular.ttf",
                                      "NotoSerifMyanmar-Regular.ttf", "Padauk.ttf",
                                      "Pyidaungsu.ttf")) {
                Path test = Paths.get(fontsDir, fb);
                if (Files.exists(test)) {
                    fontFile = test;
                    log.warn("Font '{}' not found, using fallback: {}", fileName, fb);
                    break;
                }
            }
        }

        if (!Files.exists(fontFile)) {
            throw new RuntimeException(
                    "No Burmese font found in " + fontsDir +
                    ". Download Padauk from: https://software.sil.org/padauk/"
            );
        }

        Font baseFont = Font.createFont(Font.TRUETYPE_FONT, fontFile.toFile());
        return baseFont.deriveFont(Font.PLAIN, (float) fontSize);
    }

    // ─────────────────────────────────────────────────────────────
    // RENDER ONE SUBTITLE FRAME
    // ─────────────────────────────────────────────────────────────

    private void renderSubtitleFrame(String text, Path outputPath, Font font,
                                      ExportSettings settings, int videoW, int videoH)
            throws IOException {

        int widthPercent = settings.getSubtitleWidth() != null
                ? settings.getSubtitleWidth() : 80;
        int boxWidth = videoW * widthPercent / 100;
        int padX = 24;
        int padY = 12;

        String borderStyle = settings.getSubtitleBorderStyle() != null
                ? settings.getSubtitleBorderStyle().toLowerCase() : "outline";

        Color fontColor = parseColor(settings.getSubtitleFontColor(), Color.WHITE);
        Color bgColor = parseColorWithAlpha(settings.getSubtitleBgColor(), 
                                            new Color(0, 0, 0, 180));
        Color outlineColor = parseColor(settings.getSubtitleOutlineColor(), Color.BLACK);
        int outlineWidth = settings.getSubtitleOutlineWidth() != null
                ? settings.getSubtitleOutlineWidth() : 2;

        // Create transparent canvas
        BufferedImage canvas = new BufferedImage(videoW, videoH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = canvas.createGraphics();

        // Quality settings (critical for Burmese)
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS,
                RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,
                RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL,
                RenderingHints.VALUE_STROKE_PURE);

        g.setFont(font);

        // Wrap text into lines
        FontRenderContext frc = g.getFontRenderContext();
        int maxTextWidth = boxWidth - (padX * 2);
        List<TextLayout> lines = wrapText(text, font, frc, maxTextWidth);

        // Calculate total text height
        float lineHeight = 0;
        for (TextLayout tl : lines) {
            lineHeight += tl.getAscent() + tl.getDescent() + tl.getLeading();
        }
        int textHeight = (int) Math.ceil(lineHeight);

        // Calculate box dimensions
        int actualBoxW = boxWidth;
        int actualBoxH = textHeight + (padY * 2);

        // Position
        double subX = settings.getSubtitleX() != null ? settings.getSubtitleX() : 0.5;
        double subY = settings.getSubtitleY() != null ? settings.getSubtitleY() : 0.85;

        int boxX = (int) (videoW * subX - actualBoxW / 2.0);
        int boxY = (int) (videoH * subY - actualBoxH / 2.0);

        // Clamp to video bounds
        boxX = Math.max(0, Math.min(videoW - actualBoxW, boxX));
        boxY = Math.max(0, Math.min(videoH - actualBoxH, boxY));

        // Draw background box
        if ("box".equals(borderStyle)) {
            g.setColor(bgColor);
            g.fillRoundRect(boxX, boxY, actualBoxW, actualBoxH, 12, 12);
        }

        // Draw text lines
        float y = boxY + padY;
        for (TextLayout tl : lines) {
            y += tl.getAscent();

            float textW = (float) tl.getBounds().getWidth();
            float x = boxX + (actualBoxW - textW) / 2;

            // Outline/shadow effects
            switch (borderStyle) {
                case "outline":
                    drawTextOutline(g, tl, x, y, outlineColor, outlineWidth);
                    break;
                case "shadow":
                    drawTextShadow(g, tl, x, y);
                    break;
                default:
                    break;
            }

            // Main text
            g.setColor(fontColor);
            tl.draw(g, x, y);

            y += tl.getDescent() + tl.getLeading();
        }

        g.dispose();
        ImageIO.write(canvas, "PNG", outputPath.toFile());
    }

    // ─────────────────────────────────────────────────────────────
    // TEXT WRAPPING
    // ─────────────────────────────────────────────────────────────

    private List<TextLayout> wrapText(String text, Font font,
                                       FontRenderContext frc, int maxWidth) {
        List<TextLayout> result = new ArrayList<>();

        for (String line : text.split("\n")) {
            line = line.trim();
            if (line.isEmpty()) continue;

            AttributedString attrStr = new AttributedString(line);
            attrStr.addAttribute(TextAttribute.FONT, font);

            LineBreakMeasurer measurer = new LineBreakMeasurer(
                    attrStr.getIterator(), frc);

            while (measurer.getPosition() < line.length()) {
                TextLayout layout = measurer.nextLayout(maxWidth);
                if (layout != null) result.add(layout);
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // TEXT EFFECTS
    // ─────────────────────────────────────────────────────────────

    private void drawTextOutline(Graphics2D g, TextLayout tl, float x, float y,
                                  Color outlineColor, int width) {
        g.setColor(outlineColor);
        for (int dx = -width; dx <= width; dx++) {
            for (int dy = -width; dy <= width; dy++) {
                if (dx == 0 && dy == 0) continue;
                tl.draw(g, x + dx, y + dy);
            }
        }
    }

    private void drawTextShadow(Graphics2D g, TextLayout tl, float x, float y) {
        g.setColor(new Color(0, 0, 0, 200));
        tl.draw(g, x + 3, y + 3);
    }

    // ─────────────────────────────────────────────────────────────
    // COLOR PARSING
    // ─────────────────────────────────────────────────────────────

    private Color parseColor(String hex, Color fallback) {
        if (hex == null || hex.isBlank()) return fallback;
        try {
            hex = hex.replace("#", "").trim();
            if (hex.length() == 6) {
                return new Color(
                        Integer.parseInt(hex.substring(0, 2), 16),
                        Integer.parseInt(hex.substring(2, 4), 16),
                        Integer.parseInt(hex.substring(4, 6), 16)
                );
            } else if (hex.length() == 8) {
                return new Color(
                        Integer.parseInt(hex.substring(2, 4), 16),
                        Integer.parseInt(hex.substring(4, 6), 16),
                        Integer.parseInt(hex.substring(6, 8), 16),
                        Integer.parseInt(hex.substring(0, 2), 16)
                );
            }
        } catch (Exception e) {
            log.warn("Invalid color '{}', using fallback", hex);
        }
        return fallback;
    }

    private Color parseColorWithAlpha(String hex, Color fallback) {
        if (hex == null || hex.isBlank()) return fallback;
        try {
            hex = hex.replace("#", "").trim();
            
            if (hex.length() == 8) {
                // Format: AARRGGBB (alpha first)
                int a = Integer.parseInt(hex.substring(0, 2), 16);
                int r = Integer.parseInt(hex.substring(2, 4), 16);
                int g = Integer.parseInt(hex.substring(4, 6), 16);
                int b = Integer.parseInt(hex.substring(6, 8), 16);
                log.debug("Parsed BG color: A={} R={} G={} B={}", a, r, g, b);
                return new Color(r, g, b, a);
            } else if (hex.length() == 6) {
                // Format: RRGGBB (no alpha, default to 80% opaque)
                int r = Integer.parseInt(hex.substring(0, 2), 16);
                int g = Integer.parseInt(hex.substring(2, 4), 16);
                int b = Integer.parseInt(hex.substring(4, 6), 16);
                return new Color(r, g, b, 204);  // 204 = 80% opacity
            }
        } catch (Exception e) {
            log.warn("Invalid bg color '{}', using fallback: {}", hex, e.getMessage());
        }
        return fallback;
    }

    // ─────────────────────────────────────────────────────────────
    // SRT PARSING
    // ─────────────────────────────────────────────────────────────

    private List<SrtEntry> parseSrt(String content) {
        List<SrtEntry> entries = new ArrayList<>();
        if (content.startsWith("\uFEFF")) {
            content = content.substring(1);
        }

        String[] blocks = content.replace("\r", "").split("\n\n+");
        Pattern timePattern = Pattern.compile(
                "(\\d{2}):(\\d{2}):(\\d{2})[,.](\\d{3})\\s*-->\\s*" +
                "(\\d{2}):(\\d{2}):(\\d{2})[,.](\\d{3})"
        );

        for (String block : blocks) {
            String[] lines = block.trim().split("\n");
            if (lines.length < 3) continue;

            Matcher m = timePattern.matcher(lines[1]);
            if (!m.find()) continue;

            double start = toSeconds(m.group(1), m.group(2), m.group(3), m.group(4));
            double end = toSeconds(m.group(5), m.group(6), m.group(7), m.group(8));

            StringBuilder text = new StringBuilder();
            for (int i = 2; i < lines.length; i++) {
                if (i > 2) text.append("\n");
                text.append(lines[i].trim());
            }

            entries.add(new SrtEntry(start, end, text.toString()));
        }

        return entries;
    }

    private double toSeconds(String h, String m, String s, String ms) {
        return Integer.parseInt(h) * 3600
                + Integer.parseInt(m) * 60
                + Integer.parseInt(s)
                + Integer.parseInt(ms) / 1000.0;
    }

    // ─────────────────────────────────────────────────────────────
    // DATA CLASSES
    // ─────────────────────────────────────────────────────────────

    public record SubtitleFrame(Path pngPath, double startSec, double endSec) {}
    private record SrtEntry(double start, double end, String text) {}
}