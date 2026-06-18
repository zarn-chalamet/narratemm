package com.narratemm.repository;

import com.narratemm.entity.Script;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ScriptRepository extends JpaRepository<Script, String> {
    Optional<Script> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
