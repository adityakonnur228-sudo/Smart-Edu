package edu.smartstudy.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

public interface StorageService {
    void store(String key, InputStream inputStream, long size, String contentType) throws IOException;
    Resource loadAsResource(String key) throws IOException;
    byte[] loadAsBytes(String key) throws IOException;
    void delete(String key) throws IOException;
    boolean exists(String key);
    Path getLocalFilePath(String key);
}

