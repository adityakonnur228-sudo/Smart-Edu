# GitHub Actions CI Failure Audit & Resolution Report

**Date:** November 1, 2026  
**Repository:** [https://github.com/adityakonnur228-sudo/Smart-Edu](https://github.com/adityakonnur228-sudo/Smart-Edu)  
**Workspace:** `D:\Smart Edu`  
**Initial Failed CI Run:** [Run 41327647946](https://github.com/adityakonnur228-sudo/Smart-Edu/actions/runs/41327647946)  
**Resolved Green CI Run:** [Run 41329492607](https://github.com/adityakonnur228-sudo/Smart-Edu/actions/runs/41329492607) (Conclusion: SUCCESS)  
**Target Commit SHA:** `8e0f7a8856f017d5491e30a53cb4816c939e93a4`  
**Target Branch:** `main` (synchronized with `production-hardening`)  

---

## 1. Executive Summary

Following the initial push of the hardened repository, GitHub Actions run `41327647946` failed in two jobs:
1. **Frontend (Next.js 16 / TypeScript / ESLint):** Failed at `Install dependencies` (`npm ci`) with `ERESOLVE` dependency conflict between React 19.3.0 and legacy `@react-three/drei@9.122.0` (which declared peer dependency `react@"^18"`).
2. **ML Engine (FastAPI / Python 3.12 / Vector Store):** Failed at `Run unit test suite` due to unmocked external Ollama daemon dependencies in `test_health` (`status="degraded"` instead of `"healthy"`) and `test_summary_is_marked_as_draft` (`"Local AI service unavailable for summarization"`).
3. **Backend & Security Jobs:** Passed successfully (`13/13` unit tests, `0` secrets in frontend bundle, all environment templates verified).

All root causes have been resolved cleanly without `--force` or `--legacy-peer-deps`. Both local and remote validation ensure 100% green builds.

---

## 2. Root Cause Analysis & Remediations

### 2.1 Frontend: React 19 vs Three.js/Fiber/Drei Peer Conflict
* **Root Cause:**
  - The project root uses Next.js 16.4.3 with React 19.3.0 (`react@^19.0.0`, `react-dom@^19.0.0`).
  - `@react-three/fiber@^8.18.0` and `@react-three/drei@^9.122.0` were compiled for React 18.
  - When `npm ci` runs in CI, npm enforces strict peer dependency validation. Because Drei 9 required `react@^18`, npm halted with `ERESOLVE` code 1.
* **Remediation Implemented:**
  - Preserved **React 19.3.0** and **Next.js 16.4.3**.
  - Upgraded `@react-three/fiber` to stable v9 (`^9.1.4`), which natively supports React 19.
  - Upgraded `@react-three/drei` to stable v10 (`^10.7.9`), which natively supports React 19 and Fiber v9.
  - Regenerated `frontend/package-lock.json` cleanly via `npm install --package-lock-only`.
  - Audited existing 3D components (`Hero3DBackground`, `KnowledgeCore`, `Page3DScrollScene`, `ZenSphere`). Confirmed they use raw Three.js (`three@0.170.0`) WebGL renderers and run with zero console errors.
  - Verified `npm ci --dry-run` succeeded with zero peer conflicts.

### 2.2 ML Engine: External AI Dependency Mocking & Health Probe Separation
* **Root Cause:**
  - On the GitHub Actions runner (and in isolated CI environments), a local Ollama daemon is not running on port 11434.
  - `test_health`: `health()` checked downstream Ollama availability and returned `status="degraded"`, but the test strictly asserted `status in ["ok", "healthy"]`.
  - `test_summary_is_marked_as_draft`: When Ollama was unreachable, `summarize()` returned `"Local AI service unavailable for summarization."`, causing an assertion failure on `"basic unit"`.
* **Remediation Implemented:**
  - **Liveness vs. Readiness Separation (`ml/app/main.py`):**
    - `HealthResponse` now includes explicit `liveness: str = "healthy"` (verifying that the FastAPI web server process is operational) and `readiness: str` (reflecting downstream LLM/Ollama readiness).
    - Added dedicated `/health/live` and `/health/ready` endpoints following Kubernetes/container health probe standards.
    - Updated middleware to permit probe endpoints without authentication headers.
  - **Deterministic Unit Test Mocking (`ml/tests/test_service.py`):**
    - Updated `test_health` to verify that `liveness == "healthy"`, verify real-world unmocked readiness without crashing, and verify mocked healthy (`status="healthy"`) and mocked degraded (`status="degraded"`) scenarios.
    - Updated `test_summary_is_marked_as_draft` to mock `OllamaClient` with a deterministic fixture, testing both short-text extractive drafts and full LLM map-reduce summaries without requiring a GPU or live daemon.
    - Added `test_summary_handles_ollama_unavailable` to verify graceful degradation when Ollama is offline.

### 2.3 CI Workflow Improvements (`.github/workflows/ci.yml`)
* **Node.js Environment:**
  - Updated Frontend CI job from `node-version: 20` to `node-version: 22` (Active LTS). This resolves runner deprecation warnings and natively aligns with Next.js 16.4.3 Turbopack build workers.

---

## 3. Security Audit & Historical Secret Remediation Plan

### 3.1 Investigation Findings
* **Current Working Tree:** **CLEAN**.
  - No active OpenRouter or cloud API keys exist in plaintext in any source files or environment templates.
  - Frontend bundle scan (`grep -rn "sk-or-v1-" frontend/`) confirmed 0 matches.
* **Historical Git Commits:**
  - GitHub Secret Scanning previously detected an OpenRouter key in historical commit `8c02a2c6d29e4907fc475b223749b68c8ab67c21` (`backend/src/main/resources/application.yml` and `ml/app/main.py`).
  - That push was unblocked in GitHub with user authorization.
  - **Revocation Notice:** The key has been flagged as compromised and must be revoked at the OpenRouter console by the key owner.

### 3.2 Recommended Historical Git Remediation Plan (When Authorized)
Under strict project guidelines, no destructive force-pushes or commit deletions were executed. If the repository owner elects to permanently excise the historical commit string from Git history:

1. **Prerequisite:** Ensure all team members have committed their local work.
2. **Tool:** Use `git-filter-repo` (recommended by GitHub over `git filter-branch`):
   ```bash
   pip install git-filter-repo
   git-filter-repo --replace-text <(echo "sk-or-v1-[REDACTED]==>REDACTED_KEY")
   ```
3. **Repository Garbage Collection:**
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
4. **Coordinated Force-Push:**
   ```bash
   git push origin main --force
   ```
5. **Team Re-clone:** All collaborators must re-clone or rebase onto the sanitized branch to avoid reintroducing rewritten SHAs.

---

## 4. Local Verification Summary

| Suite / Check | Command | Details / Result | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Clean Install** | `npm ci --dry-run` | Succeeded cleanly without ERESOLVE | **PASS** |
| **Frontend TypeScript** | `npm run typecheck` | `tsc --noEmit` exited 0 (0 errors) | **PASS** |
| **Frontend Linter** | `npm run lint` | `eslint .` exited 0 (0 errors, 2 non-blocking warnings) | **PASS** |
| **Frontend Production Build** | `npm run build` | Next.js 16.4.3 compiled all 13 routes cleanly | **PASS** |
| **Frontend 3D Visuals** | Playwright browser run | WebGL canvas rendered with 0 console errors | **PASS** |
| **Backend Maven Tests** | `mvn -B test` | 13/13 tests passed, 0 failures, 0 skipped | **PASS** |
| **ML Service Tests** | `unittest test_service.py` | 11/11 tests passed (health + summary mocked) | **PASS** |
| **ML Quality Tests** | `unittest test_tutor_quality.py` | 6/6 tests passed | **PASS** |
| **Environment Check** | CI security grep | Frontend 0 secrets, all templates present | **PASS** |


---

## 5. Remote GitHub Actions Verification (Run 41329492607)

* **Workflow Run URL:** [https://github.com/adityakonnur228-sudo/Smart-Edu/actions/runs/41329492607](https://github.com/adityakonnur228-sudo/Smart-Edu/actions/runs/41329492607)
* **Overall Conclusion:** **SUCCESS (ALL 4/4 JOBS GREEN)**

| Job | Status | Conclusion | Key Verified Steps |
| :--- | :--- | :--- | :--- |
| **Frontend (Next.js 16 / TypeScript / ESLint)** | completed | **success** | `npm ci` (Node 22, React 19 + Drei 10), ESLint, Typecheck, Next.js 16 production build |
| **Backend (Spring Boot 3.4.2 / Java 21 / Maven)** | completed | **success** | Maven compile, test suite (13/13 unit tests), package JAR, Dockerfile syntax validation |
| **ML Engine (FastAPI / Python 3.12 / Vector Store)** | completed | **success** | Python 3.12, system dependencies, pip install, unit tests (17/17 tests), Dockerfile syntax validation |
| **Environment & Security Audit** | completed | **success** | Frontend bundle secret audit (0 secrets), environment template completeness audit |
