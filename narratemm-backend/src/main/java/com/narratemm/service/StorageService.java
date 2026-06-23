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
            Path dir = Paths.get(basePath, "projects", projectId).toAbsolutePath();
            Files.createDirectories(dir);

            String extension = getExtension(file.getOriginalFilename());
            Path filePath = dir.resolve("source." + extension);
            
            Files.copy(
                file.getInputStream(),
                filePath,
                StandardCopyOption.REPLACE_EXISTING
            );

            return filePath.toString();
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to save video file: " + e.getMessage(), e);
        }
    }

    public String saveLogoFile(String projectId, MultipartFile file) {
        try {
            Path dir = Paths.get(basePath, "projects", projectId).toAbsolutePath();
            Files.createDirectories(dir);

            Path filePath = dir.resolve("logo.png");
            
            System.out.println(" Saving logo to: " + filePath);
            System.out.println(" Directory exists? " + Files.exists(dir));
            System.out.println(" Directory writable? " + Files.isWritable(dir));

            //  Use Files.copy instead of transferTo (more reliable)
            Files.copy(
                file.getInputStream(),
                filePath,
                StandardCopyOption.REPLACE_EXISTING
            );

            System.out.println(" Logo saved successfully: " + filePath);
            return filePath.toString();
        } catch (IOException e) {
            //  Log the REAL error
            System.err.println(" FAILED TO SAVE LOGO:");
            e.printStackTrace();
            throw new RuntimeException("Failed to save logo file: " + e.getMessage(), e);
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
        return Paths.get(basePath, "projects", projectId).toAbsolutePath();
    }

    public Path getLogoPath(String projectId) {
        return Paths.get(basePath, "projects", projectId).toAbsolutePath().resolve("logo.png");
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
