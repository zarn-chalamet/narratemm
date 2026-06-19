package com.narratemm.controller;

import com.narratemm.dto.VoiceDTOs.*;
import com.narratemm.service.VoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpHeaders;

@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping("/generate/{projectId}")
    public ResponseEntity<VoiceResponse> generate(
            @PathVariable String projectId,
            @Valid @RequestBody GenerateRequest request) {
        return ResponseEntity.ok(voiceService.generate(projectId, request));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<VoiceResponse> get(@PathVariable String projectId) {
        return ResponseEntity.ok(voiceService.get(projectId));
    }

    @GetMapping("/audio/{projectId}")
    public ResponseEntity<Resource> getAudio(@PathVariable String projectId) {
        Resource resource = voiceService.getAudioResource(projectId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/mpeg"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(resource);
    }
}
