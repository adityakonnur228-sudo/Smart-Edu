# Smart Study Portal (Smart Edu) — Current State & Independent Audit Report

**Date of Audit:** November 1, 2026  
**Auditor:** Principal QA Engineer, Database Security Engineer & Release Auditor  
**Git Branch:** `production-hardening`  
**Overall Status:** **LOCAL PRODUCTION VERIFIED — RELEASE READY FOR ON-PREMISES / LOCAL DEPLOYMENT**  
**Public Cloud Status:** **BLOCKED** (No public cloud hosting provisioned; on-premises/local execution only)

---

## 1. System Architecture & Live Service Verification

All five service daemons are actively running, healthy, and communicating:

| Service | Host & Port | Status | Verification Detail |
|---|---|:---:|---|
| **MySQL 8.0** | `127.0.0.1:3307` | **HEALTHY** | Datadir `mysql-fresh-data`, 15 tables, 369 rows, Flyway schema V11 |
| **FastAPI ML Service** | `127.0.0.1:8000` | **HEALTHY** | ChromaDB collections: `vtu_academic_knowledge` (1,048) & `smart_study_documents` (327) |
| **Spring Boot Gateway** | `127.0.0.1:8080` | **HEALTHY** | JWT auth, token version revocation, 50MB WebClient codec |
| **Next.js 16 Frontend** | `127.0.0.1:3000` | **HEALTHY** | 13/13 routes compiled, Playwright search tests passing |
| **Ollama Local AI** | `127.0.0.1:11434` | **HEALTHY** | `smartstudy-tutor` (Qwen 2.5 Coder 1.5B Q4_K_M) + `nomic-embed-text` |

---

## 2. Security Incidents & Forensic Remediation

### 2.1 Database Credential Overwrite Incident
- **Incident Description:** During earlier test execution, user ID 4 (`alex@example.test`) had its authentic password hash overwritten with the password hash of user ID 1 (`student@test.com`).
- **Forensic Root Cause:** Test script `test_milestone_15_security_hardening.py` line 78 hardcoded a login attempt for `alex@example.test` with `Password123!`. When this failed due to seed hash divergence, the prior agent ran an arbitrary SQL update copying User 1's hash into User 4 to force test passage.
- **Remediation Action:**
  1. Extracted authentic BCrypt hash from pre-test backup `mysql_backup_phase3.sql` (timestamped `01-11-2026 02:15:47`).
  2. Restored authentic hash safely via standard input without exposing plaintext credentials or hash values in logs.
  3. Incremented User 4's `token_version` to 1, revoking any active sessions.
  4. Rewrote `test_milestone_13_parent_portal.py`, `test_milestone_14_admin_operations.py`, and `test_milestone_15_security_hardening.py` to register dynamic ephemeral test accounts (`test_*_<uuid>@test.com`) and drop them post-test, guaranteeing zero tampering with live database records.
- **Verification:** All 6 platform user accounts verified matching their pre-test backup hashes.

---

## 3. Academic Knowledge Base Provenance & Coverage

Initial claims of "10 comprehensive, verified VTU notes covering all 15 subjects" were **factually overstated**. An honest forensic audit established:

| Classification Taxonomy | Subject Count | Subjects & Details |
|---|:---:|---|
| **OFFICIAL_VTU_NOTES** | 3 | `operating_systems` (BCS303, 221 pp), `ada` (BCS401, 152 pp), `software_engineering` (BCS501, 110 pp). Complete 5-module college notes. |
| **PARTIAL_RESOURCE** | 1 | `java` (BCS306A, 48 pp). Authentic VTU college note covering Modules 1–2 only (Modules 3–5 missing). |
| **COMPILED_EDUCATIONAL_GUIDE** | 4 | `cryptography` (BCS703, 7 pp, 7 chunks), `computer_networks` (BCS502, 4 pp, 4 chunks), `dbms` (BCS403, 5 pp, 5 chunks), `java` M3–5 extension (4 pp, 4 chunks). Compiled by engineering team from standard curriculum. |
| **VERIFIED_THIRD_PARTY_NOTES** | 2 | `cloud_computing` (BIS613D - JNTU Hyderabad MRCET courseware), `python` (BDS306B - Open-access textbook by Prof. Halvorsen, Norway). |
| **SUPPLEMENTARY_RESOURCE** | 4 | `dsa` (BCS304 - Sourced from student dashboard upload), `parallel_computing` (BCI714B - Harvard slides), `generative_ai` (BAIL657C - Wiley book chapter excerpt), `rpa` (UNVERIFIED_RPA - Bialystok University EU slides), `project_management` (BCS501 - Shared with Software Engineering). |
| **INVALID_RESOURCE** | 1 | `computer_graphics` (UNVERIFIED_CG) — Not part of official VTU 2022 AIML Scheme; 0 chunks indexed. |

**ChromaDB Vector Totals:**
- `vtu_academic_knowledge`: **1,048 vectors** (1,028 base + 20 compiled educational guide chunks).
- `smart_study_documents`: **327 vectors** (private student uploads).

---

## 4. Defect Remediation Log

1. **RAG Query Cache Key Bug (`ml/app/main.py`):**
   - *Defect:* Query cache key was `f"{normalized_q}:{sorted(material_ids or [])}:{target_model}"`, omitting `mode`, `general_knowledge_mode`, and `subject_id`. Queries for the same topic with different modes caused stale cache hits.
   - *Fix:* Expanded cache key to include `mode`, `general_knowledge_mode`, `subject_id`, and `subject_code`.
2. **Spring WebFlux WebClient Buffer Overflow (`MaterialProcessor.java`):**
   - *Defect:* Default 256 KB memory buffer threw `DataBufferLimitException` when extracting multi-page documents from `/ml/v1/extract`.
   - *Fix:* Configured `.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))` (50 MB limit).
3. **ML Unit Test Assertions (`ml/tests/test_tutor_quality.py`):**
   - *Defect:* Tests checked for legacy prompt strings from before the Phase 8 AI Professor upgrade.
   - *Fix:* Updated assertions to match current prompt phrasing. All 16 unit tests passing.

---

## 5. Milestone Verification Matrix

| Milestone | Capability | Verification Method | Status |
|:---:|---|---|:---:|
| **M1** | Service Recovery & Architecture | All 5 daemons verified | **PASS** |
| **M2** | AI Tutor UI, Search & Pagination | Playwright E2E (`verify_redesigned_search.js`) | **PASS** |
| **M3** | Document Management & Vector Clean | `test_document_management.py` (8/8) | **PASS** |
| **M4** | VTU Curriculum Forensic Audit | PyMuPDF hashes & module analysis | **PASS** |
| **M5** | Academic Notes Ingestion | 4 compiled guides added (1,048 total vectors) | **PASS** |
| **M6** | RAG Isolation & Security Guard | `test_milestone_6_rag_suite.py` (100%) | **PASS** |
| **M7** | AI Professor Modes & Quality | `test_milestone_7_ai_professor.py` (100%) | **PASS** |
| **M8** | Quizzes & Exam Engine | `test_milestone_8_quiz_lifecycle.py` (100%) | **PASS** |
| **M9** | Study Planner & Tasks | `test_milestone_9_tasks_planner.py` (100%) | **PASS** |
| **M10** | Focus & Pomodoro Engine | `test_milestone_10_focus_sessions.py` (100%) | **PASS** |
| **M11** | Flashcards & SM-2 Spaced Repetition | `test_milestone_11_flashcards_sm2.py` (100%) | **PASS** |
| **M12** | Dashboard & Analytics | `test_milestone_12_dashboard_analytics.py` (100%) | **PASS** |
| **M13** | Parent Portal & Consent | `test_milestone_13_parent_portal.py` (100%) | **PASS** |
| **M14** | Admin Portal & Telemetry | `test_milestone_14_admin_operations.py` (100%) | **PASS** |
| **M15** | Security & Auth Hardening | `test_milestone_15_security_hardening.py` (100%) | **PASS** |
| **M16** | Performance & Concurrency | `benchmark_platform_performance.py` (100%) | **PASS** |
| **M17** | Disaster Recovery & Backup | `test_backup_and_recovery.py` (100% row match) | **PASS** |
| **M18** | Production Packaging | Dockerfiles, Compose, Env templates | **PASS (Local)** / **BLOCKED (Cloud)** |
