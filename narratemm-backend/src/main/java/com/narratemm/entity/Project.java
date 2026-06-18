package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.DRAFT;

    private String thumbnail;
    private String videoPath;
    private String youtubeUrl;

    @Column(nullable = false)
    @Builder.Default
    private String aspectRatio = "9:16";

    private Integer durationSeconds;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum ProjectStatus {
        DRAFT, TRANSCRIBING, SCRIPTING, VOICEOVER,
        EDITING, EXPORTING, DONE, FAILED
    }
}
