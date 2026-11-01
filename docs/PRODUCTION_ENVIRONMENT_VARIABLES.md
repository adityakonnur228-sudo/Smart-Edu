# Smart Study Portal — Production Environment Variables Reference

This reference documents all configuration and environment variables across all services for production deployment to **Vercel** and **Railway**.

---

## 1. Security Classification & Guardrails

| Classification | Meaning | Exposure Boundary |
|---|---|---|
| **PUBLIC** | Baked into client-side JS bundles. Safe for public browser inspection. | Frontend client bundle (Browser) |
| **SERVER_CONFIG** | Non-sensitive server-side routing and behavior toggles. | Server container runtime |
| **SECRET** | Highly sensitive passwords, tokens, private keys. | Server container runtime only (Never commit!) |

> [!CAUTION]
> **Zero-Leakage Invariant:** NEVER prefix private API keys, database credentials, or signing secrets with `NEXT_PUBLIC_`. In Next.js, anything with `NEXT_PUBLIC_` is inlined into public JavaScript bundles visible to anyone with Developer Tools.

---

## 2. Frontend (Vercel)

Set these in the **Vercel Project Settings -> Environment Variables**.

| Variable Name | Type | Required | Classification | Default (Dev) | Description |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | String (URL) | **Yes** | PUBLIC | `http://localhost:8080/api/v1` | Public HTTPS URL of the Railway Spring Boot API (e.g. `https://api.yourdomain.com/api/v1` or `https://smart-study-backend.up.railway.app/api/v1`). |
| `NEXT_PUBLIC_API_URL` | String (URL) | No | PUBLIC | `http://localhost:8080/api/v1` | Backward-compatibility alias for `NEXT_PUBLIC_API_BASE_URL`. |
| `NEXT_PUBLIC_DEMO_MODE` | Boolean | No | PUBLIC | `false` | When `false`, demo login pre-fills and test mocks are disabled. Set to `false` in production. |

---

## 3. Backend REST API (Spring Boot -> Railway)

Set these in the **Railway Backend Service -> Variables**.

| Variable Name | Type | Required | Classification | Default | Description |
|---|---|---|---|---|---|
| `PORT` | Integer | Auto | SERVER_CONFIG | `8080` | Provided automatically by Railway. The container binds dynamically to this port. |
| `SPRING_DATASOURCE_URL` | String (JDBC) | **Yes** | SERVER_CONFIG | `jdbc:mysql://...` | JDBC URL for MySQL (e.g. `jdbc:mysql://mysql.railway.internal:3306/smart_study?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`). |
| `SPRING_DATASOURCE_USERNAME` | String | **Yes** | SERVER_CONFIG | `smart_study` | MySQL database user. |
| `SPRING_DATASOURCE_PASSWORD` | String | **Yes** | **SECRET** | — | MySQL database password. Minimum 24 characters recommended. |
| `JWT_SECRET` | String (Hex/Base64) | **Yes** | **SECRET** | — | Cryptographically random 256-bit secret key used to sign and verify session tokens. |
| `COOKIE_SECURE` | Boolean | **Yes** | SERVER_CONFIG | `false` | Must be `true` in production to enforce `Secure; SameSite=None` on cross-origin cookies. |
| `WEB_ORIGIN` | String (CSV) | **Yes** | SERVER_CONFIG | `http://localhost:3000` | Comma-separated list of allowed frontend origins (e.g. `https://smart-study.vercel.app,https://smartstudy.edu`). |
| `ML_SERVICE_URL` | String (URL) | **Yes** | SERVER_CONFIG | `http://localhost:8000` | Private internal URL of the FastAPI service on Railway (e.g. `http://ml.railway.internal:8000`). |
| `ML_INTERNAL_TOKEN` | String | **Yes** | **SECRET** | — | Shared cluster authentication token between Spring Boot and FastAPI (`X-Internal-Token`). |
| `STORAGE_BACKEND` | Enum (`local`\|`s3`) | No | SERVER_CONFIG | `local` | Document storage engine. Use `local` with a Railway Volume mounted to `/data/uploads`, or `s3`. |
| `UPLOAD_DIR` | String (Path) | No | SERVER_CONFIG | `/data/uploads` | Local or volume-mounted filesystem path for student documents. |
| `S3_ENDPOINT` | String (URL) | If S3 | SERVER_CONFIG | `""` | S3-compatible endpoint (e.g. `https://<id>.r2.cloudflarestorage.com` or AWS). |
| `S3_REGION` | String | If S3 | SERVER_CONFIG | `us-east-1` | S3 bucket region. |
| `S3_BUCKET` | String | If S3 | SERVER_CONFIG | `smart-study-documents` | S3 bucket name. |
| `S3_ACCESS_KEY` | String | If S3 | **SECRET** | `""` | S3 access key ID. |
| `S3_SECRET_KEY` | String | If S3 | **SECRET** | `""` | S3 secret access key. |
| `MAX_UPLOAD_MB` | Integer | No | SERVER_CONFIG | `20` | Maximum size of a single student file upload (MB). |
| `USER_STORAGE_QUOTA_MB` | Integer | No | SERVER_CONFIG | `500` | Maximum total storage quota per student account (MB). |
| `MAIL_HOST` | String | If Mail | SERVER_CONFIG | `localhost` | Production SMTP host (e.g. `smtp.sendgrid.net`). |
| `MAIL_PORT` | Integer | If Mail | SERVER_CONFIG | `587` | SMTP port (`587` for TLS / STARTTLS). |
| `MAIL_USERNAME` | String | If Mail | SERVER_CONFIG | `""` | SMTP account username / API key name. |
| `MAIL_PASSWORD` | String | If Mail | **SECRET** | `""` | SMTP password / API token. |
| `MAIL_STARTTLS_ENABLE` | Boolean | No | SERVER_CONFIG | `true` | Enable STARTTLS encryption. |
| `REQUIRE_EMAIL_VERIFICATION` | Boolean | No | SERVER_CONFIG | `false` | Require email confirmation before account activation. |

---

## 4. FastAPI ML Service (Railway)

Set these in the **Railway ML Service -> Variables**.

| Variable Name | Type | Required | Classification | Default | Description |
|---|---|---|---|---|---|
| `PORT` | Integer | Auto | SERVER_CONFIG | `8000` | Injected dynamically by Railway. Container binds dynamically to this port. |
| `ML_INTERNAL_TOKEN` | String | **Yes** | **SECRET** | — | Cluster authentication token. Must match `ML_INTERNAL_TOKEN` in Spring Boot. |
| `CHROMA_PERSIST_DIR` | String (Path) | **Yes** | SERVER_CONFIG | `/data/chroma` | Persistent vector store directory. Mount a Railway Volume to this path! |
| `OLLAMA_BASE_URL` | String (URL) | **Yes** | SERVER_CONFIG | `http://127.0.0.1:11434` | Endpoint of the GPU compute node running Ollama (e.g. `https://ollama.your-gpu-host.com`). |
| `OLLAMA_API_KEY` | String | Optional | **SECRET** | `""` | Bearer token if the remote Ollama server is protected by an authenticated reverse proxy. |
| `OLLAMA_CHAT_MODEL` | String | No | SERVER_CONFIG | `smartstudy-tutor` | Name of the primary reasoning model installed on the Ollama host. |
| `OLLAMA_EMBED_MODEL` | String | No | SERVER_CONFIG | `nomic-embed-text` | Name of the embedding model installed on the Ollama host. |
| `OLLAMA_CONTEXT_SIZE` | Integer | No | SERVER_CONFIG | `8192` | Model context window size in tokens. |
| `OLLAMA_TIMEOUT` | Integer | No | SERVER_CONFIG | `120` | Timeout in seconds for LLM generation requests. |
| `TAVILY_API_KEY` | String | Optional | **SECRET** | `""` | API key from Tavily (https://tavily.com) for Live Web Research quizzes. |
| `TAVILY_DAILY_CREDIT_BUDGET` | Integer | No | SERVER_CONFIG | `50` | Maximum daily Tavily credits allowed before falling back to cached / topic quizzes. |
| `TAVILY_CACHE_TTL_MINUTES` | Integer | No | SERVER_CONFIG | `360` | Duration to cache search queries (6 hours). |
| `TAVILY_MAX_STUDENT_DAILY_SEARCHES`| Integer | No | SERVER_CONFIG | `20` | Search limit per student per day to prevent abuse. |
| `OCR_ENABLED` | Boolean | No | SERVER_CONFIG | `true` | Enable Tesseract OCR for scanned PDF / image documents. |
| `OCR_LANGS` | String | No | SERVER_CONFIG | `eng` | Tesseract languages to use for OCR. |

---

## 5. Secret Generation Commands

Use these commands to generate cryptographically secure random secrets for production deployment:

### OpenSSL (Linux / macOS / Git Bash):
```bash
# Generate 256-bit JWT secret (64 hex characters)
openssl rand -hex 32

# Generate ML Internal Cluster Token (32 alphanumeric chars)
openssl rand -base64 24

# Generate strong MySQL password (32 alphanumeric chars)
openssl rand -base64 24
```

### PowerShell (Windows):
```powershell
# Generate 256-bit JWT secret (64 hex characters)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })

# Generate strong alphanumeric passwords / tokens
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

