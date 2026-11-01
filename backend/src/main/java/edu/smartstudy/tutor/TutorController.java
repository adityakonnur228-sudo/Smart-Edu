package edu.smartstudy.tutor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smartstudy.material.Material;
import edu.smartstudy.material.MaterialRepository;
import edu.smartstudy.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/tutor")
public class TutorController {
    private final TutorConversationRepository conversations;
    private final TutorMessageRepository messages;
    private final MaterialRepository materials;
    private final UserRepository users;
    private final RestClient ml;
    private final ObjectMapper json;
    private final String defaultOpenRouterApiKey;

    public TutorController(TutorConversationRepository conversations,
                           TutorMessageRepository messages,
                           MaterialRepository materials,
                           UserRepository users,
                           @Value("${app.ml-url}") String mlUrl,
                           @Value("${app.ml-internal-token:dev-internal-token-change-me}") String mlInternalToken,
                           @Value("${app.openrouter-api-key:}") String defaultOpenRouterApiKey,
                           ObjectMapper json) {
        this.conversations = conversations;
        this.messages = messages;
        this.materials = materials;
        this.users = users;
        this.defaultOpenRouterApiKey = defaultOpenRouterApiKey;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(30));
        factory.setReadTimeout(Duration.ofSeconds(300));
        this.ml = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
        this.json = json;
    }

    private Long owner(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    public record AskRequest(
            @NotBlank @Size(max = 4000) String question,
            Long materialId,
            List<Long> materialIds,
            List<Map<String, Object>> attachments,
            Long conversationId,
            Boolean grounded,
            String model,
            String subjectId,
            String subjectCode,
            Integer moduleNumber,
            String mode,
            Boolean generalKnowledge
    ) {}

    public record GroundedAskRequest(
            @NotBlank @Size(max = 4000) String question,
            List<Long> materialIds,
            Long materialId,
            List<Map<String, Object>> attachments,
            Long conversationId,
            String model,
            String subjectId,
            String subjectCode,
            Integer moduleNumber,
            String mode,
            Boolean generalKnowledge
    ) {}

    @GetMapping("/conversations")
    public Page<TutorConversation> list(
            Authentication a,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return conversations.findByOwnerIdOrderByCreatedAtDesc(
            owner(a),
            org.springframework.data.domain.PageRequest.of(page, Math.min(size, 50))
        );
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, Authentication a) {
        Long user = owner(a);
        return conversations.findByIdAndOwnerId(id, user).<ResponseEntity<?>>map(c ->
                ResponseEntity.ok(Map.of(
                        "conversation", c,
                        "messages", messages.findByConversationIdOrderByCreatedAtAsc(id).stream().map(this::messageView).toList()
                ))
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/conversations/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteConversation(@PathVariable Long id, Authentication a) {
        Long student = owner(a);
        return conversations.findByIdAndOwnerId(id, student).<ResponseEntity<?>>map(c -> {
            messages.deleteByConversationId(id);
            conversations.delete(c);
            return ResponseEntity.noContent().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/conversations")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> clearAllConversations(Authentication a) {
        Long student = owner(a);
        List<TutorConversation> list = conversations.findByOwnerId(student);
        if (!list.isEmpty()) {
            List<Long> ids = list.stream().map(TutorConversation::getId).toList();
            messages.deleteByConversationIdIn(ids);
            conversations.deleteAll(list);
        }
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> messageView(TutorMessage m) {
        try {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("role", m.getRole());
            map.put("content", m.getContent());
            map.put("sources", m.getSourcesJson() == null ? List.of() : json.readValue(m.getSourcesJson(), new TypeReference<List<Map<String, Object>>>() {}));
            map.put("attachments", m.getAttachmentsJson() == null ? List.of() : json.readValue(m.getAttachmentsJson(), new TypeReference<List<Map<String, Object>>>() {}));
            map.put("createdAt", m.getCreatedAt());
            return map;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Set<Long> collectRequestedMaterialIds(Long singleId, List<Long> multiIds, List<Map<String, Object>> attachments) {
        Set<Long> ids = new LinkedHashSet<>();
        if (multiIds != null) {
            for (Long id : multiIds) {
                if (id != null && id > 0) ids.add(id);
            }
        }
        if (singleId != null && singleId > 0) {
            ids.add(singleId);
        }
        if (attachments != null) {
            for (Map<String, Object> att : attachments) {
                Object idObj = att.get("id");
                if (idObj == null) idObj = att.get("materialId");
                if (idObj instanceof Number num) {
                    ids.add(num.longValue());
                } else if (idObj instanceof String str && !str.isBlank()) {
                    try {
                        ids.add(Long.parseLong(str.trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return ids;
    }

    private ResponseEntity<?> processTutorQuery(
            Long student,
            String question,
            Long conversationId,
            Set<Long> requestedMaterialIds,
            List<Map<String, Object>> clientAttachments,
            String subjectId,
            String subjectCode,
            Integer moduleNumber,
            String mode,
            Boolean generalKnowledge
    ) throws Exception {
        String selectedModel = "smartstudy-tutor";

        // Resolve conversation first so we can check active materials
        TutorConversation conversation;
        if (conversationId == null) {
            String title = question.trim();
            if (title.length() > 100) title = title.substring(0, 100) + "...";
            conversation = conversations.save(new TutorConversation(student, title));
        } else {
            conversation = conversations.findByIdAndOwnerId(conversationId, student).orElse(null);
            if (conversation == null) {
                return ResponseEntity.notFound().build();
            }
        }

        List<Material> validMaterials = new ArrayList<>();
        List<Long> validMaterialIds = new ArrayList<>();
        StringBuilder combinedDocText = new StringBuilder();
        String primaryTitle = null;
        boolean isExplicitAttachmentQuery = !requestedMaterialIds.isEmpty();

        if (isExplicitAttachmentQuery) {
            for (Long mid : requestedMaterialIds) {
                Material material = materials.findByIdAndOwnerId(mid, student).orElse(null);
                if (material == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", "Document not found or access denied (ID: " + mid + ")", "code", "NOT_FOUND"));
                }
                String status = material.getStatus();
                if ("PROCESSING".equals(status) || "INDEXING".equals(status) || "EXTRACTED".equals(status) || "QUEUED".equals(status)) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of(
                                    "error", "The attached document '" + material.getTitle() + "' is currently being indexed. Please allow a few moments for vector processing to complete.",
                                    "code", "DOCUMENT_PROCESSING",
                                    "materialId", mid
                            ));
                }
                if ("FAILED".equals(status)) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of(
                                    "error", "The attached document '" + material.getTitle() + "' failed processing. Please re-upload or retry indexing.",
                                    "code", "DOCUMENT_FAILED",
                                    "materialId", mid
                            ));
                }
                if (material.isReady()) {
                    validMaterials.add(material);
                    validMaterialIds.add(material.getId());
                    if (primaryTitle == null) primaryTitle = material.getTitle();
                    if (material.getExtractedText() != null && combinedDocText.length() < 24000) {
                        combinedDocText.append("\n--- ").append(material.getTitle()).append(" ---\n")
                                .append(material.getExtractedText());
                    }
                }
            }
        } else {
            // Check if conversation already has active material context
            String activeIdsStr = conversation.getActiveMaterialIds();
            if (activeIdsStr != null && !activeIdsStr.isBlank()) {
                for (String part : activeIdsStr.split(",")) {
                    try {
                        Long mid = Long.parseLong(part.trim());
                        Material material = materials.findByIdAndOwnerId(mid, student).orElse(null);
                        if (material != null && material.isReady()) {
                            validMaterials.add(material);
                            validMaterialIds.add(material.getId());
                            if (primaryTitle == null) primaryTitle = material.getTitle();
                            if (material.getExtractedText() != null && combinedDocText.length() < 24000) {
                                combinedDocText.append("\n--- ").append(material.getTitle()).append(" ---\n")
                                        .append(material.getExtractedText());
                            }
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        // Update active materials on conversation
        if (!validMaterialIds.isEmpty()) {
            conversation.setActiveMaterialIds(validMaterialIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
            conversations.save(conversation);
        }

        // Fetch recent conversation history turns
        List<TutorMessage> prevMessages = messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<Map<String, String>> historyList = new ArrayList<>();
        for (TutorMessage pm : prevMessages) {
            String role = "USER".equalsIgnoreCase(pm.getRole()) ? "user" : "assistant";
            historyList.add(Map.of("role", role, "content", pm.getContent()));
        }

        // Prepare message attachments list
        List<Map<String, Object>> messageAttachments = new ArrayList<>();
        if (!validMaterials.isEmpty()) {
            for (Material vm : validMaterials) {
                double sizeMb = vm.getFileSize() / (1024.0 * 1024.0);
                messageAttachments.add(Map.of(
                        "id", vm.getId(),
                        "name", vm.getTitle(),
                        "size", sizeMb < 0.1 ? "< 0.1 MB" : String.format(Locale.US, "%.1f MB", sizeMb),
                        "type", vm.getMimeType() != null ? vm.getMimeType() : "application/pdf",
                        "status", vm.getStatus()
                ));
            }
        }
        String attachmentsJson = messageAttachments.isEmpty() ? null : json.writeValueAsString(messageAttachments);

        // Save student question with persisted attachments
        messages.save(new TutorMessage(conversation.getId(), "USER", question.trim(), null, attachmentsJson));

        // Call /ml/v1/rag-query
        Map<?, ?> chatResponse;
        try {
            Map<String, Object> ragPayload = new HashMap<>();
            ragPayload.put("question", question.trim());
            ragPayload.put("material_ids", validMaterialIds);
            ragPayload.put("is_attachment_query", !validMaterialIds.isEmpty());
            ragPayload.put("conversation_history", historyList);
            ragPayload.put("k", 8);
            ragPayload.put("model", selectedModel);
            if (subjectId != null) ragPayload.put("subject_id", subjectId);
            if (subjectCode != null) ragPayload.put("subject_code", subjectCode);
            if (moduleNumber != null) ragPayload.put("module_number", moduleNumber);
            if (mode != null) ragPayload.put("mode", mode);
            if (generalKnowledge != null) ragPayload.put("general_knowledge_mode", generalKnowledge);
            if (combinedDocText.length() > 0) {
                ragPayload.put("document_text", combinedDocText.toString());
                ragPayload.put("material_title", primaryTitle);
            }

            ResponseEntity<String> responseEntity = ml.post().uri("/ml/v1/rag-query")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                    .body(ragPayload)
                    .retrieve()
                    .toEntity(String.class);

            String bodyStr = responseEntity.getBody();
            if (bodyStr == null || bodyStr.isBlank()) {
                return ResponseEntity.status(502).body(Map.of("error", "Empty response from AI Tutor service.", "code", "SERVICE_UNAVAILABLE"));
            }
            chatResponse = json.readValue(bodyStr, Map.class);
        } catch (org.springframework.web.client.RestClientResponseException e) {
            int statusCode = e.getStatusCode().value();
            if (statusCode == 422) {
                return ResponseEntity.status(422).body(Map.of("error", "Invalid question format: question cannot be empty.", "code", "VALIDATION_ERROR"));
            } else if (statusCode == 400) {
                return ResponseEntity.status(400).body(Map.of("error", "Model error: " + e.getResponseBodyAsString(), "code", "MODEL_ERROR"));
            } else if (statusCode == 504) {
                return ResponseEntity.status(504).body(Map.of("error", "The inference request timed out.", "code", "TIMEOUT_ERROR"));
            }
            return ResponseEntity.status(statusCode).body(Map.of("error", "AI service returned status " + statusCode, "code", "SERVICE_UNAVAILABLE"));
        } catch (Exception e) {
            System.err.println("[TutorController] Error calling /ml/v1/rag-query: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(503).body(Map.of("error", "The AI Tutor service is temporarily unavailable: " + e.getMessage(), "code", "SERVICE_UNAVAILABLE"));
        }

        String answerText = chatResponse != null && chatResponse.get("answer") != null
                ? chatResponse.get("answer").toString()
                : "No response generated.";

        Object sourcesObj = chatResponse != null ? chatResponse.get("sources") : List.of();
        String sourcesJson = sourcesObj != null ? json.writeValueAsString(sourcesObj) : "[]";
        boolean grounded = sourcesObj instanceof Collection<?> sources && !sources.isEmpty();

        messages.save(new TutorMessage(conversation.getId(), "TUTOR", answerText, sourcesJson));

        return ResponseEntity.ok(Map.of(
                "conversationId", conversation.getId(),
                "messages", messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream().map(this::messageView).toList(),
                "model", chatResponse != null && chatResponse.get("model") != null ? chatResponse.get("model").toString() : selectedModel,
                "grounded", grounded
        ));
    }

    @PostMapping({"/ask", "/chat"})
    public ResponseEntity<?> ask(
            @RequestBody @Valid AskRequest input,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            @RequestHeader(value = "X-LLM-Model", required = false) String clientLlmModel,
            Authentication a
    ) throws Exception {
        Long student = owner(a);
        Set<Long> requestedMaterialIds = collectRequestedMaterialIds(input.materialId(), input.materialIds(), input.attachments());

        return processTutorQuery(
                student,
                input.question(),
                input.conversationId(),
                requestedMaterialIds,
                input.attachments(),
                input.subjectId(),
                input.subjectCode(),
                input.moduleNumber(),
                input.mode(),
                input.generalKnowledge()
        );
    }

    @PostMapping("/ask-grounded")
    public ResponseEntity<?> askGrounded(
            @RequestBody @Valid GroundedAskRequest input,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            @RequestHeader(value = "X-LLM-Model", required = false) String clientLlmModel,
            Authentication a
    ) throws Exception {
        Long student = owner(a);
        Set<Long> requestedMaterialIds = collectRequestedMaterialIds(input.materialId(), input.materialIds(), input.attachments());

        return processTutorQuery(
                student,
                input.question(),
                input.conversationId(),
                requestedMaterialIds,
                input.attachments(),
                input.subjectId(),
                input.subjectCode(),
                input.moduleNumber(),
                input.mode(),
                input.generalKnowledge()
        );
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        try {
            Map<?, ?> health = ml.get().uri("/ml/v1/health").retrieve().body(Map.class);
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("status", "unhealthy", "error", e.getMessage()));
        }
    }
}
