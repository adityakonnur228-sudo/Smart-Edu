package edu.smartstudy.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Service
@ConditionalOnProperty(name = "app.storage-backend", havingValue = "s3")
public class S3StorageService implements StorageService {

    private final String endpoint;
    private final String region;
    private final String bucket;
    private final String accessKey;
    private final String secretKey;
    private final Path localCacheDir;
    private final HttpClient httpClient;

    public S3StorageService(
            @Value("${app.s3.endpoint:}") String endpoint,
            @Value("${app.s3.region:us-east-1}") String region,
            @Value("${app.s3.bucket:smart-study-documents}") String bucket,
            @Value("${app.s3.access-key:}") String accessKey,
            @Value("${app.s3.secret-key:}") String secretKey,
            @Value("${app.upload-dir:./uploads}") String dir) {
        this.endpoint = endpoint != null && !endpoint.isBlank() ? endpoint.replaceAll("/+$", "") : null;
        this.region = region;
        this.bucket = bucket;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.localCacheDir = Path.of(dir, "cache").toAbsolutePath().normalize();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        try {
            Files.createDirectories(this.localCacheDir);
        } catch (IOException ignored) {}
    }

    private URI resolveObjectUri(String key) {
        if (endpoint != null && !endpoint.isBlank()) {
            return URI.create(endpoint + "/" + bucket + "/" + key);
        }
        return URI.create("https://" + bucket + ".s3." + region + ".amazonaws.com/" + key);
    }

    @Override
    public void store(String key, InputStream inputStream, long size, String contentType) throws IOException {
        Path cacheFile = getLocalFilePath(key);
        Files.copy(inputStream, cacheFile, StandardCopyOption.REPLACE_EXISTING);

        // If S3 endpoint and credentials are provided, PUT object to S3 / MinIO / R2
        if (endpoint != null && accessKey != null && !accessKey.isBlank()) {
            try {
                byte[] data = Files.readAllBytes(cacheFile);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(resolveObjectUri(key))
                        .timeout(Duration.ofSeconds(60))
                        .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                        .PUT(HttpRequest.BodyPublishers.ofByteArray(data))
                        .build();
                httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            } catch (Exception e) {
                // Keep local cache if remote PUT fails
                System.err.println("[S3StorageService] Warning: Failed to sync object to S3: " + e.getMessage());
            }
        }
    }

    @Override
    public Resource loadAsResource(String key) throws IOException {
        Path cacheFile = getLocalFilePath(key);
        if (Files.isRegularFile(cacheFile)) {
            return new FileSystemResource(cacheFile);
        }

        // Try downloading from S3
        byte[] data = loadAsBytes(key);
        return new ByteArrayResource(data);
    }

    @Override
    public byte[] loadAsBytes(String key) throws IOException {
        Path cacheFile = getLocalFilePath(key);
        if (Files.isRegularFile(cacheFile)) {
            return Files.readAllBytes(cacheFile);
        }

        if (endpoint != null) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(resolveObjectUri(key))
                        .timeout(Duration.ofSeconds(30))
                        .GET()
                        .build();
                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() == 200) {
                    Files.write(cacheFile, response.body());
                    return response.body();
                }
            } catch (Exception e) {
                throw new IOException("Failed to load object from S3: " + key, e);
            }
        }
        throw new IOException("File not found in S3 or local cache: " + key);
    }

    @Override
    public void delete(String key) throws IOException {
        Path cacheFile = getLocalFilePath(key);
        Files.deleteIfExists(cacheFile);

        if (endpoint != null && accessKey != null && !accessKey.isBlank()) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(resolveObjectUri(key))
                        .timeout(Duration.ofSeconds(15))
                        .DELETE()
                        .build();
                httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            } catch (Exception e) {
                System.err.println("[S3StorageService] Warning: Failed to delete object from S3: " + e.getMessage());
            }
        }
    }

    @Override
    public boolean exists(String key) {
        Path cacheFile = getLocalFilePath(key);
        return Files.isRegularFile(cacheFile);
    }

    @Override
    public Path getLocalFilePath(String key) {
        Path target = localCacheDir.resolve(key).normalize();
        if (!target.startsWith(localCacheDir)) {
            throw new SecurityException("Storage key path traversal attempt: " + key);
        }
        return target;
    }
}

