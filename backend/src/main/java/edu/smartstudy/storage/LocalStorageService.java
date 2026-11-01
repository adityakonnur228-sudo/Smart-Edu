package edu.smartstudy.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
@ConditionalOnProperty(name = "app.storage-backend", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private final Path rootDir;

    public LocalStorageService(@Value("${app.upload-dir:./uploads}") String dir) {
        this.rootDir = Path.of(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not initialize upload storage directory: " + this.rootDir, e);
        }
    }

    @Override
    public void store(String key, InputStream inputStream, long size, String contentType) throws IOException {
        Path target = rootDir.resolve(key).normalize();
        if (!target.startsWith(rootDir)) {
            throw new SecurityException("Storage key path traversal attempt: " + key);
        }
        Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource loadAsResource(String key) throws IOException {
        Path file = getLocalFilePath(key);
        if (!Files.isRegularFile(file)) {
            throw new IOException("File not found for key: " + key);
        }
        return new FileSystemResource(file);
    }

    @Override
    public byte[] loadAsBytes(String key) throws IOException {
        Path file = getLocalFilePath(key);
        return Files.readAllBytes(file);
    }

    @Override
    public void delete(String key) throws IOException {
        Path file = getLocalFilePath(key);
        Files.deleteIfExists(file);
    }

    @Override
    public boolean exists(String key) {
        Path file = rootDir.resolve(key).normalize();
        return file.startsWith(rootDir) && Files.isRegularFile(file);
    }

    @Override
    public Path getLocalFilePath(String key) {
        Path target = rootDir.resolve(key).normalize();
        if (!target.startsWith(rootDir)) {
            throw new SecurityException("Storage key path traversal attempt: " + key);
        }
        return target;
    }
}

