package com.narratemm.repository;

import com.narratemm.entity.VoiceOver;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VoiceOverRepository extends JpaRepository<VoiceOver, String> {
    Optional<VoiceOver> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
