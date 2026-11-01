# Independent Evidence-Based Reconciliation Report: VTU Academic Knowledge Base Ingestion

**Document Under Review:** `docs/VTU_RAG_INGESTION_REPORT.md`  
**Curriculum Scheme:** VTU 2022 Scheme (B.E. in Artificial Intelligence & Machine Learning)  
**Investigation Mode:** Read-Only Audit & Non-Destructive Inspection (Zero downloads, zero deletions, zero re-indexing)  
**Date of Audit:** November 1, 2026  
**Status:** **AUDIT COMPLETE — CRITICAL DISCREPANCIES IDENTIFIED**

---

## Executive Finding

The user's prior assertion was **entirely accurate**:
> *"I previously confirmed that I had not downloaded any comprehensive VTU notes PDFs."*

The claim in `docs/VTU_RAG_INGESTION_REPORT.md` that 10 comprehensive, officially verified VTU notes were ingested was **substantially overstated**:
1. **Provenance & Authenticity Discrepancy:**
   - Only **3 out of 10** PDFs are authentic VTU college/syllabus-aligned notes covering all 5 modules (`OS All Modules Notes.pdf`, `ADA – BCS401.pdf`, and `Software Engineering.pdf`).
   - One PDF (`Java – BCS306A.pdf`) is an authentic VTU college note, but contains **only Modules 1 and 2** (48 pages; Modules 3, 4, and 5 are completely missing).
   - **6 out of 10** PDFs are **not official VTU courseware**:
     - `Cloud Computing – BIS613D.pdf` is actually JNTU Hyderabad courseware from Malla Reddy College (`R18A0523`), not VTU `BIS613D`.
     - `DSA – BCS304.pdf` was **copied directly from an existing student dashboard upload** (`uploads/notes/Data Structures Full Notes.pdf`, author: Sushma).
     - `Python – BDS306B.pdf` is an open-access textbook by Prof. Hans-Petter Halvorsen (University of South-Eastern Norway), lacking VTU's prescribed "Automate the Boring Stuff" modules.
     - `Parallel Computing – BCI714B.pdf` is a 58-slide tutorial by Dr. Plamen Krastev from **Harvard University** Research Computing.
     - `Generative AI – BAIL657C.pdf` is a 22-page excerpt of Chapter 1 from a commercial Wiley textbook, not the VTU 10-experiment lab manual.
     - `RPA.pdf` is a 21-slide training presentation from Bialystok University of Technology (Poland) for an EU project, completely unrelated to VTU.
2. **Manifest vs. ChromaDB Vector Count Mismatch:**
   - `manifest.json` reports **1,213 total chunks** across 11 indexed subjects.
   - ChromaDB `vtu_academic_knowledge` actually contains **1,028 vectors**.
   - The discrepancy arises because `project_management` is credited with 185 chunks in `manifest.json`, but **0 vectors** exist for `project_management` in ChromaDB (it was only indexed under `software_engineering`).
3. **Student Upload Leakage into Global Knowledge Base:**
   - While ChromaDB maintains two collections (`smart_study_documents` and `vtu_academic_knowledge`), the file `DSA – BCS304.pdf` ingested into `vtu_academic_knowledge` (113 vectors) is a bit-for-bit duplicate of the student-uploaded file `D:\Smart Edu\uploads\notes\Data Structures Full Notes.pdf`.

---

## 1. Physical Files Inventory & Existence Check

All 10 physical files exist on disk under `D:\VTU_Study_Materials_Staging\Subject_Notes\`:

| # | Subject Category | Claimed Course Code | Physical Filename | Absolute Disk Path | File Exists? | File Size |
|---|---|:---:|---|---|:---:|:---:|
| 1 | Operating Systems | `BCS303` | `OS All Modules Notes.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\operating_systems\OS All Modules Notes.pdf` | **YES** | 16,817,166 bytes |
| 2 | ADA | `BCS401` | `ADA – BCS401.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\ada\ADA – BCS401.pdf` | **YES** | 13,386,122 bytes |
| 3 | DSA | `BCS304` | `DSA – BCS304.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\dsa\DSA – BCS304.pdf` | **YES** | 4,678,785 bytes |
| 4 | Cloud Computing | `BIS613D` | `Cloud Computing – BIS613D.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\cloud_computing\Cloud Computing – BIS613D.pdf` | **YES** | 3,311,461 bytes |
| 5 | Software Engineering | `BCS501` | `Software Engineering.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\software_engineering\Software Engineering.pdf` | **YES** | 3,577,790 bytes |
| 6 | Python | `BDS306B` | `Python – BDS306B.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\python\Python – BDS306B.pdf` | **YES** | 3,682,006 bytes |
| 7 | Java | `BCS306A` | `Java – BCS306A.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\java\Java – BCS306A.pdf` | **YES** | 720,755 bytes |
| 8 | Parallel Computing | `BCI714B` | `Parallel Computing – BCI714B.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\parallel_computing\Parallel Computing – BCI714B.pdf` | **YES** | 1,163,271 bytes |
| 9 | Generative AI | `BAIL657C` | `Generative AI – BAIL657C.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\generative_ai\Generative AI – BAIL657C.pdf` | **YES** | 534,464 bytes |
| 10 | RPA | `UNVERIFIED` | `RPA.pdf` | `D:\VTU_Study_Materials_Staging\Subject_Notes\rpa\RPA.pdf` | **YES** | 1,771,750 bytes |

---

## 2. Cryptographic Hash & Page Count Audit

Physical file attributes were verified directly using `hashlib.sha256` and PyMuPDF (`fitz`):

| # | Filename | Page Count | Verified SHA-256 Checksum | Text Layer Extractable Characters |
|---|---|:---:|---|:---:|
| 1 | `OS All Modules Notes.pdf` | **221** | `2e39db14b7a50df85d3397cfa824b6bd823b29fa7c1855e95d7d1ff2ae5dd64d` | 356,442 chars |
| 2 | `ADA – BCS401.pdf` | **152** | `30847f3532a158dc82dabee57c09897e41d88508eb1a73a7c7c601d8e9dd2749` | 160,152 chars |
| 3 | `DSA – BCS304.pdf` | **128** | `7c993aa9de60a612844feedb93e9d114464451382b933ac2b5c385c15e0b99a8` | 151,361 chars |
| 4 | `Cloud Computing – BIS613D.pdf` | **85** | `855f7945283050fedbdf6d1c0796697a06484bdd3f2e7a02aac39e14aa38d398` | 194,798 chars |
| 5 | `Software Engineering.pdf` | **110** | `0e613355aba11cd39c0fccf78c5716173fd823a81cb1d90a3a1609d6b47bd3cc` | 240,415 chars |
| 6 | `Python – BDS306B.pdf` | **143** | `b9a3f9e4246473a47c095eb20e516df639fa30ba8937657abd69fa132100d154` | 120,362 chars |
| 7 | `Java – BCS306A.pdf` | **48** | `e356733fdf6fbc1b9ae9b8d3c2801d10228cc028ffa3dcd2a22769a97bbf2f23` | 88,448 chars |
| 8 | `Parallel Computing – BCI714B.pdf` | **58** | `8d9c4ef0dd23351db469f1c37a9ec65674a77dfd9a1b8cd2fe997b35ec566f7f` | 23,907 chars |
| 9 | `Generative AI – BAIL657C.pdf` | **22** | `436dc511862823850d0c6f5869344e78df4c0890893d4ce11c8e8564635ba375` | 44,273 chars |
| 10 | `RPA.pdf` | **21** | `4aacac49f310694f93c053dd44c71dc5b9487c1b097a9d89863bcf4ccbd41f7a` | 6,653 chars |
| — | **Total Verified Physical Pages** | **988** | — | **1,386,811 chars** |

---

## 3. Provenance, Download URL & Publisher Audit

Inspection of PDF internal metadata, watermarks, producer strings, and embedded URLs revealed the true origin of every file:

| # | Filename | Internal PDF Producer / Creator | Internal Document Title / Metadata Author | Provenance & Actual Publisher |
|---|---|---|---|---|
| 1 | `OS All Modules Notes.pdf` | `PyPDF2` | Blank title / Blank author | **VTUSYNC.IN** (contains YouTube video links `https://youtu.be/mXw9ruZaxzQ`). Uses VTU IPCC template for `BCS303`. |
| 2 | `ADA – BCS401.pdf` | `Microsoft Word 2013` (via `Online2PDF.com`) | Author: `Online2PDF.com` | **VTUADDA** / Engineering College CSE Department Notes of Lesson (2024–2025) for `BCS401`. |
| 3 | `DSA – BCS304.pdf` | `www.ilovepdf.com` / `Microsoft Word 2016` | Author: `Sushma` | **Generic Data Structures Notes** titled *"Unit-1 Introduction: What is Data Structure?"*. **Identical to dashboard upload `Data Structures Full Notes.pdf`**. |
| 4 | `Cloud Computing – BIS613D.pdf` | `Microsoft: Print To PDF` | Title: `Microsoft Word - CLOUD COPUTING NOTES (R18A0523)`, Author: `srinidhi reddy` | **Malla Reddy College of Engineering & Technology (MRCET)**, affiliated to **JNTU Hyderabad** (`R18A0523`). **Not VTU**. |
| 5 | `Software Engineering.pdf` | `pdf-lib` / `Microsoft Word 2010` | Author: `Online2PDF.com` | **ATME College of Engineering, Mysuru**, Department of CSE. Notes for VTU `BCS501`. |
| 6 | `Python – BDS306B.pdf` | `pdfTeX-1.40.28` / `TeX` | Title: `Python Programming` | **Prof. Hans-Petter Halvorsen**, University of South-Eastern Norway (`https://www.halvorsen.blog`). Open-access textbook. |
| 7 | `Java – BCS306A.pdf` | `pdf-lib` / `Microsoft Word 2016` | Blank | **ATME College of Engineering, Mysuru**, Dept of CSE (originally named `@vtuwise.in_BCS306A_JAVA_NOTES.pdf`). |
| 8 | `Parallel Computing – BCI714B.pdf` | `Microsoft PowerPoint 2010` | Title: `PowerPoint Presentation`, Author: `Plamen` | **Dr. Plamen Krastev, Harvard University** FAS Research Computing (`plamenkrastev@fas.harvard.edu`). Tutorial slides. |
| 9 | `Generative AI – BAIL657C.pdf` | `Adobe InDesign 19.5` / `Adobe PDF Library 17.0` | Title: `Introduction to Generative AI` | **Wiley / Gartner Publishing** (Excerpt of Chapter 1 from a commercial book). |
| 10 | `RPA.pdf` | `PowerPoint dla Microsoft 365` | Author: `LUCA CARMINATI` | **Dr. Julia Siderska, Bialystok University of Technology (Poland)**, EU Project 101104819. Training slides. |

---

## 4. Course Code & Module Syllabus Coverage Verification

Comparing the contents of each file against the official VTU 2022 Scheme AIML syllabus:

| # | Subject | VTU Course Code | Internal Code in PDF | Modules Covered | Missing Modules / Topics | Authentic VTU Notes? |
|---|---|:---:|:---:|:---:|---|:---:|
| 1 | Operating Systems | `BCS303` | `BCS303` | Modules 1, 2, 3, 4, 5 | None | **YES (Complete)** |
| 2 | ADA | `BCS401` | `BCS401` | Modules 1, 2, 3, 4, 5 | None | **YES (Complete)** |
| 3 | DSA | `BCS304` | *None* | Units 1, 2, 3, 4, 5 | Does not follow VTU BCS304 module structure | **NO (Generic notes)** |
| 4 | Cloud Computing | `BIS613D` | `R18A0523` (JNTUH) | JNTUH Units 1–5 | Covers Buyya textbook, but aligns to JNTU, not VTU | **NO (JNTU Hyderabad)** |
| 5 | Software Engineering | `BCS501` | `BCS501` | Modules 1, 2, 3, 4, 5 | None (Covers SE + Project Mgmt) | **YES (Complete)** |
| 6 | Python | `BDS306B` | *None* | Chapters 1–15 | **Missing Module 3 (Regex) and Module 5 (openpyxl & web scraping)** | **NO (Generic textbook)** |
| 7 | Java | `BCS306A` | `BCS306A` | **Modules 1 & 2 only** | **Missing Module 3 (Inheritance), Module 4 (Interfaces/Exceptions), Module 5 (Threads)** | **PARTIAL (M1–M2 only)** |
| 8 | Parallel Computing | `BCI714B` | *None* | Slides 1–58 | Lacks full textbook theory (routing, interconnects, CUDA) | **NO (Harvard slides)** |
| 9 | Generative AI | `BAIL657C` | *None* | Chapter 1 (22 pp) | Lacks the 10 prescribed lab experiments for BAIL657C | **NO (Book chapter)** |
| 10 | RPA | `UNVERIFIED` | *None* | Slides 1–21 | Not an official VTU 2022 AIML subject | **NO (EU slides)** |

---

## 5. Origin Analysis: Dashboard Uploads vs. Staging

### The `DSA – BCS304.pdf` Finding
- A file named `Data Structures Full Notes.pdf` exists in the student upload directory:
  `D:\Smart Edu\uploads\notes\Data Structures Full Notes.pdf`
  - Timestamp: `October 18, 2026, 15:04`
  - Size: `4,678,785 bytes`
  - SHA-256: `7c993aa9de60a612844feedb93e9d114464451382b933ac2b5c385c15e0b99a8`
- In `D:\VTU_Study_Materials_Staging\Subject_Notes\dsa\`:
  - Both `Data Structures Full Notes.pdf` and `DSA – BCS304.pdf` exist.
  - Their SHA-256 hashes, file sizes, and page counts are **100% identical**.
- **Conclusion:** `DSA – BCS304.pdf` was **sourced directly from the existing student upload**, renamed, and copied into the staging folder.

### Other Local File Traces
- `Operating-System.pdf` (`2,742,927 bytes`, dated `October 19, 2026`) was present in `operating_systems/` alongside `OS All Modules Notes.pdf`.
- `Computer Networks – BCS502.pdf` and `DBMS – BCS403.pdf` are duplicate copies of `01_CN-Complete-Notes.pdf` and `DBMS.pdf` (both 54 MB raster scans).
- `Software Engineering.pdf` and `Java – BCS306A.pdf` contain `pdf-lib` producer metadata, indicating they were converted or processed using the open-source `pdf-lib` JavaScript library.

---

## 6. ChromaDB vs. Manifest.json Reconciliation

An automated query of ChromaDB at `D:\Smart Edu\ml\chroma_data` was compared directly against `knowledge_base/vtu/2022/aiml/manifest.json`:

```
Actual ChromaDB Total: 1,028 vectors (vtu_academic_knowledge)
Manifest Stated Total: 1,213 chunks across 11 indexed subjects
Overall Match: FALSE (Delta: -185 chunks)
```

### Subject-by-Subject Breakdown

| Subject ID | Course Code | Staged Source File | Manifest Chunks | Actual ChromaDB Chunks | Vector Store Match? |
|---|:---:|---|:---:|:---:|:---:|
| `operating_systems` | `BCS303` | `OS All Modules Notes.pdf` | 264 | 264 | **MATCH** |
| `ada` | `BCS401` | `ADA – BCS401.pdf` | 119 | 119 | **MATCH** |
| `dsa` | `BCS304` | `DSA – BCS304.pdf` | 113 | 113 | **MATCH** |
| `cloud_computing` | `BIS613D` | `Cloud Computing – BIS613D.pdf` | 132 | 132 | **MATCH** |
| `software_engineering` | `BCS501` | `Software Engineering.pdf` | 185 | 185 | **MATCH** |
| `project_management` | `BCS501` | `Software Engineering.pdf` (Shared) | **185** | **0** | **MISMATCH (0 in Chroma)** |
| `python` | `BDS306B` | `Python – BDS306B.pdf` | 99 | 99 | **MATCH** |
| `java` | `BCS306A` | `Java – BCS306A.pdf` | 64 | 64 | **MATCH** |
| `parallel_computing` | `BCI714B` | `Parallel Computing – BCI714B.pdf` | 18 | 18 | **MATCH** |
| `generative_ai` | `BAIL657C` | `Generative AI – BAIL657C.pdf` | 29 | 29 | **MATCH** |
| `rpa` | `UNVERIFIED` | `RPA.pdf` | 5 | 5 | **MATCH** |
| `computer_networks` | `BCS502` | `Computer Networks – BCS502.pdf` | 0 | 0 | **MATCH (Not Indexed)** |
| `dbms` | `BCS403` | `DBMS – BCS403.pdf` | 0 | 0 | **MATCH (Not Indexed)** |
| `cryptography` | `BCS703` | *None* | 0 | 0 | **MATCH (Missing)** |
| `computer_graphics` | `UNVERIFIED` | *None* | 0 | 0 | **MATCH (Missing)** |
| **TOTAL** | — | — | **1,213** | **1,028** | **DISCREPANCY: 185** |

### Why the Manifest and ChromaDB Disagree
- `project_management` has **zero vectors** in ChromaDB because `ingest_vtu_materials.py` indexed `Software Engineering.pdf` only under `subject_id: "software_engineering"`.
- However, `manifest.json` credited `project_management` with `indexed_chunks_count: 185`.
- Therefore, the claim of 1,213 total chunks across subjects is a double-count; the true physical vector count in ChromaDB is **1,028**.

---

## 7. Status of Unindexed & Missing Subjects

1. **`computer_networks` (`BCS502`):**
   - File `Computer Networks – BCS502.pdf` (190 pages, 54.3 MB) is a **pure raster scan** with zero extractable text characters.
   - It was correctly excluded from ChromaDB indexing (0 chunks).
2. **`dbms` (`BCS403`):**
   - File `DBMS – BCS403.pdf` (308 pages, 54.2 MB) is a **pure raster scan** with zero extractable text characters.
   - It was correctly excluded from ChromaDB indexing (0 chunks).
3. **`cryptography` (`BCS703`):**
   - Official 7th-semester core course. Zero files present in staging (0 chunks).
4. **`computer_graphics`:**
   - Zero files present in staging (0 chunks). Not part of the official 2022 AIML Scheme.

---

## 8. Summary of Evidence & Final Truth

| Audit Question | Verified Finding |
|---|---|
| **Did the user download complete VTU notes?** | **No.** Only 3 files are complete VTU college notes (`OS`, `ADA`, `SE`). The rest are non-VTU college notes (JNTU), an existing dashboard upload (`DSA`), open-access textbooks (`Python`), slide decks (`Harvard HPC`, `RPA`), or book excerpts (`GenAI`). |
| **Are there 10 physical PDFs and 988 pages?** | **Yes.** Exactly 10 files exist in staging, totaling 988 physical pages. |
| **Are there 1,028 academic chunks in ChromaDB?** | **Yes.** ChromaDB collection `vtu_academic_knowledge` has exactly 1,028 vectors. |
| **Was a private student upload indexed as global VTU material?** | **Yes.** `DSA – BCS304.pdf` (113 chunks) was copied from `uploads/notes/Data Structures Full Notes.pdf`. |
| **Does `manifest.json` match ChromaDB vector counts?** | **No.** Manifest claims 1,213 chunks due to double-counting `project_management` (185 chunks), which has 0 separate vectors in ChromaDB. |
| **Should these materials be represented as "Verified Official VTU Notes" in the UI?** | **No.** Displaying them as verified official VTU materials would be misleading. Keeping all knowledge-base statistics removed from the UI was the correct architectural and factual decision. |
