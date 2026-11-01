# Smart Study Portal (Smart Edu) — System Architecture Specification

## 1. Executive Summary & Architectural Overview

The **Smart Study Portal (Smart Edu)** is an enterprise-grade, privacy-first educational platform designed for engineering students following the Visvesvaraya Technological University (VTU) curriculum. The platform combines rigorous relational study management (tasks, focus sessions, flashcards, quizzes, adaptive study plans, and parent oversight) with a local-first, zero-cloud-leakage Retrieval-Augmented Generation (RAG) AI Professor.

### Architecture Invariants
1. **Zero Cloud Inference Fallback:** All AI inference (chat generation, embeddings, semantic extraction) executes exclusively on local hardware via Ollama using `smartstudy-tutor` and `nomic-embed-text:latest`. Third-party cloud LLM keys or models injected via request payloads are systematically neutralized.
2. **Fail-Closed Multi-Collection Vector Isolation:** Global VTU curriculum materials reside strictly in `vtu_academic_knowledge` (1,048 vectors across 14 courses). Private student notes reside strictly in `smart_study_documents` (327 vectors). Private queries with empty, missing, or unauthorized `material_ids` fail closed immediately, returning empty lists and preventing cross-tenant chunk leakage.
3. **Relational Truth in MySQL:** MySQL 8 is the immutable system of record for authentication, users, materials metadata, study tasks, adaptive plans, focus sessions, quiz attempts, and parent-student links.
4. **Additive Migrations Only:** Database evolution is strictly managed via Flyway incremental migrations (`V1` through `V11+`). Destructive table drops and resets are forbidden in production.

---

## 2. High-Level Component Architecture

```mermaid
graph TD
    User["Student / Parent / Admin Web Client (Browser)"]
    Frontend["Next.js 16 Frontend (Port 3000)<br/>React 19 • Tailwind CSS • Lucide Icons"]
    Gateway["Spring Boot 3.4.2 API Gateway (Port 8080)<br/>Spring Security • JWT • JPA Hibernate • Flyway"]
    MySQL[("MySQL 8.0 Server (Port 3307)<br/>Relational System of Record")]
    MLService["FastAPI ML Worker (Port 8000)<br/>PyMuPDF • Tokenizer • Semantic Chunking"]
    ChromaDB[("ChromaDB Vector Store<br/>ml/chroma_data (1,375 total vectors)")]
    Ollama["Ollama Local AI Inference (Port 11434)<br/>smartstudy-tutor • nomic-embed-text"]

    User -->|HTTPS / WSS| Frontend
    Frontend -->|REST API with Cookies/Bearer| Gateway
    Gateway -->|JDBC / Connection Pool| MySQL
    Gateway -->|Internal HTTP + X-Internal-Token| MLService
    MLService -->|Direct Python API| ChromaDB
    MLService -->|HTTP REST API| Ollama

    subgraph "Public / DMZ"
        Frontend
    end

    subgraph "Application Core"
        Gateway
        MySQL
    end

    subgraph "Internal AI & Vector Subsystem"
        MLService
        ChromaDB
        Ollama
    end
```

---

## 3. Security Boundaries & Network Segmentation

| Component | Port | Network Boundary | Authentication Mechanism | Allowed Inbound Traffic |
|---|---|---|---|---|
| **Next.js Web Frontend** | 3000 | Public Internet / DMZ | Public / Static Assets | End users (Browsers) |
| **Spring Boot Gateway** | 8080 | Application Gateway | JWT (`study_session` cookie / Bearer token) | Next.js Reverse Proxy / Public API |
| **FastAPI ML Service** | 8000 | Internal Cluster Network | `X-Internal-Token` Header (`dev-internal-token-change-me`) | Spring Boot Gateway ONLY |
| **MySQL Database** | 3307 (or 3306 in Docker) | Isolated Internal Network | Native MySQL Password Auth (`root` / `smart_study`) | Spring Boot Gateway ONLY |
| **ChromaDB Vector Store** | N/A (Embedded) | Local Filesystem (`ml/chroma_data`) | Process-level file ownership (FastAPI) | FastAPI ML Service ONLY |
| **Ollama Local AI** | 11434 | Loopback / Internal Network | Host binding (`127.0.0.1`) | FastAPI ML Service ONLY |

---

## 4. End-to-End Data & Execution Flows

### 4.1 Document Ingestion & Vector Indexing Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Gateway as Spring Boot (8080)
    participant Disk as Local Storage (/data/uploads)
    participant ML as FastAPI ML (8000)
    participant Chroma as ChromaDB (smart_study_documents)

    Student->>Gateway: POST /api/v1/materials (multipart/form-data)
    Gateway->>Gateway: Verify Magic Bytes (%PDF-, PK zip, UTF-8) & Quota (500MB)
    Gateway->>Disk: Persist raw file with UUID path
    Gateway->>Gateway: Create Material record (status=PROCESSING)
    Gateway-->>Student: HTTP 202 Accepted {id: 42, status: "PROCESSING"}

    Gateway->>ML: POST /ml/v1/extract (file payload)
    ML->>ML: PyMuPDF text & page extraction + semantic chunking
    ML-->>Gateway: ExtractionResult {text, chunks, pageCount}
    Gateway->>Gateway: Update Material (extractedText, status=COMPLETED)

    Gateway->>ML: POST /ml/v1/index-material {material_id: 42, chunks, scope: "private"}
    ML->>ML: Generate dense embeddings via nomic-embed-text
    ML->>Chroma: Upsert vectors into smart_study_documents
    Chroma-->>ML: Vectors committed
    ML-->>Gateway: HTTP 200 {status: "indexed", chunksCount: 15}
```

### 4.2 Grounded AI Tutor Query Flow (Learn & Quick Revision Modes)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Gateway as Spring Boot (8080)
    participant ML as FastAPI ML (8000)
    participant Chroma as ChromaDB
    participant Ollama as Ollama (smartstudy-tutor)

    Student->>Gateway: POST /api/v1/tutor/ask {question, subject, mode: "learn"}
    Gateway->>Gateway: Validate session & authorized material_ids
    Gateway->>ML: POST /ml/v1/rag-query {question, subject_id, material_ids, mode}
    
    alt Private Student Scope
        ML->>Chroma: search(query, material_ids=[42], scope="private")
    else Global VTU Scope
        ML->>Chroma: search(query, course_code="BCS303", scope="global_vtu")
    end
    
    Chroma-->>ML: Retrieved top-k ranked chunks with cosine scores
    ML->>ML: Format pedagogical prompt (Learn Mode: 9-step masterclass / Quick Revision: high-yield summary)
    ML->>Ollama: POST /api/chat {model: "smartstudy-tutor", messages}
    Ollama-->>ML: Generated stream / complete response
    ML-->>Gateway: {answer, sources: [{filename, page, score}], status: "success"}
    Gateway->>Gateway: Persist TutorConversation & Message
    Gateway-->>Student: HTTP 200 {answer, sources, conversationId}
```

---

## 5. Storage Architecture & Relational Schema

### 5.1 Relational Tables (MySQL)
- `users`: Core account data, roles (`STUDENT`, `PARENT`, `ADMIN`), BCrypt work factor 12 password hashes, timezone (`Asia/Kolkata`), email verification status, and `token_version` for instant session revocation.
- `materials`: Uploaded document metadata, UUID storage paths, MIME types, processing status (`UPLOADED`, `PROCESSING`, `COMPLETED`, `FAILED`), and extracted summary.
- `material_chunks`: Relational mirror of chunk text, ordinal, and page boundaries.
- `study_tasks`: Relational task tracking, estimated minutes, priorities (`LOW`, `MEDIUM`, `HIGH`), scheduled dates, status (`PENDING`, `COMPLETED`), and completion timestamps.
- `study_plans`: Adaptive study plans with daily minute budgets (`availableMinutesPerDay`), start/end dates, and status (`ACTIVE`, `SUPERSEDED`).
- `focus_sessions`: Pomodoro and focus timer tracking with `started_at`, `active_since`, `ended_at`, `duration_seconds`, and status (`ACTIVE`, `PAUSED`, `COMPLETED`).
- `quizzes`: Generated assessment containers, titles, and questions JSON schema.
- `quiz_attempts`: Student submissions with score, total questions, and answers JSON.
- `flashcards`: Spaced repetition cards with SuperMemo SM-2 parameters (`ease_factor`, `interval_days`, `review_count`, `lapses`, `next_review`).
- `flashcard_reviews`: Complete audit trail of SM-2 reviews tracking interval and ease factor transitions.
- `tutor_conversations` & `tutor_messages`: AI Tutor chat history, role (`USER`, `TUTOR`), content, and citations.
- `parent_student_links`: Explicit student consent gating (`parent_id`, `student_id`, `status: PENDING|APPROVED|REJECTED`).

### 5.2 Vector Collections (ChromaDB)
- `vtu_academic_knowledge` (1,048 vectors):
  * Strictly global VTU curriculum notes across 14 indexed subjects.
  * Metadata: `course_code`, `subject_id`, `subject_name`, `page_number`, `source_filename`, `verification_status`.
- `smart_study_documents` (327 vectors):
  * Strictly private student uploads.
  * Mandatory query allowlist: searches without a valid positive `material_id` fail closed with `[]`.

