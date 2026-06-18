package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "scripts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Script {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private ScriptStyle style;

    @Enumerated(EnumType.STRING)
    private ScriptLanguage language;

    @Builder.Default
    private String geminiModel = "gemini-2.5-flash";

    @OneToMany(mappedBy = "script", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ScriptSegment> segments = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum ScriptStyle {
        DRAMATIC, CASUAL, SPOILER, HYPE
    }

    public enum ScriptLanguage {
        MYANMAR, ENGLISH, BOTH
    }
}
