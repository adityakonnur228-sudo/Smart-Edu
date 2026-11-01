# Smart Study Portal (Smart Edu) — Production Deployment Manual

## 1. System Requirements & Prerequisites

### 1.1 Hardware Specifications
- **CPU:** 8 cores minimum (12+ recommended for concurrent local embedding and parsing).
- **RAM:** 16 GB minimum (32 GB recommended for running Ollama LLM + Spring Boot JVM + Next.js).
- **GPU (Optional but Highly Recommended):** NVIDIA GPU with 8+ GB VRAM (RTX 3060/4060 or better) with CUDA 12 support.
- **Storage:** 100 GB SSD/NVMe (for ChromaDB vector data, model weights, and uploaded study materials).

### 1.2 Software Prerequisites
- **Operating System:** Ubuntu 22.04 / 24.04 LTS, Debian 12, or Windows Server 2022.
- **Docker & Docker Compose:** Docker Engine 26.0+ and Docker Compose v2.27+.
- **Ollama:** Version 0.3.0+ with models pulled:
  ```bash
  ollama pull nomic-embed-text:latest
  ollama pull smartstudy-tutor # (or qwen2.5:3b / custom Modelfile)
  ```

---

## 2. Docker Compose Production Deployment

The recommended production deployment utilizes the unified multi-container orchestration defined in `docker-compose.yml`.

### 2.1 Prepare Production Configuration
1. Clone the repository to the production server:
   ```bash
   git clone -b production-hardening <REPO_URL> /opt/smart-study
   cd /opt/smart-study
   ```
2. Create `.env.production` from `.env.production.example`:
   ```bash
   cp .env.production.example .env.production
   chmod 600 .env.production
   ```
3. Populate secure passwords and secret keys:
   ```bash
   # Generate secure JWT secret:
   openssl rand -hex 64
   
   # Generate internal cluster token:
   openssl rand -hex 32
   ```

### 2.2 Build and Start Containers
```bash
docker compose -f docker-compose.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.yml --env-file .env.production up -d
```

### 2.3 Verify Service Health
```bash
docker compose ps
```
All services (`mysql`, `ml`, `api`, `frontend`, `mailpit`) must show status `healthy` or `running`.

---

## 3. Nginx Reverse Proxy & SSL/TLS Configuration

Configure Nginx as the edge reverse proxy with SSL termination and WebSocket support.

### 3.1 Nginx Server Block (`/etc/nginx/sites-available/smartstudy.conf`)

```nginx
upstream frontend_cluster {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream backend_gateway {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name smartstudy.edu www.smartstudy.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartstudy.edu www.smartstudy.edu;

    ssl_certificate /etc/letsencrypt/live/smartstudy.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartstudy.edu/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Maximum file upload size (matching 20MB limit)
    client_max_body_size 25M;

    # Spring Boot API Gateway
    location /api/ {
        proxy_pass http://backend_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 90s;
        proxy_connect_timeout 15s;
    }

    # Next.js Frontend Application
    location / {
        proxy_pass http://frontend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
}
```

---

## 4. Bare-Metal & Systemd Service Architecture

For non-containerized Linux host deployments, configure systemd unit files:

### 4.1 Spring Boot Gateway Service (`/etc/systemd/system/smartstudy-api.service`)
```ini
[Unit]
Description=Smart Study Spring Boot API Gateway
After=network.target mysql.service

[Service]
User=smartstudy
WorkingDirectory=/opt/smart-study/backend
ExecStart=/usr/bin/java -XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -jar target/smart-study-api-0.1.0.jar
SuccessExitStatus=143
Restart=always
RestartSec=10
EnvironmentFile=/opt/smart-study/.env.production

[Install]
WantedBy=multi-user.target
```

### 4.2 FastAPI ML Worker Service (`/etc/systemd/system/smartstudy-ml.service`)
```ini
[Unit]
Description=Smart Study FastAPI ML Worker
After=network.target

[Service]
User=smartstudy
WorkingDirectory=/opt/smart-study/ml
ExecStart=/opt/smart-study/ml/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=10
EnvironmentFile=/opt/smart-study/.env.production

[Install]
WantedBy=multi-user.target
```

---

## 5. Post-Deployment Verification Checklist

1. **Verify Liveness & Readiness:**
   - Next.js: `curl -I https://smartstudy.edu` -> `HTTP/2 200`
   - Spring Boot: `curl https://smartstudy.edu/actuator/health` -> `{"status": "UP"}`
   - FastAPI ML: `curl http://127.0.0.1:8000/health` -> `{"status": "healthy"}`
2. **Verify Student Document Ingestion:** Upload test PDF and verify `COMPLETED` extraction and vector commitment.
3. **Verify AI Tutor Local Inference:** Submit grounded test question and verify response generated by `smartstudy-tutor` with accurate citations.
4. **Verify RAG Security:** Execute `python scratch/test_rag_isolation.py` (6/6 checks pass).

