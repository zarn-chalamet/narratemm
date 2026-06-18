package com.narratemm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "script_segments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScriptSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "script_id", nullable = false)
    private Script script;

    private Double startTime;
    private Double endTime;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String text;
}
