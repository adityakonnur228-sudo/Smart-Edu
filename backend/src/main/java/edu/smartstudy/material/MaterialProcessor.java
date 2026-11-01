package edu.smartstudy.material;

import edu.smartstudy.storage.StorageService;

import java.nio.file.Path;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;
import java.time.Duration;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MaterialProcessor {
    private final MaterialRepository materials;
    private final MaterialChunkRepository chunkRepo;
    private final WebClient ml;
    private final ObjectMapper json;
    private final Path uploadDir;
    private final String mlInternalToken;
    private final StorageService storageService;

    public MaterialProcessor(MaterialRepository materials, MaterialChunkRepository chunkRepo,
                             @Value("${app.ml-url}") String mlUrl,
                             @Value("${app.ml-internal-token}") String mlInternalToken,
                             @Value("${app.upload-dir}") String dir,
                             StorageService storageService,
                             ObjectMapper json) {
        this.storageService = storageService;
        this.materials = materials;
        this.chunkRepo = chunkRepo;
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(300));
        this.ml = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
        this.json = json;
        this.uploadDir = Path.of(dir).toAbsolutePath().normalize();
        this.mlInternalToken = mlInternalToken;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resumeProcessingAfterRestart() {
        materials.findByStatusIn(java.util.List.of("QUEUED", "PROCESSING", "EXTRACTED", "CHUNKING", "INDEXING")).forEach(m ->
                java.util.concurrent.CompletableFuture.runAsync(() -> processNow(m.getId()))
        );
    }

    public void process(Long id) {
        java.util.concurrent.CompletableFuture.runAsync(() -> processNow(id));
    }

    public void process(Long id, Path file) {
        process(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public void retry(Long id) {
        Material material = materials.findById(id).orElse(null);
        if (material == null) return;
        deleteVectorIndex(id);
        chunkRepo.deleteByMaterialId(id);
        material.processing();
        materials.save(material);
        java.util.concurrent.CompletableFuture.runAsync(() -> processNow(id));
    }

    private void processNow(Long id) {
        Material material = materials.findById(id).orElse(null);
        if (material == null) return;
        try {
            material.processing();
            materials.save(material);
            String fileName = material.getFileName();
            byte[] fileBytes = storageService.loadAsBytes(material.storageKey());

            System.err.println("[MaterialProcessor] Uploading file: " + fileName + " for key: " + material.storageKey());
            System.err.println("[MaterialProcessor] File size: " + fileBytes.length);

            // Extract text and chunks using WebClient
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            }).filename(fileName);

            Map<?, ?> extracted = ml.post()
                    .uri("/ml/v1/extract")
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            System.err.println("[MaterialProcessor] Extract response: " + extracted);

            String text = Objects.toString(extracted.get("text"), "");
            String fileType = Objects.toString(extracted.get("file_type"), "unknown");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> chunks = (List<Map<String, Object>>) extracted.get("chunks");
            @SuppressWarnings("unchecked")
            List<String> warnings = (List<String>) extracted.get("extraction_warnings");

            if (warnings != null && !warnings.isEmpty()) {
                warnings.forEach(w -> System.err.println("[MaterialProcessor] Extraction warning: " + w));
            }

            // Persist chunks to MySQL (for backward compatibility and exact text retrieval)
            if (chunks != null) {
                persistChunks(id, chunks);
            }

            material.extracted(text);
            materials.save(material);

            // Index chunks in ChromaDB vector store for semantic search
            if (chunks != null && !chunks.isEmpty()) {
                material.indexing(text);
                materials.save(material);
                indexChunksInVectorStore(id, chunks, fileType, fileName, material.getOwnerId());
                material.indexed(text);
                materials.save(material);
                System.err.println("[MaterialProcessor] Material " + id + " indexed in ChromaDB (status: INDEXED, chunks: " + chunks.size() + ")");
            } else {
                material.indexed(text);
                materials.save(material);
            }

            // Summarize, Topics, Keywords (Enrichment - non-blocking for retrieval readiness)
            try {
                Map<?, ?> summary = ml.post()
                        .uri("/ml/v1/summarize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(Map.of("text", text, "material_id", id, "style", "detailed"))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<?, ?> topics = ml.post()
                        .uri("/ml/v1/topics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(Map.of("text", text))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<?, ?> keywords = ml.post()
                        .uri("/ml/v1/keywords")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(Map.of("text", text))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                material.complete(text,
                        summary != null ? Objects.toString(summary.get("summary"), "") : "",
                        topics != null ? json.writeValueAsString(topics.get("topics")) : "[]",
                        keywords != null ? json.writeValueAsString(keywords.get("keywords")) : "[]");
                materials.save(material);
            } catch (Exception enrichErr) {
                System.err.println("[MaterialProcessor] Note enrichment warning for material " + id + ": " + enrichErr.getMessage());
                material.indexed(text);
                materials.save(material);
            }

            System.err.println("[MaterialProcessor] Successfully processed material " + id);
        } catch (Exception e) {
            System.err.println("[MaterialProcessor] Error processing material " + id + ": " + e.getMessage());
            e.printStackTrace(System.err);
            material.fail("Processing could not be completed: " + e.getMessage());
            materials.save(material);
        }
    }

    public void deleteVectorIndex(Long materialId) {
        try {
            ml.delete()
                    .uri("/ml/v1/index-material/" + materialId)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            System.err.println("[MaterialProcessor] Successfully deleted vector index for material " + materialId);
        } catch (Exception e) {
            System.err.println("[MaterialProcessor] Failed to delete vector index for material " + materialId + ": " + e.getMessage());
        }
    }

    private void indexChunksInVectorStore(Long materialId, List<Map<String, Object>> chunks, String fileType, String fileName, Long ownerId) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("material_id", materialId);
            payload.put("chunks", chunks);
            payload.put("file_type", fileType);
            payload.put("filename", fileName);
            if (ownerId != null && ownerId > 0) {
                payload.put("student_id", ownerId);
            }
            payload.put("scope", "private");

            Map<?, ?> result = ml.post()
                    .uri("/ml/v1/index-material")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            System.err.println("[MaterialProcessor] Vector index result: " + result);
        } catch (Exception e) {
            System.err.println("[MaterialProcessor] Vector indexing failed for material " + materialId + ": " + e.getMessage());
            // Don't fail the whole processing if vector indexing fails
            e.printStackTrace(System.err);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void persistChunks(Long materialId, List<Map<String, Object>> chunks) {
        // Delete existing chunks for this material
        chunkRepo.deleteByMaterialId(materialId);

        List<MaterialChunk> entities = new ArrayList<>();
        for (Map<String, Object> chunk : chunks) {
            Integer ordinal = (Integer) chunk.get("ordinal");
            if (ordinal == null) {
                // Fallback: assign sequential ordinal
                ordinal = entities.size();
            }
            Integer page = (Integer) chunk.get("page");
            String heading = (String) chunk.get("heading");
            String text = Objects.toString(chunk.get("text"), "");
            Integer tokenCount = (Integer) chunk.get("token_count");
            if (tokenCount == null) {
                tokenCount = text.length() / 4; // rough estimate
            }

            MaterialChunk entity = new MaterialChunk(materialId, ordinal, page, heading, text, tokenCount);
            entities.add(entity);
        }
        chunkRepo.saveAll(entities);
    }
}