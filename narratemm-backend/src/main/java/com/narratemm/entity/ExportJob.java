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
    @Builder.Default
    private Boolean subtitleEnabled = true;
    private String subtitleFont;
    private Integer subtitleSize;
    @Column(name = "subtitle_language")
    private String subtitleLanguage;
    @Builder.Default
    private Integer audioMix = 70;

    @CreationTimestamp
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    public enum ExportStatus {
        QUEUED, PROCESSING, DONE, FAILED
    }
}
