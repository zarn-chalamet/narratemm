package com.narratemm.repository;

import com.narratemm.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Project> findByIdAndUserId(String id, String userId);
}
