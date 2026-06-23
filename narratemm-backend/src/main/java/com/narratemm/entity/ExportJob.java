package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "exports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ExportStatus status = ExportStatus.QUEUED;

    @Builder.Default
    private Integer progress = 0;

    private String outputPath;
    
    @Column(length = 2000)
    private String errorMessage;

    // Export settings
    private String aspectRatio;
    private String logoPath;
    private String logoPosition;
    private Integer logoSize;
    private Integer logoOpacity;

    @Column(name = "logo_x")
    private Double logoX;

    @Column(name = "logo_y")
    private Double logoY;

    @Builder.Default
    private Boolean subtitleEnabled = true;
    private String subtitleFont;
    private Integer subtitleSize;
    @Column(name = "subtitle_language")
    private String subtitleLanguage;
    @Builder.Default
    private Integer audioMix = 70;

    //Subtitle styling
    @Column(name = "subtitle_x")
    private Double subtitleX;          // 0.0–1.0 (center horizontal)

    @Column(name = "subtitle_y")
    private Double subtitleY;          // 0.0–1.0 (center vertical)

    @Column(name = "subtitle_width")
    private Integer subtitleWidth;     // 30-100 (% of video width)

    @Column(name = "subtitle_font_color", length = 9)
    private String subtitleFontColor;  // "#FFFFFF"

    @Column(name = "subtitle_bg_color", length = 9)
    private String subtitleBgColor;    // "#80000000"

    @Column(name = "subtitle_border_style", length = 20)
    private String subtitleBorderStyle; // "outline" | "box" | "shadow" | "none"

    @Column(name = "subtitle_outline_color", length = 9)
    private String subtitleOutlineColor; // "#000000"

    @Column(name = "subtitle_outline_width")
    private Integer subtitleOutlineWidth;

    @CreationTimestamp
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    public enum ExportStatus {
        QUEUED, PROCESSING, DONE, FAILED
    }
}
