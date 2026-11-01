package edu.smartstudy.quiz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smartstudy.material.*;
import edu.smartstudy.user.UserRepository;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/quizzes")
public class QuizController {
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(QuizController.class);
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final MaterialRepository materials;
    private final UserRepository users;
    private final ObjectMapper json;
    private final RestClient ml;
    private final String defaultOpenRouterApiKey;

    public QuizController(QuizRepository quizzes, QuizAttemptRepository attempts,
                          MaterialRepository materials, UserRepository users,
                          ObjectMapper json,
                          @Value("${app.ml-url}") String mlUrl,
                          @Value("${app.ml-internal-token:dev-internal-token-change-me}") String mlInternalToken,
                          @Value("${app.openrouter-api-key:}") String defaultOpenRouterApiKey) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.materials = materials;
        this.users = users;
        this.json = json;
        this.defaultOpenRouterApiKey = defaultOpenRouterApiKey;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(15));
        factory.setReadTimeout(Duration.ofSeconds(120));
        this.ml = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
    }

    private Long owner(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    public record GenerateRequest(
            Long materialId,
            String topic,
            Integer count,
            String model,
            String apiKey,
            String mode,
            String searchFocus,
            String difficulty,
            String timeRange
    ) {
        public GenerateRequest(Long materialId, String topic, Integer count) {
            this(materialId, topic, count, null, null, null, null, null, null);
        }
        public GenerateRequest(Long materialId, String topic, Integer count, String model, String apiKey) {
            this(materialId, topic, count, model, apiKey, null, null, null, null);
        }
        public GenerateRequest(Long materialId, String topic, Integer count, String model, String apiKey, String mode) {
            this(materialId, topic, count, model, apiKey, mode, null, null, null);
        }
    }

    public record AttemptInput(@jakarta.validation.constraints.NotEmpty List<String> answers) {}

    @GetMapping
    public List<Map<String, Object>> list(Authentication a) {
        Long studentId = owner(a);
        List<QuizAttempt> allAttempts = attempts.findTop100ByStudentIdOrderBySubmittedAtDesc(studentId);
        return quizzes.findTop100ByOwnerIdOrderByCreatedAtDesc(studentId).stream()
                .map(q -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", q.getId());
                    map.put("title", q.getTitle());
                    map.put("materialId", q.getMaterialId());
                    map.put("createdAt", q.getCreatedAt());
                    String topic = q.getTitle().replaceFirst("(?i)^Quiz\\s+on\\s+", "").trim();
                    map.put("topic", topic.isBlank() ? "Data Structures" : topic);
                    Optional<QuizAttempt> latest = allAttempts.stream()
                            .filter(att -> Objects.equals(att.getQuizId(), q.getId()))
                            .findFirst();
                    if (latest.isPresent() && latest.get().getTotalQuestions() > 0) {
                        int pct = Math.round(100.0f * latest.get().getScore() / latest.get().getTotalQuestions());
                        map.put("scorePercent", pct);
                        map.put("questionCount", latest.get().getTotalQuestions());
                    } else {
                        map.put("scorePercent", null);
                        map.put("questionCount", 5);
                    }
                    return map;
                })
                .toList();
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        boolean hasServerKey = defaultOpenRouterApiKey != null && !defaultOpenRouterApiKey.isBlank();
        String defaultModel = "smartstudy-tutor";
        return Map.of(
                "hasServerKey", hasServerKey,
                "defaultModel", defaultModel,
                "provider", hasServerKey ? "openrouter" : "local"
        );
    }

    @GetMapping("/live-search/status")
    public ResponseEntity<?> getLiveSearchStatus() {
        try {
            Map<?, ?> stats = ml.get().uri("/ml/v1/search/usage")
                    .retrieve()
                    .body(Map.class);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "error", "Could not reach search service: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/test-key")
    public ResponseEntity<?> testKey(
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            @RequestHeader(value = "X-LLM-Model", required = false) String clientLlmModel
    ) {
        String key = null;
        String model = null;
        if (body != null) {
            key = body.getOrDefault("apiKey", body.get("api_key"));
            model = body.getOrDefault("model", body.get("model_name"));
        }
        if (key == null || key.isBlank()) {
            key = clientOpenRouterApiKey != null && !clientOpenRouterApiKey.isBlank() ? clientOpenRouterApiKey : clientLlmApiKey;
        }
        if (model == null || model.isBlank()) {
            model = clientLlmModel;
        }
        if (key == null || key.isBlank()) {
            key = defaultOpenRouterApiKey;
        }
        if (model == null || model.isBlank()) {
            model = (key != null && !key.isBlank()) ? "smartstudy-tutor" : "smartstudy-tutor";
        }

        try {
            var postBuilder = ml.post().uri("/ml/v1/test-key")
                    .contentType(MediaType.APPLICATION_JSON);
            Map<String, String> reqBody = new HashMap<>();
            if (key != null && !key.isBlank()) reqBody.put("api_key", key.trim());
            if (model != null && !model.isBlank()) reqBody.put("model", model.trim());
            Map<?, ?> resp = postBuilder.body(reqBody).retrieve().body(Map.class);
            return ResponseEntity.ok(resp);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("valid", false, "error", "Could not reach ML service: " + e.getMessage()));
        }
    }

    @PostMapping({"/generate", "/generate-by-topic"})
    public ResponseEntity<?> generate(
            @RequestBody(required = false) GenerateRequest input,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            @RequestHeader(value = "X-LLM-Model", required = false) String clientLlmModel,
            Authentication a
    ) throws Exception {
        Long student = owner(a);
        if (input == null) {
            input = new GenerateRequest(null, null, 5, null, null);
        }

        String clientApiKey = (input.apiKey() != null && !input.apiKey().isBlank())
                ? input.apiKey().trim()
                : (clientOpenRouterApiKey != null && !clientOpenRouterApiKey.isBlank())
                    ? clientOpenRouterApiKey.trim()
                    : (clientLlmApiKey != null && !clientLlmApiKey.isBlank())
                        ? clientLlmApiKey.trim()
                        : (defaultOpenRouterApiKey != null && !defaultOpenRouterApiKey.isBlank())
                            ? defaultOpenRouterApiKey.trim()
                            : "";

        String model = (input.model() != null && !input.model().isBlank())
                ? input.model().trim()
                : (clientLlmModel != null && !clientLlmModel.isBlank())
                    ? clientLlmModel.trim()
                    : (!clientApiKey.isBlank())
                        ? "smartstudy-tutor"
                        : "smartstudy-tutor";

        String topicName = input.topic() != null ? input.topic().trim() : "";
        Long targetMaterialId = input.materialId();
        String requestedMode = input.mode() != null ? input.mode().trim().toLowerCase() : "";
        boolean isLiveMode = "live".equals(requestedMode) || "web".equals(requestedMode) || "live-research".equals(requestedMode);
        boolean isMaterialMode = "material".equals(requestedMode) || (!isLiveMode && targetMaterialId != null && targetMaterialId > 0);

        Material material = null;

        if (isLiveMode) {
            if (topicName.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please provide a search topic for live web research."));
            }
            final String finalTopicName = topicName;
            material = materials.findTop100ByOwnerIdOrderByCreatedAtDesc(student).stream()
                    .filter(m -> finalTopicName.equalsIgnoreCase(m.getTitle()))
                    .findFirst()
                    .orElseGet(() -> {
                        String cleanSlug = finalTopicName.toLowerCase().replaceAll("[^a-z0-9]+", "-");
                        Material newMat = new Material(
                                student,
                                finalTopicName,
                                cleanSlug + ".txt",
                                "live-" + UUID.randomUUID(),
                                "text/plain",
                                (long) finalTopicName.length()
                        );
                        newMat.complete("Live web research quiz on: " + finalTopicName, "Live web summary", "[]", "[]");
                        return materials.save(newMat);
                    });
        } else if (isMaterialMode) {
            if (targetMaterialId == null || targetMaterialId <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "A valid study note ID is required to generate a note-grounded quiz."));
            }
            material = materials.findByIdAndOwnerId(targetMaterialId, student).orElse(null);
            if (material == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "The requested study note was not found or does not belong to your account."));
            if (!"COMPLETED".equals(material.getStatus()) || material.getExtractedText() == null) {
                return ResponseEntity.status(409).body(Map.of("error", "Wait until this note has finished processing."));
            }
        } else if (!topicName.isBlank()) {
            // Mode A: Topic Mode
            final String finalTopicName = topicName;
            material = materials.findTop100ByOwnerIdOrderByCreatedAtDesc(student).stream()
                    .filter(m -> finalTopicName.equalsIgnoreCase(m.getTitle()))
                    .findFirst()
                    .orElseGet(() -> {
                        String cleanSlug = finalTopicName.toLowerCase().replaceAll("[^a-z0-9]+", "-");
                        Material newMat = new Material(
                                student,
                                finalTopicName,
                                cleanSlug + ".txt",
                                "topic-" + UUID.randomUUID(),
                                "text/plain",
                                (long) finalTopicName.length()
                        );
                        newMat.complete("Quiz study topic for: " + finalTopicName, "Topic summary", "[]", "[]");
                        return materials.save(newMat);
                    });
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Please provide either a study material or a topic to generate a quiz."));
        }

        // Prepare ML request payload
        Map<String, Object> mlReq = new HashMap<>();
        if (isLiveMode) {
            mlReq.put("mode", "live");
            mlReq.put("topic", topicName);
            mlReq.put("search_focus", input.searchFocus() != null ? input.searchFocus() : "general");
            mlReq.put("difficulty", input.difficulty() != null ? input.difficulty() : "MEDIUM");
            if (input.timeRange() != null) {
                mlReq.put("time_range", input.timeRange());
            }
            mlReq.put("student_id", student);
        } else if (isMaterialMode) {
            mlReq.put("mode", "material");
            mlReq.put("material_id", material.getId());
            mlReq.put("material_title", material.getTitle());
            if (material.getExtractedText() != null && !material.getExtractedText().startsWith("Quiz study topic for:") && !material.getExtractedText().startsWith("Live web research quiz on:")) {
                mlReq.put("text", material.getExtractedText());
            }
            if (!topicName.isBlank()) {
                mlReq.put("topic", topicName);
            }
        } else {
            mlReq.put("mode", "topic");
            mlReq.put("topic", topicName);
            // In topic mode, do NOT send text from placeholder materials
        }
        mlReq.put("count", input.count() != null ? input.count() : 5);
        if (clientApiKey != null) {
            mlReq.put("api_key", clientApiKey);
        }
        if (model != null && !model.isBlank()) {
            mlReq.put("model", model);
        }

        Map<?, ?> generated;
        try {
            var postBuilder = ml.post().uri("/ml/v1/questions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL);
            if (clientApiKey != null) {
                postBuilder.header("X-OpenRouter-Api-Key", clientApiKey);
                postBuilder.header("X-LLM-Api-Key", clientApiKey);
            }
            if (model != null && !model.isBlank()) {
                postBuilder.header("X-LLM-Model", model);
            }
            ResponseEntity<String> responseEntity = postBuilder.body(mlReq)
                    .retrieve()
                    .toEntity(String.class);

            String bodyStr = responseEntity.getBody();
            MediaType respContentType = responseEntity.getHeaders().getContentType();
            logger.info("[QuizController] Downstream /ml/v1/questions status={}, contentType={}, bytes={}",
                    responseEntity.getStatusCode(), respContentType, bodyStr != null ? bodyStr.length() : 0);

            if (bodyStr == null || bodyStr.isBlank()) {
                return ResponseEntity.status(502).body(Map.of("error", "Empty response from ML question generation service."));
            }

            generated = json.readValue(bodyStr, Map.class);
        } catch (org.springframework.web.client.RestClientResponseException e) {
            String errorBody = e.getResponseBodyAsString();
            logger.warn("[QuizController] ML service returned HTTP {}: {}", e.getStatusCode(), errorBody);
            try {
                Map<?, ?> errMap = json.readValue(errorBody, Map.class);
                if (errMap.containsKey("error") || errMap.containsKey("detail")) {
                    return ResponseEntity.status(e.getStatusCode()).body(errMap);
                }
            } catch (Exception ignored) {}
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", "Quiz generation failed: " + (errorBody.isBlank() ? e.getStatusText() : errorBody)));
        } catch (Exception e) {
            logger.error("[QuizController] Exception calling ML question service: {}", e.getMessage(), e);
            return ResponseEntity.status(503).body(Map.of("error", "The quiz generation service is temporarily unavailable. Please try again."));
        }

        List<Map<String, Object>> questions = json.convertValue(generated.get("questions"), new TypeReference<>() {});
        if (questions == null || questions.isEmpty()) {
            String notice = generated.get("notice") != null ? generated.get("notice").toString() : "Could not generate questions. Please ensure notes contain content or specify a valid topic.";
            return ResponseEntity.status(422).body(Map.of("error", notice));
        }

        // Question topic integrity check: prevent cross-domain contamination from leaking to student
        if (!isMaterialMode && !topicName.isBlank()) {
            String topicLower = topicName.toLowerCase();
            boolean isCloudTopic = topicLower.contains("cloud") || topicLower.contains("iaas") || topicLower.contains("paas") || topicLower.contains("saas");
            if (!isCloudTopic) {
                boolean hasContamination = questions.stream().anyMatch(q -> {
                    String qText = Objects.toString(q.get("question"), "").toLowerCase();
                    String qExp = Objects.toString(q.get("explanation"), "").toLowerCase();
                    return qText.contains("cloud computing") || qText.contains("google app engine") || qExp.contains("cloud computing");
                });
                if (hasContamination) {
                    return ResponseEntity.status(422).body(Map.of("error", "Question generation rejected due to topic cross-contamination."));
                }
            }
        }

        // If ML service resolved deep context for this topic, save it to the material record for future tutor grounding
        String resolvedCtx = Objects.toString(generated.get("resolved_context"), "");
        if (!resolvedCtx.isBlank() && material != null && (material.getExtractedText() == null || material.getExtractedText().startsWith("Quiz study topic for:"))) {
            material.complete(resolvedCtx, "Verified factual context for: " + (!topicName.isBlank() ? topicName : material.getTitle()), "[]", "[]");
            materials.save(material);
        }

        String quizTitle = !topicName.isBlank() ? "Quiz on " + topicName : "Quiz on " + material.getTitle();
        Quiz quiz = new Quiz(student, material.getId(), quizTitle, json.writeValueAsString(questions));
        Quiz saved = quizzes.save(quiz);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", saved.getId());
        resp.put("title", saved.getTitle());
        resp.put("materialId", saved.getMaterialId());
        resp.put("questions", questions);
        resp.put("questionsJson", saved.getQuestionsJson());
        resp.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt() : java.time.Instant.now());
        return ResponseEntity.status(201).body(resp);
    }

    @PostMapping("/generate/{materialId}")
    public ResponseEntity<?> generateFromMaterial(
            @PathVariable Long materialId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            @RequestHeader(value = "X-LLM-Model", required = false) String clientLlmModel,
            Authentication a
    ) throws Exception {
        Integer count = 5;
        String model = null;
        String apiKey = null;
        if (body != null) {
            if (body.get("count") instanceof Number n) {
                count = n.intValue();
            }
            if (body.get("model") != null) {
                model = body.get("model").toString();
            }
            if (body.get("apiKey") != null) {
                apiKey = body.get("apiKey").toString();
            } else if (body.get("api_key") != null) {
                apiKey = body.get("api_key").toString();
            }
        }
        String topic = body != null && body.get("topic") != null ? body.get("topic").toString() : null;
        return generate(new GenerateRequest(materialId, topic, count, model, apiKey, "material"), clientOpenRouterApiKey, clientLlmApiKey, clientLlmModel, a);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).<ResponseEntity<?>>map(quiz -> {
            List<Map<String, Object>> qList = List.of();
            try {
                qList = json.readValue(quiz.getQuestionsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of(
                    "id", quiz.getId(),
                    "title", quiz.getTitle(),
                    "materialId", quiz.getMaterialId(),
                    "questions", qList,
                    "createdAt", quiz.getCreatedAt()
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping({"/{id}/attempt", "/{id}/attempts"})
    public ResponseEntity<?> attempt(@PathVariable Long id, @RequestBody @Valid AttemptInput input, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).<ResponseEntity<?>>map(quiz -> {
            List<Map<String, Object>> questions;
            try {
                questions = json.readValue(quiz.getQuestionsJson(), new TypeReference<>() {});
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                return ResponseEntity.status(422).body(Map.of("error", "Invalid quiz data"));
            }
            if (questions == null || questions.isEmpty())
                return ResponseEntity.status(422).body(Map.of("error", "Quiz has no questions"));

            int correct = 0;
            List<Map<String, Object>> itemResults = new ArrayList<>();
            for (int i = 0; i < questions.size(); i++) {
                Map<String, Object> question = questions.get(i);
                String selected = i < input.answers().size() ? input.answers().get(i) : "";

                // Find expected answer from multiple possible keys
                String expected = "";
                if (question.get("correct_answer") != null) {
                    expected = question.get("correct_answer").toString();
                } else if (question.get("answer") != null) {
                    expected = question.get("answer").toString();
                } else if (question.get("correct_index") != null && question.get("options") instanceof List<?> opts) {
                    int cIdx = ((Number) question.get("correct_index")).intValue();
                    if (cIdx >= 0 && cIdx < opts.size()) {
                        expected = opts.get(cIdx).toString();
                    }
                }

                // Evaluate correctness
                boolean isCorrect = false;
                if (!expected.isBlank() && !selected.isBlank()) {
                    if (expected.trim().equalsIgnoreCase(selected.trim())) {
                        isCorrect = true;
                    } else if (question.get("options") instanceof List<?> opts) {
                        try {
                            int selIdx = Integer.parseInt(selected.trim());
                            if (selIdx >= 0 && selIdx < opts.size() && opts.get(selIdx).toString().trim().equalsIgnoreCase(expected.trim())) {
                                isCorrect = true;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }

                if (isCorrect) correct++;

                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("question", Objects.toString(question.get("question"), ""));
                itemMap.put("selectedAnswer", selected);
                itemMap.put("correctAnswer", expected);
                itemMap.put("correct", isCorrect);
                itemMap.put("explanation", Objects.toString(question.get("explanation"), "Correct answer: " + expected));
                itemMap.put("sourceReference", Objects.toString(question.get("source_reference"), "Study notes"));
                if (question.get("source_url") != null) itemMap.put("sourceUrl", question.get("source_url"));
                if (question.get("source_title") != null) itemMap.put("sourceTitle", question.get("source_title"));
                if (question.get("published_date") != null) itemMap.put("publishedDate", question.get("published_date"));
                if (question.get("source_snippet") != null) itemMap.put("sourceSnippet", question.get("source_snippet"));
                if (question.get("provider") != null) itemMap.put("provider", question.get("provider"));
                itemResults.add(itemMap);
            }

            String answersJson = "[]";
            try {
                answersJson = json.writeValueAsString(input.answers());
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                // ignore
            }
            QuizAttempt attempt = new QuizAttempt(quiz.getId(), owner(a), correct, questions.size(), answersJson);
            attempts.save(attempt);
            return ResponseEntity.ok(Map.of(
                    "score", correct,
                    "total", questions.size(),
                    "accuracyPercent", questions.isEmpty() ? 0 : Math.round(100.0 * correct / questions.size()),
                    "results", itemResults,
                    "notice", "Attempt recorded."
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).map(quiz -> {
            attempts.deleteAll(attempts.findByQuizId(id));
            quizzes.delete(quiz);
            return ResponseEntity.ok(Map.of("message", "Quiz deleted"));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}