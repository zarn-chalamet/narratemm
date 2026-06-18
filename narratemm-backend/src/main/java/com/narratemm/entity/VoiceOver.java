package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "voiceovers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceOver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    private String audioPath;

    @Enumerated(EnumType.STRING)
    private VoiceName voiceName;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String stylePrompt;

    @Builder.Default
    private Double speed = 1.0;

    private Integer durationSeconds;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum VoiceName {
        Aoede, Puck, Charon, Kore
    }
}
