package edu.smartstudy.health;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "smart-study-api");
        body.put("version", "0.1.0");
        body.put("timestamp", Instant.now().toString());

        boolean dbHealthy = false;
        try (Connection conn = dataSource.getConnection()) {
            dbHealthy = conn.isValid(2);
        } catch (Exception e) {
            dbHealthy = false;
        }

        body.put("database", dbHealthy ? "UP" : "DOWN");

        if (dbHealthy) {
            return ResponseEntity.ok(body);
        } else {
            body.put("status", "DEGRADED");
            return ResponseEntity.status(503).body(body);
        }
    }
}

