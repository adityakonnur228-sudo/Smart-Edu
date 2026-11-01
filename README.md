# Smart Study Portal (Smart Edu)

An enterprise-grade, full-stack educational operating system designed for self-directed learning. Smart Study Portal transforms unstructured academic materials (PDFs, DOCX, PPTX, XLSX, TXT) into a closed-loop active learning rhythm featuring local Retrieval-Augmented Generation (RAG), SuperMemo SM-2 spaced repetition, distraction-free cognitive focus tracking, dynamic quizzes with factual grounding, and dedicated privacy-preserving parent and administrative portals.

[![Java](https://img.shields.io/badge/Java-21%20%7C%2025-orange.svg?logo=openjdk)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.2-brightgreen.svg?logo=springboot)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.0%20(Turbopack)-black.svg?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.0-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-yellow.svg?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%20%7C%208.4-4479A1.svg?logo=mysql)](https://www.mysql.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-white.svg?logo=ollama)](https://ollama.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Store-red.svg)](https://www.trychroma.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0.0-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📑 Table of Contents

1. [Executive Summary & Educational Philosophy](#1-executive-summary--educational-philosophy)
2. [What We Built (Current Build Status & Feature Matrix)](#2-what-we-built-current-build-status--feature-matrix)
3. [Technology Stack & Architectural Dependencies](#3-technology-stack--architectural-dependencies)
4. [System Architecture & Topologies](#4-system-architecture--topologies)
5. [In-Depth Module Breakdown ("What We Done")](#5-in-depth-module-breakdown-what-we-done)
   - [5.1 Security, Authentication & User Sessions](#51-security-authentication--user-sessions)
   - [5.2 Document Ingestion & Asynchronous Extraction Engine](#52-document-ingestion--asynchronous-extraction-engine)
   - [5.3 Local AI, ChromaDB Vector Store & Grounded RAG](#53-local-ai-chromadb-vector-store--grounded-rag)
   - [5.4 Intelligent Study Planner & Daily Minute Allocation](#54-intelligent-study-planner--daily-minute-allocation)
   - [5.5 Drift-Free Cognitive Focus Mode (Stopwatch & Pomodoro)](#55-drift-free-cognitive-focus-mode-stopwatch--pomodoro)
   - [5.6 Factual Entity Quizzes & Instant Evaluation](#56-factual-entity-quizzes--instant-evaluation)
   - [5.7 Spaced Repetition Flashcards (SuperMemo SM-2 Engine)](#57-spaced-repetition-flashcards-supermemo-sm-2-engine)
   - [5.8 Source-Grounded AI Tutor (Conversational RAG)](#58-source-grounded-ai-tutor-conversational-rag)
   - [5.9 Progress Analytics & Cognitive Metrics](#59-progress-analytics--cognitive-metrics)
   - [5.10 Privacy-Preserving Parent Portal](#510-privacy-preserving-parent-portal)
   - [5.11 Admin Portal & JVM Runtime Diagnostics](#511-admin-portal--jvm-runtime-diagnostics)
   - [5.12 3D Visual Computing & UI System](#512-3d-visual-computing--ui-system)
6. [Database Schema & Flyway Evolution (V1 through V11)](#6-database-schema--flyway-evolution-v1-through-v11)
7. [Comprehensive REST API Reference](#7-comprehensive-rest-api-reference)
8. [Hardware Prerequisites & Environment Setup](#8-hardware-prerequisites--environment-setup)
9. [How to Run the Entire Project](#9-how-to-run-the-entire-project)
   - [Method 1: One-Click Startup Script (PowerShell)](#method-1-one-click-startup-script-powershell)
   - [Method 2: Multi-Terminal Individual Service Launch](#method-2-multi-terminal-individual-service-launch)
   - [Method 3: Docker Compose Containerization](#method-3-docker-compose-containerization)
10. [Default Seeded Credentials & User Roles](#10-default-seeded-credentials--user-roles)
11. [Testing, Benchmarking & Verification Suite](#11-testing-benchmarking--verification-suite)
12. [Tavily Live Web Research Configuration](#12-tavily-live-web-research-configuration)
13. [Target Cloud Deployment Architecture (Vercel + Railway)](#13-target-cloud-deployment-architecture-vercel--railway)
14. [Operational Invariants & Known Boundaries](#14-operational-invariants--known-boundaries)
15. [Repository File Sitemap](#15-repository-file-sitemap)

---

## 1. Executive Summary & Educational Philosophy

### The Problem It Solves
Modern learners face continuous cognitive friction throughout self-directed study:
- **Information Overload:** Dense multi-page lecture notes and 100-page textbook PDFs overwhelm students without clear structural breakdowns.
- **The Illusion of Competence:** Passive re-reading creates a false sense of mastery without testing retrieval or retention.
- **Planning Paralysis:** Students lack data-driven guidance on how to allocate fixed daily study minutes across multiple topics.
- **AI Hallucinations:** Generic cloud chatbots invent facts, lack domain context, and fail to cite exact textbook page numbers.
- **Parental Friction:** Guardians lack transparent, non-intrusive visibility into whether study time is consistent and productive.

### The Closed-Loop Active Learning Architecture
Smart Study Portal replaces fragmented tools with a unified active learning loop:

```
               ┌────────────────────────────────────────────────────────┐
               │ 1. INGESTION & PARSING                                 │
               │ Upload PDF / DOCX / PPTX / XLSX / TXT / CSV            │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │ 2. EXTRACTION, TOPIC RANKING & RAG CHUNKING            │
               │ PyMuPDF text stream, [Page X] markers, ChromaDB vector  │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │ 3. ALGORITHMIC SCHEDULING                              │
               │ Daily minute budget allocation & importance ranking     │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │ 4. DRIFT-FREE FOCUS SESSIONS                           │
               │ Active timer sessions mapped to specific study tasks   │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │ 5. ACTIVE RETRIEVAL PRACTICE                           │
               │ Grounded MCQ quizzes & SuperMemo SM-2 flashcard review  │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │ 6. COGNITIVE MEASUREMENT & PARENT INSIGHTS             │
               │ Retention curves, weak-area detection, aggregate stats │
               └────────────────────────────────────────────────────────┘
```

---

## 2. What We Built (Current Build Status & Feature Matrix)

The project is **100% implemented, integrated, and verified**. Every subsystem is fully functional:

| Subsystem | Component / Module | Implementation Status | Test Coverage |
| :--- | :--- | :--- | :--- |
| **Backend API** | User Auth, JWT, BCrypt, Security Filter | **Complete (100%)** | Verified via JUnit & E2E tests |
| **Backend API** | Material Ingestion & Async Pipeline | **Complete (100%)** | Magic byte validation, UUID storage |
| **Backend API** | Task Planner & Minute Allocation | **Complete (100%)** | Optimistic locking, CRUD lifecycle |
| **Backend API** | Focus Timer State Machine | **Complete (100%)** | Drift-free epoch logging, collision handling |
| **Backend API** | Quizzes & Factual Distractor Engine | **Complete (100%)** | Auto-grading, history persistence |
| **Backend API** | Flashcards & SuperMemo SM-2 Engine | **Complete (100%)** | Dynamic ease factors, review logs |
| **Backend API** | Grounded AI Tutor & Chat Histories | **Complete (100%)** | Multi-turn persistence, citation links |
| **Backend API** | Progress Analytics Engine | **Complete (100%)** | 7-day rolling trends, accuracy ratios |
| **Backend API** | Privacy-Preserving Parent Handshake | **Complete (100%)** | Request -> Approve/Reject -> Read-only stats |
| **Backend API** | Admin Telemetry & Role Promotion | **Complete (100%)** | JVM memory, thread pools, user management |
| **ML Engine** | Document Parsers (PDF/DOCX/PPTX/XLSX) | **Complete (100%)** | PyMuPDF, python-docx, openpyxl, python-pptx |
| **ML Engine** | ChromaDB Persistent Vector Store | **Complete (100%)** | Chunking, nomic-embed-text embeddings |
| **ML Engine** | Ollama Local LLM Tutor (`smartstudy-tutor`) | **Complete (100%)** | Qwen 3.5 4B, GPU-accelerated (RTX 3050) |
| **ML Engine** | OpenRouter Cloud LLM Fallback | **Complete (100%)** | NVIDIA Nemotron 3 Ultra 550B free tier |
| **Frontend Web** | Next.js 16 App Router & React 19 UI | **Complete (100%)** | 11 responsive routes, 0 lint/typecheck errors |
| **Frontend Web** | Interactive 3D Visuals (Three.js/R3F) | **Complete (100%)** | Knowledge Core, Zen Sphere, Scroll Scene |
| **Frontend Web** | Dual-Mode Architecture (Live / Preview) | **Complete (100%)** | Seamless fallback to mock dataset if API down |
| **Database** | Flyway Migrations (V1 through V11) | **Complete (100%)** | 14 relational tables, full audit logging |

---

## 3. Technology Stack & Architectural Dependencies

### Frontend Tier (`frontend/`)
- **Core Framework:** Next.js 16.4.0 (Turbopack engine, App Router, React Server & Client Components)
- **UI Engine:** React 19.0.0 & React-DOM 19.0.0
- **Language:** TypeScript 5.7.0 (strict type checking enabled)
- **Styling & Design Tokens:** Tailwind CSS 4.0.0 with custom glassmorphism, glowing badges, and dark/light system themes
- **3D Graphics & Canvas:** Three.js 0.170.0, `@react-three/fiber` 8.18.0, `@react-three/drei` 9.122.0
- **Animation Framework:** Framer Motion 14.2.0
- **State & Server Cache:** TanStack React Query v5
- **Forms & Validation:** React Hook Form 7.49.0, Zod 3.22.0, `@hookform/resolvers`
- **Iconography:** Lucide React 1.47.0 (zero emoji dependencies)
- **Markdown Rendering:** React Markdown 10.1.0, Remark GFM 4.0.1 (supports KaTeX math, tables, checklists)

### Backend API Tier (`backend/`)
- **Core Framework:** Spring Boot 3.4.2 (Spring Framework 6.2.2)
- **Language & Runtime:** Java 21 LTS / Java 25
- **Security:** Spring Security 6.x, BCrypt (strength 12), stateless `SecurityFilterChain`
- **Session Tokens:** JJWT (`io.jsonwebtoken:jjwt-api:0.12.6`, `jjwt-impl`, `jjwt-jackson`)
  - Cryptographically signed HMAC-SHA JWT in `HttpOnly; SameSite=Lax` cookie (`study_session`) with fallback Bearer token header support
- **Persistence & ORM:** Spring Data JPA / Hibernate 6.x
- **Database Migrations:** Flyway Core 10.x & Flyway MySQL
- **Email Communications:** Spring Mail (configured for Mailpit SMTP)
- **Reactive HTTP Client:** Spring WebFlux (`WebClient`) for non-blocking ML communication

### Machine Learning & NLP Tier (`ml/`)
- **Framework:** FastAPI 0.115+ with Starlette ASGI
- **Server:** Uvicorn 0.34+ (async worker threads)
- **Language:** Python 3.11+ / Python 3.14+
- **PDF Extraction:** PyMuPDF (`pymupdf` / `fitz` 1.25+) with high-speed page text streaming and page marker insertion
- **Office Document Parsing:** `python-docx` 1.1+, `openpyxl` 3.1+, `python-pptx` 1.0+
- **Vector Database:** ChromaDB 0.6+ (persistent SQLite-backed HNSW vector index in `ml/chroma_data`)
- **Local LLM Engine:** Ollama 0.40+ running `smartstudy-tutor` (customized Qwen 3.5 4B)
- **Local Embeddings:** `nomic-embed-text:latest` (8192 token context window, 768-dimensional dense embeddings)
- **Cloud LLM Fallback:** OpenRouter API (`nvidia/nemotron-3-ultra-550b-a55b:free`)
- **OCR Support:** Tesseract 5.x integration (configurable flag `OCR_ENABLED=true`)

### Database Tier
- **Database Engine:** MySQL Server 8.0.45 / 8.4 LTS
- **Port:** `3307` (isolated instance via `mysql-fresh-data` to prevent collisions with host MySQL services)
- **Character Set:** `utf8mb4` with `utf8mb4_unicode_ci` collation
- **Schema Management:** 11 versioned Flyway migrations (`V1` to `V11`)

---

## 4. System Architecture & Topologies

```
                          [ Client Web Browser ]
                                     │
                                     ├── (Port 3000) ──> Next.js 16 Web Application
                                     │                   (App Router, React 19, Three.js)
                                     │
                                     └── (HTTP / JSON / Credentials)
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   Spring Boot 3.4 REST API  │  <── Sole Security Gateway
                                  │   Port 8080 (Java 21/25)    │
                                  └──────────────┬──────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼ (JDBC Port 3307)           ▼ (Internal HTTP Port 8000)  ▼ (Local Filesystem)
        ┌─────────────────────────┐  ┌─────────────────────────┐  ┌───────────────────────┐
        │    MySQL 8.0 Server     │  │   FastAPI ML Service    │  │   ./uploads/<UUID>    │
        │ Database: `smart_study` │  │ Python 3.11+ / Uvicorn  │  │ Secure document store │
        │ 14 Relational Tables    │  └───────────┬─────────────┘  └───────────────────────┘
        │ Flyway V1 – V11         │              │
        └─────────────────────────┘              ├─────────────────────────────┐
                                                 ▼ (HTTP Port 11434)           ▼ (Embedded HNSW)
                                     ┌─────────────────────────┐   ┌───────────────────────────┐
                                     │   Ollama Local Server   │   │   ChromaDB Vector Store   │
                                     │ Model: smartstudy-tutor │   │ 320+ Persisted Chunks     │
                                     │ Embed: nomic-embed-text │   │ Cosine Similarity Search  │
                                     └─────────────────────────┘   └───────────────────────────┘
```

### Architectural Safeguards & Decisions

1. **Spring Boot as Single Security Boundary:** The Python ML service is strictly an internal daemon listening only on `127.0.0.1:8000`. It performs no user authentication and has no direct internet exposure. All requests are authenticated, authorized, and rate-limited by Spring Boot before invoking the ML microservice with a shared secret (`ML_INTERNAL_TOKEN`).
2. **HttpOnly Cookie Authentication:** Session tokens are stored in an `HttpOnly; SameSite=Lax` cookie named `study_session`. JavaScript running in the browser cannot read this cookie, eliminating XSS token theft. For mobile or external clients, the backend also honors standard `Authorization: Bearer <token>` headers.
3. **Magic Byte Verification:** File extensions are frequently faked. Spring Boot inspects the file header before writing to disk:
   - PDF: `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`)
   - DOCX / PPTX / XLSX: PK zip signature (`0x50 0x4B 0x03 0x04`)
   - TXT / CSV: Valid UTF-8 byte stream
4. **Dual-Mode Frontend Architecture:** If the backend database is unreachable, the frontend automatically falls back to an offline mock dataset (`demo-data.ts`) with clear UI banners, allowing comprehensive design inspection without booted services.

---

## 5. In-Depth Module Breakdown ("What We Done")

### 5.1 Security, Authentication & User Sessions
- **Password Protection:** BCrypt hashing with a cost factor of 12.
- **Session Revocation:** Each user record includes a `token_version` column. When a user logs out or changes their password, `token_version` is incremented, instantly invalidating all existing JWTs across all active browsers.
- **Account Protection:**
  - Token expiration enforced at 60 minutes.
  - Rate limiting on authentication endpoints (5 attempts per minute).
  - Timezone awareness (defaults to `Asia/Kolkata`).
  - Optimistic locking (`version` column) prevents concurrent edit collisions.

### 5.2 Document Ingestion & Asynchronous Extraction Engine
- **Supported Formats:** PDF, TXT, DOCX, XLSX, PPTX, CSV up to 20 MB.
- **Ingestion Flow:**
  1. File is uploaded via multipart form.
  2. Magic bytes are validated; filename is sanitized; a random UUID storage key is generated.
  3. Binary is streamed into `./uploads/<UUID>`.
  4. Material record is inserted into MySQL with status `PROCESSING`.
  5. Asynchronous background thread (`@Async`) triggers the ML extraction endpoint.
  6. PyMuPDF streams pages, injecting explicit `[Page X]` markers to preserve page-level traceability.
  7. Text is split into semantic chunks (600 target tokens, 80 token overlap).
  8. Material status is updated to `COMPLETED` and chunks are saved to MySQL `material_chunks` and ChromaDB.
  9. Automatic recovery on reboot: An `ApplicationReadyEvent` listener queries for any dangling `PROCESSING` jobs and resubmits them.

### 5.3 Local AI, ChromaDB Vector Store & Grounded RAG
- **Zero Cloud Leakage:** In local mode, documents, queries, and summaries never leave the student's machine.
- **Embedding Model:** `nomic-embed-text:latest` (8192 context window).
- **Inference Model:** `smartstudy-tutor` based on Qwen 3.5 4B, configured via `ml/Modelfile.tutor`:
  - Quantization: Q4_K_M for maximum inference speed on 4GB VRAM (NVIDIA RTX 3050 Laptop).
  - Context size: 8192 tokens.
  - Temperature: 0.3 for factual accuracy and minimal hallucination.
- **ChromaDB Vector Store:** Embedded vector store in `ml/chroma_data` persisting 320+ document chunks across subject materials.
- **Cloud Fallback:** If local Ollama is offline, the system transparently routes requests to OpenRouter's free-tier `nvidia/nemotron-3-ultra-550b-a55b` using the user's or system's API key.

### 5.4 Intelligent Study Planner & Daily Minute Allocation
- **Capacity Calculation:** Multiplies daily study minutes by total planning days.
- **Topic Extraction & Ranking:** Scans all completed student materials, computes term frequencies and concept weights, and ranks topics in descending order of importance.
- **Chunked Slicing:** Breaks large topics into manageable 20 to 35-minute study tasks.
- **Balanced Scheduling:** Round-robin distribution across available days without exceeding the daily minute cap.

### 5.5 Drift-Free Cognitive Focus Mode (Stopwatch & Pomodoro)
- **Anti-Drift Timekeeping:** Instead of relying on client-side `setInterval` (which drifts when tabs are hidden or backgrounded), the server records exact UTC epoch timestamps (`started_at`, `active_since`).
- **Session State Machine:** `ACTIVE` $\rightarrow$ `PAUSED` $\rightarrow$ `RESUMED` $\rightarrow$ `COMPLETED`.
- **Automatic Collision Resolution:** If a student starts a focus session while another is active, the system cleanly auto-closes the stale session and initializes the new one.
- **Visuals:** Renders an interactive 3D Zen Sphere that dynamically pulses with breathing rhythms during active focus.

### 5.6 Factual Entity Quizzes & Instant Evaluation
- **Dual-Generation Engine:**
  1. *Generative Mode:* Prompts local or cloud LLM to create 4-choice questions strictly from retrieved material context.
  2. *Deterministic Mode:* Regex rule-based extraction matching syntactic definitions (`X is defined as Y`, `X refers to Y`).
- **Authentic Distractors:** Incorrect choices are sampled from other definition clauses within the same document, eliminating obvious giveaway options.
- **Evaluation:** Server-side grading prevents inspect-element cheating; returns detailed explanations and logs accuracy percentages.

### 5.7 Spaced Repetition Flashcards (SuperMemo SM-2 Engine)
- **Auto-Extraction:** Creates flashcards from extracted key terms and definitions.
- **Algorithm:** Full implementation of SuperMemo SM-2:
  - Quality score $q \in \{0: \text{Again}, 1: \text{Hard}, 2: \text{Good}, 3: \text{Easy}\}$.
  - Ease Factor update:
    $$\text{EF}_{\text{new}} = \max\left(1.3, \text{EF}_{\text{old}} + (0.1 - (3 - q) \times (0.08 + (3 - q) \times 0.02))\right)$$
  - Intervals: Review 1 $\rightarrow$ 1 day; Review 2 $\rightarrow$ 3 days; Review $n$ $\rightarrow$ $\text{Interval}_{n-1} \times \text{EF}$.
  - Failed cards ($q=0$) reset interval to 1 day and increment the `lapses` counter.
- **Audit Logging:** Every review is logged in `flashcard_reviews` for historical retention tracking.

### 5.8 Source-Grounded AI Tutor (Conversational RAG)
- **Multi-Turn Context:** Complete conversation history is persisted in `tutor_conversations` and `tutor_messages`.
- **Grounded Responses:** User questions trigger vector similarity search against active document chunks in ChromaDB. The top 3–5 excerpts are injected into the prompt context.
- **Exact Citations:** The tutor explicitly references source document names and page numbers (e.g., `[Operating Systems, Page 14]`).

### 5.9 Progress Analytics & Cognitive Metrics
- **Rolling Trends:** Computes 7-day rolling statistics:
  - Total study focus minutes.
  - Task completion percentages.
  - Average quiz accuracy across attempts.
  - Subject-level time distribution.
- **Visual Dashboard:** Rendered via custom SVG Progress Rings, weekly bar graphs, and mastery badges.

### 5.10 Privacy-Preserving Parent Portal
- **The Privacy Dilemma:** Balancing parental oversight with student autonomy and trust.
- **The Handshake Protocol:**
  1. Parent enters student's email to request connection.
  2. A `PENDING` link is created in `parent_student_links`.
  3. Student receives a notification on their dashboard and must explicitly approve the request.
- **Privacy Boundary:** Parents **cannot** read private notes, view uploaded documents, or inspect AI tutor chats. They have read-only access to aggregate metrics: total study hours, tasks completed, and quiz accuracy.

### 5.11 Admin Portal & JVM Runtime Diagnostics
- **Platform Telemetry:**
  - Real-time JVM memory stats: Used Heap, Committed Heap, Max Heap.
  - Active thread counts and system uptime.
  - Database row counts: Total Users, Materials Processed, Quizzes Taken, Tasks Completed.
- **User Role Management:** Admins can promote or demote user roles (`STUDENT`, `PARENT`, `ADMIN`) and toggle account activation.

### 5.12 3D Visual Computing & UI System
- **Three.js & React Three Fiber:** Built-in interactive 3D elements:
  - `Hero3DBackground`: Floating particle field responding to mouse pointer movements.
  - `KnowledgeCore`: Rotating multi-layered neural orb representing the student's personal knowledge base.
  - `ZenSphere`: Calming, slow-pulsing 3D sphere designed to anchor focus during study sessions.
- **Accessibility:** High contrast ratios, full keyboard navigability, screen-reader labels, and WCAG AA compliance.

---

## 6. Database Schema & Flyway Evolution (V1 through V11)

All database schema evolutions are managed via Flyway migrations in `backend/src/main/resources/db/migration/`:

| Version | Migration File | Description & Core Changes |
| :--- | :--- | :--- |
| **V1** | `V1__initial_schema.sql` | Baseline tables: `users` and `materials` |
| **V2** | `V2__material_processing_results.sql` | Added `summary`, `topics_json`, `keywords_json`, `processing_error` |
| **V3** | `V3__study_plans_and_tasks.sql` | Added `study_plans` and `study_tasks` tables with FK relations |
| **V4** | `V4__focus_sessions.sql` | Added `focus_sessions` table with duration tracking and timestamps |
| **V5** | `V5__quizzes_and_attempts.sql` | Added `quizzes` and `quiz_attempts` with `questions_json` |
| **V6** | `V6__flashcards.sql` | Added `flashcards` with SM-2 ease factor, interval, and next review |
| **V7** | `V7__tutor_conversations.sql` | Added `tutor_conversations` and `tutor_messages` with citations |
| **V8** | `V8__parent_student_links.sql` | Added `parent_student_links` with approval status handshake |
| **V9** | `V9__production_hardening_schema.sql` | Converted text fields to `LONGTEXT`, added `timezone`, `token_version`, `material_chunks` table, `flashcard_reviews` table, `audit_log` table, indexes, and optimistic locking `version` |
| **V10** | `V10__add_flashcards_lapses.sql` | Added `lapses` column to `flashcards` table for memory retention tracking |
| **V11** | `V11__fix_password_reset_token_hash.sql` | Adjusted `password_reset_token_hash` column to `VARCHAR(64)` |

### Entity-Relationship Diagram

```
┌──────────────┐       1:N       ┌────────────────────────┐       1:N       ┌──────────────────────┐
│    users     ├────────────────>│       materials        ├────────────────>│   material_chunks    │
│  (Auth & PK) │                 │ (Uploads & Extracted)  │                 │  (Vectors & Pages)   │
└──────┬───────┘                 └───────────┬────────────┘                 └──────────────────────┘
       │                                     │
       │ 1:N                                 │ 1:N
       ├────────────────>┌───────────────────┴────┐
       │                 │        quizzes         │
       │                 │  (MCQ Question Sets)   │
       │                 └───────────┬────────────┘
       │                             │
       │ 1:N                         │ 1:N
       ├────────────────────────────>│  quiz_attempts     │
       │                             │  (Student Scores)  │
       │                             └────────────────────┘
       │ 1:N
       ├────────────────>┌────────────────────────┐
       │                 │      study_plans       │
       │                 │ (Date-Bounded Budgets) │
       │                 └───────────┬────────────┘
       │                             │ 1:N
       │                             ▼
       │ 1:N                     ┌────────────────────────┐
       ├────────────────────────>│      study_tasks       │
       │                         │ (25-Min Study Slices)  │
       │                         └───────────┬────────────┘
       │                                     │ 1:N
       │ 1:N                                 │
       ├────────────────>┌───────────────────┴────┐
       │                 │     focus_sessions     │
       │                 │ (Epoch Time Tracking)  │
       │                 └────────────────────────┘
       │ 1:N
       ├────────────────>┌────────────────────────┐       1:N       ┌──────────────────────┐
       │                 │       flashcards       ├────────────────>│  flashcard_reviews   │
       │                 │   (SuperMemo SM-2)     │                 │ (Retention History)  │
       │                 └────────────────────────┘                 └──────────────────────┘
       │ 1:N
       ├────────────────>┌────────────────────────┐       1:N       ┌──────────────────────┐
       │                 │  tutor_conversations   ├────────────────>│    tutor_messages    │
       │                 │   (Active Dialogues)   │                 │ (Q&A with Citations) │
       │                 └────────────────────────┘                 └──────────────────────┘
       │ 1:N
       ├────────────────>┌────────────────────────┐
       │                 │  parent_student_links  │
       │                 │  (Privacy Handshake)   │
       │                 └────────────────────────┘
       │ 1:N
       └────────────────>┌────────────────────────┐
                         │       audit_log        │
                         │ (Platform Activity Log)│
                         └────────────────────────┘
```

---

## 7. Comprehensive REST API Reference

Base URL: `http://localhost:8080/api/v1`

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new user (`STUDENT` or `PARENT`) |
| `POST` | `/auth/login` | Public | Authenticate user; sets `study_session` cookie and returns JWT |
| `POST` | `/auth/logout` | Authenticated | Clears session cookie and invalidates session token |
| `GET` | `/auth/me` | Authenticated | Returns currently authenticated user profile |
| `POST` | `/auth/change-password` | Authenticated | Updates password and increments `token_version` |

### Materials & Ingestion (`/materials`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/materials` | Student | Upload multipart document (`file`, `title`) |
| `GET` | `/materials` | Student | List all uploaded materials for current student |
| `GET` | `/materials/{id}` | Student | Get material detail, extracted summary, and topics |
| `POST` | `/materials/{id}/retry` | Student | Re-trigger failed extraction job |
| `DELETE` | `/materials/{id}` | Student | Delete material and remove physical file from disk |

### Study Planning & Tasks (`/plans` & `/tasks`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/plans/generate` | Student | Generate study plan based on daily minute budget |
| `GET` | `/tasks` | Student | List scheduled tasks (filterable by date/status) |
| `POST` | `/tasks` | Student | Create manual study task |
| `PATCH` | `/tasks/{id}/toggle` | Student | Toggle task between `PENDING` and `COMPLETED` |
| `POST` | `/tasks/{id}/complete` | Student | Mark task complete |
| `DELETE` | `/tasks/{id}` | Student | Delete study task |

### Focus Mode (`/focus`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/focus/sessions` | Student | Start new focus session (auto-closes stale sessions) |
| `GET` | `/focus/sessions/active`| Student | Get current active focus timer state |
| `PATCH` | `/focus/sessions/{id}/pause` | Student | Pause active focus session |
| `PATCH` | `/focus/sessions/{id}/resume` | Student | Resume paused focus session |
| `POST` | `/focus/sessions/{id}/finish` | Student | Finalize focus session and log duration |

### Quizzes (`/quizzes`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/quizzes/generate` | Student | Generate quiz from material or topic (`topic`, `count`) |
| `GET` | `/quizzes` | Student | List all quizzes created by student |
| `GET` | `/quizzes/{id}` | Student | Fetch quiz questions (options, text, source reference) |
| `POST` | `/quizzes/{id}/attempt` | Student | Submit answer selections and receive scored evaluation |

### Flashcards & Spaced Repetition (`/flashcards`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/flashcards/generate` | Student | Auto-generate flashcards from material |
| `GET` | `/flashcards/due` | Student | Get cards due for review today ($\text{next\_review} \le \text{today}$) |
| `POST` | `/flashcards/{id}/review` | Student | Submit review rating ($q \in 0..3$) and calculate SM-2 interval |
| `GET` | `/flashcards/stats` | Student | Get flashcard retention and lapse counts |

### AI Tutor (`/tutor`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tutor/ask` | Student | Ask question with RAG grounding and citation retrieval |
| `GET` | `/tutor/conversations` | Student | List previous tutor conversations |
| `GET` | `/tutor/conversations/{id}` | Student | Fetch message history and citation links for a conversation |

### Progress Analytics (`/progress`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/progress/overview` | Student | Returns total study minutes, task %, and quiz accuracy |
| `GET` | `/progress/trends` | Student | 7-day rolling arrays for focus hours, tasks, and accuracy |

### Parent Portal (`/parents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/parents/link-request` | Parent | Send link request to student by email |
| `GET` | `/parents/children` | Parent | List connected students with approved status |
| `GET` | `/parents/children/{id}/progress` | Parent | View read-only progress analytics for approved student |
| `POST` | `/parents/requests/{id}/approve` | Student | Approve incoming parent connection request |
| `POST` | `/parents/requests/{id}/reject` | Student | Reject or revoke parent connection request |

### Admin Console (`/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/system` | Admin | Telemetry, JVM heap, thread count, system uptime |
| `GET` | `/admin/users` | Admin | List all registered user accounts |
| `PATCH` | `/admin/users/{id}/role` | Admin | Promote or change user role (`STUDENT`, `PARENT`, `ADMIN`) |

### Machine Learning Engine Endpoints (`http://127.0.0.1:8000`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ml/v1/health` | Health check reporting Ollama connection and ChromaDB chunk count |
| `POST` | `/ml/v1/extract` | Extract clean text from PDF, DOCX, XLSX, PPTX with page markers |
| `POST` | `/ml/v1/summarize` | Generate draft extractive/abstractive summary |
| `POST` | `/ml/v1/topics` | Detect key conceptual topics and importance weights |
| `POST` | `/ml/v1/keywords` | Frequency and TF-IDF keyword extraction |
| `POST` | `/ml/v1/questions` | Generate 4-choice questions with grounded distractors |
| `POST` | `/ml/v1/flashcards` | Generate front/back flashcards from definition patterns |
| `POST` | `/ml/v1/semantic-search` | Vector similarity search returning ranked text chunks |
| `POST` | `/ml/v1/tutor-stream` | Streaming chat completion with RAG context injection |

---

## 8. Hardware Prerequisites & Environment Setup

### Minimum Hardware
- **Operating System:** Windows 10/11 64-bit, macOS, or Ubuntu 22.04+
- **CPU:** Quad-core 2.5 GHz+
- **System RAM:** 16 GB DDR4 (32 GB recommended for heavy RAG workloads)
- **GPU (for Local AI):** NVIDIA GPU with 4GB+ VRAM (RTX 3050 Laptop or higher) with CUDA support
- **Free Disk Space:** 15 GB (for Ollama model weights, MySQL database, and ChromaDB)

### Required Software
| Tool | Minimum Version | Tested Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.9.0+` | `v26.12.1` | `node -v` |
| **npm** | `v10.0.0+` | `v11.20.0` | `npm -v` |
| **Java JDK** | `21 LTS` | `25.0.2 LTS` | `java -version` |
| **Apache Maven** | `3.9.0+` | `3.9.6` | `mvn -v` |
| **Python** | `3.11.0+` | `3.15.2` | `python --version` |
| **MySQL Server** | `8.0+` | `8.0.45` | `mysqld --version` |
| **Ollama** | `0.3.0+` | `0.40.12` | `ollama --version` |

### Setting Up Local AI Models
Open PowerShell and pull the required models:

```powershell
# 1. Download base Qwen 3.5 4B model (~3.5 GB)
ollama pull qwen3.5:4b

# 2. Build custom Smart Study tutor persona and inference defaults
ollama create smartstudy-tutor -f ml/Modelfile.tutor

# 3. Download dense embedding model (~274 MB)
ollama pull nomic-embed-text
```

---

## 9. How to Run the Entire Project

### Method 1: One-Click Startup Script (PowerShell)

Start the stack with a single command from the project root:

```powershell
.\run-all.ps1
```

The script will automatically detect port occupancy and launch:
1. **Ollama Server** on `127.0.0.1:11434`
2. **Dedicated MySQL Server** on port `3307` (using `mysql-fresh-data`)
3. **FastAPI ML Engine** on port `8000` (using `.venv`)
4. **Spring Boot Backend** on port `8080`
5. **Next.js Web Application** on port `3000`

To gracefully shut down all running services:
```powershell
.\stop-all.ps1
```

---

### Method 2: Multi-Terminal Individual Service Launch

If you prefer starting each service manually in its own dedicated terminal:

#### Terminal 1 — Ollama Server
```powershell
ollama serve
```

#### Terminal 2 — MySQL Server (Port 3307)
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" `
  --datadir="D:\Downloads\Smart Edu\mysql-fresh-data" `
  --port=3307 --mysqlx=0 --bind-address=127.0.0.1 `
  --shared-memory=OFF --named-pipe=OFF --console
```

#### Terminal 3 — FastAPI ML Engine (Port 8000)
```powershell
Set-Location "D:\Downloads\Smart Edu\ml"
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Health Check: [http://localhost:8000/ml/v1/health](http://localhost:8000/ml/v1/health)

#### Terminal 4 — Spring Boot Backend API (Port 8080)
```powershell
Set-Location "D:\Downloads\Smart Edu\backend"
java -jar target\smart-study-api-0.1.0.jar --spring.profiles.active=local
```
- REST API Base: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

#### Terminal 5 — Next.js Frontend (Port 3000)
```powershell
Set-Location "D:\Downloads\Smart Edu\frontend"
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

### Method 3: Docker Compose Containerization

If you have Docker Desktop installed:

```powershell
# Copy environment configuration
Copy-Item .env.example .env

# Build and start all containers
docker compose up --build
```

---

## 10. Default Seeded Credentials & User Roles

The database is pre-seeded with active test accounts (`app.dev-seed-enabled=true`):

| Role | Email Address | Password | Accessible Features & Pages |
| :--- | :--- | :--- | :--- |
| **Student** | `student@test.com` | `Password123!` | Dashboard (`/dashboard`), Notes Upload, Study Plan (`/tasks`), Focus Mode (`/focus`), Quizzes (`/quizzes`), Flashcards (`/flashcards`), AI Tutor (`/ai-tutor`), Analytics (`/analytics`) |
| **Parent** | `parent@test.com` | `Password123!` | Parent Portal (`/parent`), Connected Student Progress, Study Consistency Trends |
| **Admin** | `admin@test.com` | `Password123!` | Admin Portal (`/admin`), JVM Diagnostics, Server Telemetry, User Role Elevation |

*Alternative demo accounts:*
- Student: `alex@example.test` / `password123`
- Parent: `jordan@example.test` / `password123`
- Admin: `admin@example.test` / `admin123`

---

## 11. Testing, Benchmarking & Verification Suite

### Automated 9-Suite End-to-End System Test

Run the end-to-end integration test runner to verify inter-service communication across the live stack:

```powershell
& ".\ml\.venv\Scripts\python.exe" e2e_test.py
```

### Verified Test Suite Output:
```text
========================================
STARTING FULL END-TO-END SYSTEM TEST
========================================
[PASS] 1. ML Engine Health Endpoint
[PASS] 2. Student Authentication (Login & Session Cookie)
[PASS] 3. Quiz Generation by Topic & Attempt Evaluation (Score: 3/3, 100%)
[PASS] 4. Flashcard Generation & SM-2 Spaced Repetition Review
[PASS] 5. Study Tasks CRUD Lifecycle (Create -> Complete -> Delete)
[PASS] 6. Focus Mode Timer Lifecycle (Start -> Pause -> Resume -> Finish)
[PASS] 7. AI Tutor (ChatGPT Mode / NLP Query)
[PASS] 8. Parent Portal (Children linked & live progress)
[PASS] 9. Admin Portal (Telemetry, JVM diagnostics & user management)
========================================
ALL 9 CRITICAL E2E INTEGRATION SUITES PASSED!
========================================
```

### Additional Test Suites
- **Local AI & GPU Diagnostic Suite:**
  ```powershell
  & ".\ml\.venv\Scripts\python.exe" test_local_ai_suite.py
  ```
- **Backend JUnit Tests:**
  ```powershell
  Set-Location backend; mvn test
  ```
- **Frontend Code Quality & Type Audits:**
  ```powershell
  Set-Location frontend; npm run lint; npm run typecheck
  ```

---

---

## 12. Tavily Live Web Research Configuration

For the **Live Web Research** quiz mode, Smart Study Portal uses the Tavily Search API to ground generated questions in authoritative real-time facts with source citations:

```env
# Configured in ml/.env or server environment
TAVILY_API_KEY=tvly-YOUR_KEY_HERE
TAVILY_DAILY_CREDIT_BUDGET=50
TAVILY_CACHE_TTL_MINUTES=360
TAVILY_MAX_STUDENT_DAILY_SEARCHES=20
```

### Safety & Budget Guardrails:
- **Daily Budget Cap:** When the 50-credit daily budget is reached, external queries are blocked and fall back to local academic knowledge.
- **Deduplication Cache:** Cached queries consume 0 credits for 6 hours (`TAVILY_CACHE_TTL_MINUTES=360`).
- **Student Throttling:** Strict per-student rate limiting (20 searches/day).
- **Graceful Degradation:** If the key is missing or quota is exhausted, quiz generation automatically falls back to encyclopedic or syllabus definitions without crashing.

---

## 13. Target Cloud Deployment Architecture (Vercel + Railway)

Smart Study Portal is fully architected for production deployment across:

| Tier | Platform | Build Mechanism | Port / Endpoint | Storage / Persistence |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | `npm run build` (Turbopack) | HTTPS Edge | Stateless (Root: `frontend/`) |
| **Backend API** | **Railway** | Multi-stage Dockerfile (JRE 21) | `${PORT:-8080}` | Railway Volume `/data/uploads` or S3 |
| **ML Engine** | **Railway** | Multi-stage Dockerfile (Py3.12) | `${PORT:-8000}` | Railway Volume `/data/chroma` |
| **Database** | **Railway** | Managed MySQL 8.0 Plugin | Port 3306 | Persistent Managed Disk |
| **AI Inference** | **GPU Host** | Dedicated RunPod / VPS / Modal | Port 11434 / HTTPS | `smartstudy-tutor` + `nomic-embed-text` |

Refer to [docs/VERCEL_DEPLOYMENT_GUIDE.md](docs/VERCEL_DEPLOYMENT_GUIDE.md) and [docs/PRODUCTION_ENVIRONMENT_VARIABLES.md](docs/PRODUCTION_ENVIRONMENT_VARIABLES.md) for step-by-step setup and variable references.

---

## 14. Operational Invariants & Known Boundaries

1. **Student Tenant Isolation:** Students can only access, query, or delete their own uploaded documents and focus sessions.
2. **Honest Attribution:** Explanations and quizzes are grounded in actual retrieved chunks. If no evidence exists, the model explicitly declines to hallucinate facts.
3. **Drift-Free Stopwatch:** Time is calculated using authoritative database timestamps (`started_at`, `active_since`, `ended_at`) rather than trusting unverified browser counters.
4. **Zero Frontend Secrets:** No private keys, database passwords, or signing tokens are ever prefixed with `NEXT_PUBLIC_`.

---

## 15. Repository File Sitemap

```text
Smart-Edu/
├── backend/                                # Spring Boot 3.4.2 REST API
│   ├── src/main/java/edu/smartstudy/
│   │   ├── admin/                          # Admin telemetry & user role management
│   │   ├── auth/                           # Registration, login, logout, password reset
│   │   ├── dev/                            # DevDataSeeder (pre-configured test accounts)
│   │   ├── flashcards/                     # SuperMemo SM-2 flashcard generator & review
│   │   ├── focus/                          # Focus session state machine & timer tracking
│   │   ├── material/                       # Multipart document ingestion & async processor
│   │   ├── parent/                         # Parent-student link handshake & progress view
│   │   ├── planning/                       # Study plan scheduling & task management
│   │   ├── progress/                       # 7-day rolling analytics calculator
│   │   ├── quiz/                           # Quiz generator, distractor builder & grading
│   │   ├── security/                       # SecurityConfig, JwtFilter, TokenService
│   │   ├── tutor/                          # Conversational tutor persistence & RAG query
│   │   └── user/                           # User entity, repository, and role enum
│   ├── src/main/resources/
│   │   ├── db/migration/                   # Flyway schema migrations (V1 to V11)
│   │   ├── application.yml                 # Master application configuration
│   │   └── application-local.properties    # Local development datasource overrides
│   └── pom.xml                             # Maven build configuration
│
├── frontend/                               # Next.js 16 Web Application
│   ├── src/app/
│   │   ├── admin/                          # Admin portal page
│   │   ├── ai-tutor/                       # Source-grounded AI tutor chat page
│   │   ├── analytics/                      # Progress charts & cognitive metrics
│   │   ├── dashboard/                      # Student dashboard & note upload dropzone
│   │   ├── focus/                          # Focus mode timer & 3D Zen Sphere
│   │   ├── login/ & register/              # Authentication pages
│   │   ├── parent/                         # Parent portal & student progress viewer
│   │   ├── quizzes/                        # Dynamic quiz generator & attempt arena
│   │   ├── tasks/                          # Study planner & daily budget manager
│   │   ├── demo-data.ts                    # Offline preview mode mock dataset
│   │   ├── layout.tsx & navbar.tsx         # Responsive navigation & global layout
│   │   └── page.tsx                        # Apple-inspired landing page
│   ├── src/components/
│   │   ├── 3d/                             # Three.js / React Three Fiber visual scenes
│   │   └── ui/                             # Buttons, modal dialogs, cards, progress rings
│   ├── package.json                        # Node dependencies
│   └── tsconfig.json                       # TypeScript compiler options
│
├── ml/                                     # FastAPI NLP & Local AI Worker
│   ├── app/
│   │   ├── main.py                         # Document parsers, chunking, RAG, endpoints
│   │   ├── ollama_client.py                # Async Ollama client with fallback logic
│   │   └── vector_store.py                 # ChromaDB HNSW persistent vector index
│   ├── chroma_data/                        # Persisted ChromaDB embeddings & chunks
│   ├── Modelfile.tutor                     # Ollama model definition for smartstudy-tutor
│   └── requirements.txt                    # Python library dependencies
│
├── mysql-fresh-data/                       # Local MySQL 8.0 data directory (Port 3307)
├── docs/                                   # Architectural specs & design guides
├── e2e_test.py                             # 9-suite automated integration test runner
├── run-all.ps1                             # Unified one-click startup script (PowerShell)
├── stop-all.ps1                            # Unified shutdown script (PowerShell)
├── docker-compose.yml                      # Containerization topology
├── .env                                    # Active environment configuration
└── README.md                               # Project documentation & master manual
```

---

<p align="center">
  <b>Smart Study Portal</b> — Engineered for focused, factual, and distraction-free learning.
</p>
