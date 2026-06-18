package com.narratemm.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;

@Service
public class StorageService {

    @Value("${app.storage.base-path}")
    private String basePath;

    public void createProjectDirectory(String projectId) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId);
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create project directory", e);
        }
    }

    public String saveVideoFile(String projectId, MultipartFile file) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId);
            Files.createDirectories(dir);

            String extension = getExtension(file.getOriginalFilename());
            Path filePath = dir.resolve("source." + extension);
            file.transferTo(filePath.toFile());

            return filePath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to save video file", e);
        }
    }

    public String saveLogoFile(String projectId, MultipartFile file) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId);
            Files.createDirectories(dir);

            Path filePath = dir.resolve("logo.png");
            file.transferTo(filePath.toFile());

            return filePath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to save logo file", e);
        }
    }

    public String saveAudioFile(String projectId, byte[] audioData, String extension) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId);
            Files.createDirectories(dir);

            Path filePath = dir.resolve("voiceover." + extension);
            Files.write(filePath, audioData);

            return filePath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to save audio file", e);
        }
    }

    public Path getFilePath(String relativePath) {
        return Paths.get(relativePath);
    }

    public Path getProjectDir(String projectId) {
        return Paths.get(basePath, "projects", projectId);
    }

    public void deleteProjectDirectory(String projectId) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId);
            if (Files.exists(dir)) {
                Files.walk(dir)
                        .sorted((a, b) -> b.compareTo(a))
                        .forEach(path -> {
                            try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                        });
            }
        } catch (IOException e) {
            // Log error but don't throw
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return "mp4";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot + 1).toLowerCase() : "mp4";
    }
}
