package com.narratemm.controller;

import com.narratemm.dto.ScriptDTOs.*;
import com.narratemm.service.ScriptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/script")
@RequiredArgsConstructor
public class ScriptController {

    private final ScriptService scriptService;

    @PostMapping("/generate/{projectId}")
    public ResponseEntity<ScriptResponse> generate(
            @PathVariable String projectId,
            @Valid @RequestBody GenerateRequest request) {
        return ResponseEntity.ok(scriptService.generate(projectId, request));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ScriptResponse> get(@PathVariable String projectId) {
        return ResponseEntity.ok(scriptService.get(projectId));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ScriptResponse> update(
            @PathVariable String projectId,
            @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(scriptService.update(projectId, request));
    }

    @PutMapping("/segment/{segmentId}")
    public ResponseEntity<SegmentDTO> updateSegment(
            @PathVariable String segmentId,
            @RequestBody UpdateSegmentRequest request) {
        return ResponseEntity.ok(scriptService.updateSegment(segmentId, request.getText()));
    }
}
