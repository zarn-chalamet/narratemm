package com.narratemm.repository;

import com.narratemm.entity.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExportJobRepository extends JpaRepository<ExportJob, String> {
    List<ExportJob> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);

     Optional<ExportJob> findTopByProjectIdOrderByStartedAtDesc(String projectId);
}
