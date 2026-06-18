package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "transcripts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transcript {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String rawText;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String srtContent;

    private String language;

    @Enumerated(EnumType.STRING)
    private TranscriptSource source;

    private Integer durationSeconds;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum TranscriptSource {
        GROQ, SUPADATA
    }
}
