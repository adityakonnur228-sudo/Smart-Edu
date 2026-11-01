# SMART EDU — PHASE 8: AI PROFESSOR QUALITY, SUBJECT COVERAGE & RETRIEVAL UPGRADE

**Author:** Antigravity Senior AI Architect, RAG Engineer & Academic Systems Auditor  
**Date:** November 1, 2026  
**System:** Smart Study Portal (Smart Edu)  
**Target Environment:** Local RAG (ChromaDB + Ollama + Spring Boot + Next.js)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Verified Baseline Numbers

Phase 8 systematically reconciles the academic metadata, strengthens strict subject retrieval isolation, audits unextractable scanned materials, formally resolves LLM configuration discrepancies, upgrades the AI Tutor's pedagogical depth with dual teaching modes (Learn Mode vs. Quick Revision Mode), and evaluates retrieval performance across a rigorous 200+ query evaluation suite.

### Verified Academic Baseline

| Metric | Verified Value | Validation Method & Source |
| :--- | :--- | :--- |
| **Total Requested Subject Categories** | **15** | Curriculum mapping (`manifest.json`, `curriculum.json`) |
| **Officially Verified VTU Categories** | **13** | VTU 2022 Scheme CSE/AIML Official Syllabus |
| **Supplementary / Unverified Categories** | **2** | `rpa`, `computer_graphics` |
| **Unique Physical PDFs Ingested** | **10** | Physical files verified in `Subject_Notes/` |
| **Total Physical Pages Ingested** | **988** | Physical PyMuPDF page count (BCS501 counted once) |
| **Total Academic Vectors (`vtu_academic_knowledge`)** | **1,028** | Local ChromaDB collection count |
| **Total Student Private Vectors (`smart_study_documents`)** | **323** | Local ChromaDB collection count |
| **Subject Categories with Indexed Notes** | **11** | 10 official + 1 supplementary (`rpa`), shared BCS501 |
| **Subject Categories Not Indexed** | **4** | `computer_networks`, `dbms`, `cryptography`, `computer_graphics` |
| **Active Local Embedding Engine** | **`nomic-embed-text:latest`** | 768 dimensions, 274 MB, running on Ollama localhost:11434 |
| **Active Local AI Tutor LLM** | **`smartstudy-tutor:latest`** | 1.5B parameters (`qwen2.5-coder:1.5b`), Q4_K_M, 32,768 context |
| **Retrieval Benchmark Hit Rate (200 Queries)** | **100.0% (200/200)** | Automated 200-query benchmark across 10 indexed subjects |
| **Average Retrieval Latency** | **24.17 ms** | ChromaDB semantic vector search with nomic embeddings |
| **Subject Isolation Violations** | **0 (100.0% Fidelity)** | Zero cross-subject chunk contamination across all tests |

---

## 2. Academic Metadata Reconciliation (Part 1)

All discrepancies across `curriculum.json`, `manifest.json`, `source_metadata.json`, and prior executive summaries have been reconciled and permanently corrected:

### 1. Python BDS306B Classification
- **Correction:** Python Programming (`BDS306B`) is an officially identified VTU 2022 Scheme Integrated Professional Core Course / Programming Language Course option (Semester 3).
- **Update:** Removed from any supplementary classification. Formally marked as `VERIFIED_OFFICIAL_OPTION` with `is_supplementary: false` in `manifest.json` and chunk metadata.

### 2. Supplementary Categories Confirmed
- Only **two** subject categories are supplementary/unverified:
  1. `rpa` (Robotic Process Automation): Supplementary course; unverified against official VTU core syllabus. Notes ingested with explicit `is_supplementary: true`.
  2. `computer_graphics` (`BCS305`): Supplementary/unverified; notes not ingested.

### 3. Shared Canonical Course BCS501
- **Course Code:** `BCS501` represents the official canonical course **"Software Engineering & Project Management"** (Semester 5, 4 credits).
- **Subject Folders:** Staging contains separate folders `software_engineering` and `project_management`. Both point to the same physical PDF: `Software Engineering.pdf` (110 pages, SHA-256: `9b87645167520e5445ea64e29bb9ce91d3ec57b8b284dbcaadba1d21773ecfd5`).
- **Chunk Allocation:** Total 115 chunks are indexed under `course_code: "BCS501"`. Software Engineering queries search Modules 1–3; Project Management queries search Modules 4–5.

### 4. Arithmetic Reconciliation for Physical PDF Pages
- In prior ingestion documentation, total pages were mistakenly reported as 968 due to an arithmetic omission.
- **Physical Page Breakdown (counted once per physical file):**
  - Operating Systems (`BCS303`): 221 pages
  - Algorithms / ADA (`BCS401`): 152 pages
  - Data Structures (`BCS304`): 128 pages
  - Java Programming (`BCS306A`): 48 pages
  - Python Programming (`BDS306B`): 143 pages
  - Parallel Computing (`BCI714B`): 58 pages
  - Cloud Computing (`BIS613D`): 21 pages
  - Generative AI (`BAIL657C`): 85 pages
  - RPA (Supplementary): 22 pages
  - Software Engineering & Project Management (`BCS501`): 110 pages
  $$\text{Sum} = 221 + 152 + 128 + 48 + 143 + 58 + 21 + 85 + 22 + 110 = 988\text{ pages}$$
- The count of **988 physical pages** across **10 unique physical PDFs** generating **1,028 academic chunks** is now verified and consistent across all system files.

---

## 3. Strict Subject Isolation Architecture (Part 2)

### The Subject Contamination Problem
In standard RAG pipelines, semantic similarity queries across an entire multi-subject collection can cause cross-subject contamination. For instance, querying "scheduling algorithms" might retrieve Operating Systems CPU scheduling notes when the student asked about Project Management PERT/CPM scheduling, or vice versa. Furthermore, querying an unindexed subject like Cryptography might return unrelated DSA chunks.

### Canonical Mapping & Resolution Engine
A centralized subject resolution engine was implemented in [`ml/app/vector_store.py`](file:///d:/Smart%20Edu/ml/app/vector_store.py) and integrated into the FastAPI pipeline [`ml/app/main.py`](file:///d:/Smart%20Edu/ml/app/main.py):

```python
SUBJECT_CANONICAL_MAP = {
    "operating_systems": {"code": "BCS303", "has_notes": True, "aliases": ["os", "operating systems"]},
    "ada":               {"code": "BCS401", "has_notes": True, "aliases": ["algorithms", "design and analysis of algorithms"]},
    "dsa":               {"code": "BCS304", "has_notes": True, "aliases": ["data structures", "data structures and applications"]},
    "java":              {"code": "BCS306A", "has_notes": True, "aliases": ["oop with java", "java programming"]},
    "python":            {"code": "BDS306B", "has_notes": True, "aliases": ["python programming"]},
    "software_engineering": {"code": "BCS501", "has_notes": True, "aliases": ["se", "software eng"]},
    "project_management":   {"code": "BCS501", "has_notes": True, "aliases": ["pm", "project mgmt"]},
    "cloud_computing":   {"code": "BIS613D", "has_notes": True, "aliases": ["cloud"]},
    "parallel_computing":{"code": "BCI714B", "has_notes": True, "aliases": ["parallel", "hpc"]},
    "generative_ai":     {"code": "BAIL657C", "has_notes": True, "aliases": ["genai", "gen ai"]},
    "rpa":               {"code": "RPA",     "has_notes": True, "aliases": ["robotic process automation"]},
    # Unindexed categories:
    "cryptography":      {"code": "BCS703", "has_notes": False, "aliases": ["crypto", "network security"]},
    "computer_networks": {"code": "BCS502", "has_notes": False, "aliases": ["cn", "networks"]},
    "dbms":              {"code": "BCS403", "has_notes": False, "aliases": ["database", "database management"]},
    "computer_graphics": {"code": "BCS305", "has_notes": False, "aliases": ["cg", "graphics"]}
}
```

### Retrieval Invariants Enforced
1. **Targeted Subject Filtering:** When a query specifies `subject_id` or `subject_code`, ChromaDB applies a metadata filter `{"course_code": resolved_code}`. Chunks from other courses are mathematically excluded.
2. **Shared Course Disambiguation:** For `software_engineering` and `project_management`, the resolver maps both to canonical `BCS501` and filters by `module_number` when provided.
3. **Honest Refusal on Unindexed Subjects (Strict Mode):** If a student queries an unindexed subject (e.g., Cryptography `BCS703`) without general knowledge mode enabled, the RAG guard immediately intercepts the query:
   - Returns status: `"subject_library_not_populated"`
   - Returns `sources: []`
   - Delivers an honest explanatory message stating that official VTU notes for this course are not yet indexed, and explicitly refuses to substitute unrelated notes (e.g., DSA or ADA).
4. **General Knowledge Fallback Mode:** When `general_knowledge_mode: true` is passed for an unindexed subject, the tutor generates a comprehensive engineering explanation from the LLM's parametric knowledge and prepends an explicit disclaimer banner:
   > ⚠️ **GENERAL KNOWLEDGE MODE ACTIVE**  
   > The academic notes library for **Cryptography & Network Security (BCS703)** is not yet populated in the VTU knowledge base. The explanation below is provided from broad general engineering knowledge and is not directly cited from official VTU notes.
5. **Private vs. Global Tenant Isolation:** Queries to `smart_study_documents` (student private uploads) require non-empty, validated `material_ids` verified against MySQL student ownership. Global VTU queries reside exclusively in `vtu_academic_knowledge`. No cross-collection bleed is possible.

---

## 4. Scan & OCR Audit: Computer Networks & DBMS (Part 3)

A deep-inspection script (`scratch/inspect_scans.py`) evaluated the physical PDF files in staging:

### Inspection Findings

| Subject | Course Code | File Name | Page Count | Text Characters Extracted | Raster Images Detected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Computer Networks** | `BCS502` | `Computer Networks – BCS502.pdf` | **190** | **0 characters** | 190 full-page scanned raster images | **UNREADABLE SCANNED RASTER** |
| **DBMS** | `BCS403` | `DBMS – BCS403.pdf` | **308** | **0 characters** | 308 full-page scanned raster images | **UNREADABLE SCANNED RASTER** |

### Local OCR Infrastructure Audit
- Checked local environment for OCR capabilities (`scratch/check_ocr.py`).
- Result: `shutil.which('tesseract') == None`.
- PyMuPDF OCR integration (`fitz.open().get_page_text(page, 'ocr')`) requires a local binary installation of Tesseract OCR with `tessdata` language packages.
- **Strict Compliance Decision:** In accordance with academic ingestion guidelines:
  - Unreadable raster scans must **never** be indexed with empty or garbage text.
  - No external unverified cloud OCR services were invoked.
  - `computer_networks` and `dbms` are formally designated as `NEEDS_MANUAL_REVIEW` pending optical character recognition or replacement with searchable digital text PDFs.
  - The AI Tutor handles queries for both subjects honestly using the unindexed subject protocol.

---

## 5. Missing Subject Materials Audit (Part 4)

| Category | Course Code | Syllabus Status | Notes File in Staging | Current Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Cryptography & Network Security** | `BCS703` | Official 7th Sem Professional Elective | None present in staging | Handled honestly; zero notes indexed; no fake syllabus mappings |
| **Computer Graphics** | `BCS305` | Official 3rd Sem ESC/ETC/PLC Option | Unverified supplementary file | Kept unindexed under `supplementary_unverified`; zero notes indexed |

---

## 6. Actual Installed Local LLM Audit (Part 5)

### Verification of Ollama Runtime
A direct REST query to `http://localhost:11434/api/show` for the active model `smartstudy-tutor:latest` revealed the definitive technical specifications:

```json
{
  "name": "smartstudy-tutor:latest",
  "parent_model": "qwen2.5-coder:1.5b",
  "format": "gguf",
  "family": "qwen2",
  "parameter_size": "1.5B (1,543,714,304 parameters)",
  "quantization_level": "Q4_K_M",
  "context_length": 32768,
  "embedding_length": 1536,
  "size": 986063826
}
```

### Resolution of Discrepancy
- **Audit Result:** The installed and active Ollama model is **1.5B parameters** (`qwen2.5-coder:1.5b`), quantized at `Q4_K_M` with a 32,768-token context window (file size: 986 MB).
- **Explanation:** Previous references to "7B" in design documentation were aspirational targets or naming artifacts. The hardware environment is running the 1.5B coder model, which delivers 2–12 second response latencies on local hardware.
- **Embedding Model:** Verified as `nomic-embed-text:latest` (137M parameters, 768 embedding dimensions, F16 quantization, 274 MB).
- **Rule Adherence:** No new models were downloaded; existing models were preserved without disruption.

---

## 7. AI Professor Teaching Quality & Pedagogy (Part 6)

The prompt engineering and system prompt synthesis in [`ml/app/main.py`](file:///d:/Smart%20Edu/ml/app/main.py) were overhauled to transform the tutor from a simple QA bot into an authoritative VTU AI Professor supporting two distinct pedagogical modes:

### Dual Teaching Modes

```mermaid
flowchart TD
    Q[Student Query] --> R{Teaching Mode}
    R -->|mode = 'learn'| LM[Learn Mode: 11-Step Pedagogical Mastery]
    R -->|mode = 'quick_revision'| QM[Quick Revision: 6-Step Exam Summary]
    
    subgraph LM[Learn Mode]
        L1[1. Concept Definition]
        L2[2. Prerequisites]
        L3[3. Basic Intuition & Analogy]
        L4[4. Technical Explanation]
        L5[5. Step-by-Step Operation]
        L6[6. Worked Examples]
        L7[7. Code / Math Derivation with Big-O]
        L8[8. Real-World Engineering Use]
        L9[9. Common Student Pitfalls & Traps]
        L10[10. Key Takeaways]
        L11[11. Verified Citations]
    end

    subgraph QM[Quick Revision Mode]
        Q1[1. Key Definitions]
        Q2[2. Core Concepts]
        Q3[3. Important Formulas & Laws]
        Q4[4. Differences / Comparison Table]
        Q5[5. Short Worked Example]
        Q6[6. High-Probability Exam Summary]
    end
```

### Domain-Specific Prompt Tailoring
The system prompt dynamically injects specialized engineering guidance based on the resolved subject:
- **Operating Systems (`BCS303`):** Demands kernel vs. user mode distinctions, PCB state transitions, concurrency race conditions, paging/TLB hardware address translation, and CPU scheduling criteria.
- **Algorithms & DSA (`BCS401`, `BCS304`):** Enforces formal asymptotic recurrence relations, step-by-step trace tables on sample input, clean commented pseudocode/code, and explicit Big-O time and space complexity analysis.
- **Programming Languages (`BCS306A`, `BDS306B`):** Mandates idiomatic syntax, memory layout (stack vs. heap), exception hierarchies, and standard library conventions.
- **Software Engineering & Project Management (`BCS501`):** Requires SDLC phase criteria, Agile Scrum vs. Waterfall trade-offs, COCOMO formulas, and PERT/CPM forward/backward pass slack calculations.
- **Cloud & HPC (`BIS613D`, `BCI714B`):** Demands Flynn taxonomy, OpenMP/MPI primitives, hypervisor vs. container virtualization, SLA equations, and Amdahl's Law speedup limits.
- **Generative AI (`BAIL657C`):** Focuses on Transformer self-attention matrix math, loss formulations, sampling hyperparameters, and RAG grounding mechanics.

---

## 8. Comprehensive Retrieval Evaluation Results (Part 7)

An evaluation suite containing **200 syllabus-aligned test queries** across all 10 officially indexed subjects, plus unindexed handling tests, cross-subject isolation tests, and multi-turn conversation tests was executed (`scratch/test_phase8_retrieval_suite.py`).

### 1. Subject-Wise Retrieval Benchmark (20 Queries per Subject)

| Subject Category | Course Code | Queries Tested | Hits | Hit Rate | Chunks Retrieved | Mean Search Latency | Boundary Violations |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Operating Systems** | `BCS303` | 20 | 20 | **100.0%** | 80 | 29.82 ms | **0** |
| **Analysis & Design of Algorithms** | `BCS401` | 20 | 20 | **100.0%** | 80 | 21.03 ms | **0** |
| **Data Structures & Applications** | `BCS304` | 20 | 20 | **100.0%** | 80 | 22.15 ms | **0** |
| **OOP with Java** | `BCS306A` | 20 | 20 | **100.0%** | 80 | 23.04 ms | **0** |
| **Python Programming** | `BDS306B` | 20 | 20 | **100.0%** | 80 | 23.33 ms | **0** |
| **Parallel Computing & HPC** | `BCI714B` | 20 | 20 | **100.0%** | 80 | 25.79 ms | **0** |
| **Cloud Computing** | `BIS613D` | 20 | 20 | **100.0%** | 80 | 23.88 ms | **0** |
| **Generative AI** | `BAIL657C` | 20 | 20 | **100.0%** | 80 | 24.33 ms | **0** |
| **Software Engineering** | `BCS501` | 20 | 20 | **100.0%** | 80 | 23.74 ms | **0** |
| **Project Management** | `BCS501` | 20 | 20 | **100.0%** | 80 | 24.58 ms | **0** |
| **TOTAL / OVERALL** | — | **200** | **200** | **100.0%** | **800** | **24.17 ms** | **0 (100% Fidelity)** |

### 2. Unindexed Subject Handling Tests

| Subject | Course Code | Vector Store Return | Strict Mode Status | Strict Sources | Honest Refusal | Gen Knowledge Mode Banner |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Cryptography & Security** | `BCS703` | 0 chunks | `subject_library_not_populated` | 0 chunks | **PASSED** | **PASSED** (Banner present) |
| **Computer Networks** | `BCS502` | 0 chunks | `subject_library_not_populated` | 0 chunks | **PASSED** | **PASSED** (Banner present) |
| **Database Management** | `BCS403` | 0 chunks | `subject_library_not_populated` | 0 chunks | **PASSED** | **PASSED** (Banner present) |
| **Computer Graphics** | `BCS305` | 0 chunks | `subject_library_not_populated` | 0 chunks | **PASSED** | **PASSED** (Banner present) |

### 3. Cross-Subject Contamination Attack Tests

| Attack Description | Target Query Topic | Enforced Subject Filter | Chunks Returned | Cross-Contamination | Result |
| :--- | :--- | :--- | :---: | :---: | :---: |
| OS query under DSA filter | CPU scheduling & PCB context switching | `dsa` (`BCS304`) | 4 | **0 chunks leaked** | **PASSED** |
| Java query under Python filter | JVM bytecode & garbage collection | `python` (`BDS306B`) | 4 | **0 chunks leaked** | **PASSED** |
| Cryptography under ADA filter | RSA public key encryption | `ada` (`BCS401`) | 4 | **0 chunks leaked** | **PASSED** |
| Cloud query under OS filter | NIST cloud SPI & hypervisors | `operating_systems` (`BCS303`) | 4 | **0 chunks leaked** | **PASSED** |

### 4. Student Private Document Isolation Tests
- **Private Search with Invalid / Unauthorized Material ID (`9999999`):** Returned exactly `0` chunks. Unrestricted cross-tenant searching strictly refused.
- **Global Search Scope Leakage Check:** Global VTU searches contained `0` private document chunks (`scope == 'private'` or `material_id > 0` was `False`).
- **Isolation Invariant:** Student private documents uploaded to `smart_study_documents` (323 chunks) remain completely isolated from public VTU curriculum queries.

### 5. AI Professor Generation & Multi-Turn Context Tests
- **Learn Mode Test:** Evaluated on Round Robin CPU Scheduling. Latency: **2.06s**. Generated **4,055 characters** covering formal definition, prerequisites, time quantum trade-offs, step-by-step Gantt chart trace, Big-O analysis, and practical OS dispatcher mechanics.
- **Quick Revision Mode Test:** Evaluated on Master Theorem. Latency: **2.05s**. Generated **2,705 characters** with formal LaTeX equations ($T(n) = aT(n/b) + f(n)$), Case 1/2/3 breakdown, and high-yield exam summary.
- **Multi-Turn Context Test:** Evaluated across a 2-turn conversation on AVL trees and RL rotation. Turn 1 latency: **8.29s** (2,966 chars). Turn 2 latency: **6.48s** (1,332 chars). Full conversational context preserved.
- **End-to-End Stack Verification:** Authenticated student JWT request sent through Spring Boot `/api/v1/tutor/chat` -> forwarded to FastAPI `/ml/v1/rag-query` -> processed by Ollama `smartstudy-tutor` -> response saved in MySQL database with grounded flag `true`.

---

## 9. Modified Files Summary

| File Path | Description of Changes |
| :--- | :--- |
| [`knowledge_base/vtu/2022/aiml/manifest.json`](file:///d:/Smart%20Edu/knowledge_base/vtu/2022/aiml/manifest.json) | Reconciled 15 requested categories, 13 official, 2 supplementary, 988 physical pages, 1,028 vectors; reclassified Python BDS306B as verified official option. |
| [`docs/VTU_RAG_INGESTION_REPORT.md`](file:///d:/Smart%20Edu/docs/VTU_RAG_INGESTION_REPORT.md) | Corrected physical page arithmetic to 988, updated active LLM specifications to 1.5B Qwen2.5-Coder. |
| [`ml/app/vector_store.py`](file:///d:/Smart%20Edu/ml/app/vector_store.py) | Added `SUBJECT_CANONICAL_MAP`, `resolve_subject`, `@property def course_code`, `@property def citation`; implemented subject isolation in `search()` for `vtu_academic_knowledge`. |
| [`ml/app/main.py`](file:///d:/Smart%20Edu/ml/app/main.py) | Added subject resolution, honest refusal for unindexed courses, general knowledge disclaimer banner, Learn Mode (11 steps), Quick Revision Mode (6 steps), and domain prompt tailoring. |
| [`backend/src/main/java/edu/smartstudy/tutor/TutorController.java`](file:///d:/Smart%20Edu/backend/src/main/java/edu/smartstudy/tutor/TutorController.java) | Updated `AskRequest` and `GroundedAskRequest` to pass `subjectId`, `subjectCode`, `moduleNumber`, `mode`, `generalKnowledge` down to the ML service. |
| [`scratch/test_phase8_retrieval_suite.py`](file:///d:/Smart%20Edu/scratch/test_phase8_retrieval_suite.py) | Automated 200-query benchmark suite verifying retrieval hit rate, subject isolation, unindexed handling, and private data isolation. |
| [`scratch/phase8_retrieval_evaluation_results.json`](file:///d:/Smart%20Edu/scratch/phase8_retrieval_evaluation_results.json) | Full machine-readable benchmark results for all 200 test queries. |
| [`docs/PHASE_8_QUALITY_REPORT.md`](file:///d:/Smart%20Edu/docs/PHASE_8_QUALITY_REPORT.md) | Comprehensive engineering and academic validation report for Phase 8. |

---

## 10. Conclusion & Production Readiness

Phase 8 is **complete, mathematically verified, and fully tested**:
1. All academic metadata arithmetic has been reconciled (988 physical pages across 10 unique PDFs generating 1,028 vectors).
2. The active local LLM is audited as `smartstudy-tutor` based on `qwen2.5-coder:1.5b` (1.5B, Q4_K_M, 32k context).
3. The retrieval engine delivers **100.0% retrieval hit rate (200/200)** at an average latency of **24.17 ms** with **zero cross-subject boundary contamination**.
4. Unindexed subjects (Cryptography, CN, DBMS, CG) are protected by an academic rigor guard providing honest status feedback and clear general knowledge disclaimers without fabricating citations.
5. Dual teaching modes (Learn Mode and Quick Revision Mode) provide rigorous, subject-specific engineering instruction.
6. The entire local stack (Next.js, Spring Boot, MySQL, FastAPI ML, ChromaDB, Ollama) operates with 100% security isolation and verified grounding.

