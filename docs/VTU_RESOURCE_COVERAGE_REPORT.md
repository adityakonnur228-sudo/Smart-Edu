# VTU 2022 Scheme Academic Resource Coverage & Provenance Report

**Project:** Smart Study Portal (Smart Edu)  
**Curriculum Scheme:** VTU 2022 Scheme (B.E. Artificial Intelligence & Machine Learning)  
**Audit & Reconciliation Date:** November 1, 2026  
**ChromaDB Vector Store Collection:** `vtu_academic_knowledge` (1,028 vectors)  
**Private Student Collection:** `smart_study_documents` (323 vectors, strictly isolated)  
**Status:** **RECONCILED & AUDITED**

---

## 1. Executive Summary

This report establishes the ground truth regarding all academic study materials currently residing in the staging directory (`D:\VTU_Study_Materials_Staging\Subject_Notes\`) and indexed in ChromaDB.

Prior marketing claims asserted that 10 comprehensive, officially verified VTU notes were ingested. An independent forensic audit confirmed:
- **Total Physical PDFs:** 10 files
- **Total Ingested Physical Pages:** 988 pages
- **Total Verified Vectors in ChromaDB:** 1,028 chunks
- **Authentic Complete VTU College Notes:** 3 subjects (`Operating Systems`, `Analysis & Design of Algorithms`, `Software Engineering`)
- **Authentic Partial VTU Notes:** 1 subject (`Java`, Modules 1 & 2 only; Modules 3–5 missing)
- **Surrogate Non-VTU Documents:** 6 subjects (`Cloud Computing`, `Data Structures`, `Python`, `Parallel Computing`, `Generative AI`, `Robotic Process Automation`)
- **Unindexed / Raster Scan Notes:** 2 subjects (`Computer Networks`, `Database Management Systems`)
- **Missing Subjects:** 2 subjects (`Cryptography & Network Security`, `Computer Graphics`)

---

## 2. Comprehensive Subject-by-Subject Inventory

| # | Subject Category | VTU Code | Physical File | Actual Provenance / Origin | Pages | Chunks | Official VTU Status | Module Coverage |
|---|---|:---:|---|---|:---:|:---:|:---:|---|
| 1 | **Operating Systems** | `BCS303` | `OS All Modules Notes.pdf` | VTUSYNC / IPCC Template Notes | 221 | 264 | **VERIFIED CORE** | Modules 1, 2, 3, 4, 5 (100%) |
| 2 | **ADA** | `BCS401` | `ADA – BCS401.pdf` | VTUADDA / College CSE Dept Notes | 152 | 119 | **VERIFIED CORE** | Modules 1, 2, 3, 4, 5 (100%) |
| 3 | **Software Engineering** | `BCS501` | `Software Engineering.pdf` | ATME College of Engineering, Mysuru | 110 | 185 | **VERIFIED CORE** | Modules 1, 2, 3, 4, 5 (100%) |
| 4 | **Project Management** | `BCS501` | `Software Engineering.pdf` | Shared canonical mapping with BCS501 | 0 | 0* | **SHARED CANONICAL** | Modules 4 & 5 of BCS501 (*185 shared) |
| 5 | **Java** | `BCS306A` | `Java – BCS306A.pdf` | ATME College of Engineering, Mysuru | 48 | 64 | **PARTIAL CORE** | Modules 1 & 2 only (M3-M5 missing) |
| 6 | **Data Structures** | `BCS304` | `DSA – BCS304.pdf` | Duplicate of student upload `uploads/notes/Data Structures Full Notes.pdf` | 128 | 113 | **SURROGATE NOTE** | Units 1-5 (Generic syllabus) |
| 7 | **Cloud Computing** | `BIS613D` | `Cloud Computing – BIS613D.pdf` | MRCET courseware, **JNTU Hyderabad** (`R18A0523`) | 85 | 132 | **SURROGATE JNTU** | JNTUH Units 1-5 |
| 8 | **Python** | `BDS306B` | `Python – BDS306B.pdf` | Open textbook by Prof. H. Halvorsen (Norway) | 143 | 99 | **SURROGATE TEXTBOOK** | Chapters 1-15 (Missing VTU M3 Regex & M5 Excel/Web) |
| 9 | **Parallel Computing** | `BCI714B` | `Parallel Computing – BCI714B.pdf` | Dr. Plamen Krastev, **Harvard University** HPC | 58 | 18 | **SURROGATE SLIDES** | HPC Tutorial slides 1-58 |
| 10 | **Generative AI** | `BAIL657C` | `Generative AI – BAIL657C.pdf` | Wiley commercial textbook (Chapter 1 excerpt) | 22 | 29 | **SURROGATE CHAPTER** | Chapter 1 (22 pp, missing 10 lab experiments) |
| 11 | **Robotic Process Automation** | `UNVERIFIED` | `RPA.pdf` | Bialystok University of Technology, Poland (EU) | 21 | 5 | **SUPPLEMENTARY** | Slides 1-21 |
| 12 | **Computer Networks** | `BCS502` | `Computer Networks – BCS502.pdf` | 190-page raster scan (54 MB) | 190 | 0 | **UNINDEXED (OCR NEEDED)** | 0 selectable characters |
| 13 | **DBMS** | `BCS403` | `DBMS – BCS403.pdf` | 308-page raster scan (54 MB) | 308 | 0 | **UNINDEXED (OCR NEEDED)** | 0 selectable characters |
| 14 | **Cryptography & NetSec** | `BCS703` | *None* | 7th semester core subject | 0 | 0 | **MISSING** | Awaiting verified notes |
| 15 | **Computer Graphics** | `UNVERIFIED` | *None* | Supplementary elective | 0 | 0 | **MISSING** | Awaiting verified notes |
| **TOTAL** | — | — | **10 Ingested Files** | — | **988** | **1,028** | — | **11 Indexed** |

---

## 3. Discrepancy Resolution & Audit Findings

1. **The 1,213 vs 1,028 Chunk Discrepancy:**
   - Previous manifest credited `project_management` with 185 chunks and `software_engineering` with 185 chunks, summing to 1,213 chunks.
   - ChromaDB inspection proved that only 185 chunks exist for `BCS501` under `software_engineering`.
   - `manifest.json` and `source_metadata.json` now record `indexed_chunks_count: 0` and `shared_chunks_count: 185` for `project_management`, bringing the manifest total into exact agreement with ChromaDB at **1,028 chunks**.

2. **Student Document Isolation:**
   - The file `DSA – BCS304.pdf` ingested into `vtu_academic_knowledge` was derived from a student dashboard upload (`uploads/notes/Data Structures Full Notes.pdf`, SHA-256 `7c993aa9de60...`).
   - While the collections remain isolated (`vtu_academic_knowledge` has 1,028 chunks and `smart_study_documents` has 323 chunks), `DSA – BCS304.pdf` is labelled honestly as a student-contributed surrogate note until an official VTU college note is acquired.

3. **Academic Guardrails in Local AI Tutor:**
   - For subjects without indexed notes (`cryptography`, `computer_networks`, `dbms`, `computer_graphics`), the AI Tutor refuses to substitute unrelated notes and provides an honest explanation or prompts the student for General Knowledge mode.

