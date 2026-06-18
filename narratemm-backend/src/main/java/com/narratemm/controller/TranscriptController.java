package com.narratemm.controller;

import com.narratemm.dto.TranscriptDTOs.*;
import com.narratemm.service.TranscriptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transcript")
@RequiredArgsConstructor
public class TranscriptController {

    private final TranscriptService transcriptService;

    @PostMapping("/transcribe/{projectId}")
    public ResponseEntity<TranscribeResponse> transcribe(@PathVariable String projectId) {
        return ResponseEntity.ok(transcriptService.transcribe(projectId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<TranscriptResponse> get(@PathVariable String projectId) {
        return ResponseEntity.ok(transcriptService.get(projectId));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<TranscriptResponse> update(
            @PathVariable String projectId,
            @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(transcriptService.update(projectId, request));
    }
}
