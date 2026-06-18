package com.narratemm.service;

import com.narratemm.dto.ScriptDTOs.*;
import com.narratemm.entity.Project;
import com.narratemm.entity.Script;
import com.narratemm.entity.ScriptSegment;
import com.narratemm.entity.Transcript;
import com.narratemm.repository.ScriptRepository;
import com.narratemm.repository.ScriptSegmentRepository;
import com.narratemm.repository.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScriptService {

    private final ScriptRepository scriptRepository;
    private final ScriptSegmentRepository segmentRepository;
    private final TranscriptRepository transcriptRepository;
    private final ProjectService projectService;
    private final GeminiService geminiService;

    public ScriptResponse generate(String projectId, GenerateRequest request) {
        Project project = projectService.getProjectEntity(projectId);
        projectService.updateStatus(projectId, Project.ProjectStatus.SCRIPTING);

        Transcript transcript = transcriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Transcript not found. Please transcribe first."));

        try {
            String generatedContent = geminiService.generateScript(
                    transcript.getRawText(),
                    request.getStyle(),
                    request.getLanguage()
            );

            // Delete old script if exists
            scriptRepository.findByProjectId(projectId).ifPresent(scriptRepository::delete);

            Script script = Script.builder()
                    .project(project)
                    .content(generatedContent)
                    .style(Script.ScriptStyle.valueOf(request.getStyle().toUpperCase()))
                    .language(Script.ScriptLanguage.valueOf(request.getLanguage().toUpperCase()))
                    .build();

            script = scriptRepository.save(script);
            projectService.updateStatus(projectId, Project.ProjectStatus.DRAFT);

            return toResponse(script);
        } catch (Exception e) {
            projectService.updateStatus(projectId, Project.ProjectStatus.FAILED);
            throw new RuntimeException("Script generation failed: " + e.getMessage());
        }
    }

    public ScriptResponse get(String projectId) {
        Script script = scriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Script not found"));
        return toResponse(script);
    }

    public ScriptResponse update(String projectId, UpdateRequest request) {
        Script script = scriptRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Script not found"));

        if (request.getContent() != null) script.setContent(request.getContent());

        script = scriptRepository.save(script);
        return toResponse(script);
    }

    public SegmentDTO updateSegment(String segmentId, String text) {
        ScriptSegment segment = segmentRepository.findById(segmentId)
                .orElseThrow(() -> new RuntimeException("Segment not found"));
        segment.setText(text);
        segment = segmentRepository.save(segment);
        return toSegmentDTO(segment);
    }

    private ScriptResponse toResponse(Script s) {
        List<SegmentDTO> segments = s.getSegments() != null
                ? s.getSegments().stream().map(this::toSegmentDTO).collect(Collectors.toList())
                : Collections.emptyList();

        return ScriptResponse.builder()
                .id(s.getId())
                .projectId(s.getProject().getId())
                .content(s.getContent())
                .style(s.getStyle().name().toLowerCase())
                .language(s.getLanguage().name().toLowerCase())
                .segments(segments)
                .geminiModel(s.getGeminiModel())
                .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
                .updatedAt(s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null)
                .build();
    }

    private SegmentDTO toSegmentDTO(ScriptSegment seg) {
        return SegmentDTO.builder()
                .id(seg.getId())
                .startTime(seg.getStartTime())
                .endTime(seg.getEndTime())
                .text(seg.getText())
                .build();
    }
}
