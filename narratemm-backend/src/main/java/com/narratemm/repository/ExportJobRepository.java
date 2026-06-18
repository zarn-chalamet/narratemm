package com.narratemm.repository;

import com.narratemm.entity.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExportJobRepository extends JpaRepository<ExportJob, String> {
    List<ExportJob> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
