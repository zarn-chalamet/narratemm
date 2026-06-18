package com.narratemm.repository;

import com.narratemm.entity.Transcript;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TranscriptRepository extends JpaRepository<Transcript, String> {
    Optional<Transcript> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
