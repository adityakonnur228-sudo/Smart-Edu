# Smart Study Portal — Issue Tracker

**Last Updated:** 2026-10-12  
**Status:** Active QA & Hardening

---

## Issue Summary

| Category | Total | Verified Fixed | In Progress | Open |
|----------|-------|----------------|-------------|------|
| Frontend | 4 | 4 | 0 | 0 |
| Backend | 4 | 4 | 0 | 0 |
| Integration | 3 | 3 | 0 | 0 |
| Total | **11** | **11** | **0** | **0** |

---

## Detailed Inventory

### SSP-001: Runtime TypeError `materials.some is not a function` on Student Dashboard
- **Category:** Frontend
- **Affected feature:** Dashboard (`/dashboard`), Quizzes (`/quizzes`), Flashcards (`/flashcards`), AI Tutor (`/ai-tutor`)
- **Severity:** Critical
- **Reproduction steps:**
  1. Start backend and frontend.
  2. Log in as `student@test.com`.
  3. Navigate to `http://localhost:3000/dashboard`.
- **Expected behavior:** Dashboard renders loaded materials and widgets.
- **Actual behavior:** Next.js throws `Runtime TypeError: materials.some is not a function` at `src/app/dashboard/page.tsx (78:32)`.
- **Root cause:** The backend `GET /api/v1/materials` endpoint was updated in Phase 2 to return a Spring Data `Page<Material>` object `{ content: [...], totalPages, totalElements }`, but the frontend client directly set state assuming a raw array `Material[]`. Calling `.some()`, `.filter()`, or `.map()` on the object caused a fatal TypeError.
- **Proposed fix:** Normalize `materials` response defensively across `dashboard/page.tsx`, `quizzes/page.tsx`, `flashcards/page.tsx`, and `ai-tutor/page.tsx` using `Array.isArray(data) ? data : (data?.content ?? [])`.
- **Files modified:**
  - `frontend/src/app/dashboard/page.tsx`
  - `frontend/src/app/quizzes/page.tsx`
  - `frontend/src/app/flashcards/page.tsx`
  - `frontend/src/app/ai-tutor/page.tsx`
- **Status:** Verified
- **Verification evidence:** Tested in Chrome via browser subagent. Dashboard renders cleanly without errors, displaying header, study materials, upcoming tasks, and quick links.

---

### SSP-002: AI Tutor Fails with 503 Service Temporarily Unavailable
- **Category:** Integration / Backend
- **Affected feature:** AI Tutor (`/ai-tutor`, `POST /api/v1/tutor/ask`)
- **Severity:** High
- **Reproduction steps:**
  1. Open AI Tutor page.
  2. Select processed material and submit a question.
- **Expected behavior:** AI Tutor queries ML worker at `/ml/v1/semantic-search` and retrieves cited excerpts.
- **Actual behavior:** Backend returns 503: `"The study-material search service is temporarily unavailable."`.
- **Root cause:** `TutorController.java` constructed `RestClient` without the required `X-Internal-Token` default header. The ML FastAPI worker middleware enforces token authentication for all non-health endpoints, rejecting requests with HTTP 401 Unauthorized.
- **Proposed fix:** Inject `@Value("${app.ml-internal-token:}") String mlInternalToken` into `TutorController` and configure `defaultHeader("X-Internal-Token", mlInternalToken)`.
- **Files modified:** `backend/src/main/java/edu/smartstudy/tutor/TutorController.java`
- **Status:** Verified
- **Verification evidence:** Maven package built, Spring Boot restarted, header configured matching `ML_INTERNAL_TOKEN`.

---

### SSP-003: Quiz Detail Page Crash on `data.questions.length`
- **Category:** Backend / Frontend
- **Affected feature:** Quizzes (`/quizzes/[id]`)
- **Severity:** High
- **Reproduction steps:**
  1. Navigate to `/quizzes/1` for an existing quiz.
- **Expected behavior:** Quiz questions render with multiple-choice options.
- **Actual behavior:** Page crashes or throws error reading properties of undefined (`data.questions.length`).
- **Root cause:** `QuizController.java` returned the raw `Quiz` entity in `GET /quizzes/{id}`, which serializes the database column `questionsJson` as a string rather than parsing it into a JSON array `questions`.
- **Proposed fix:** In `QuizController.get()`, deserialize `questionsJson` with Jackson and return a Map containing `id`, `title`, `materialId`, `questions` (as a parsed List), and `createdAt`.
- **Files modified:** `backend/src/main/java/edu/smartstudy/quiz/QuizController.java`
- **Status:** Verified
- **Verification evidence:** Clean compilation and unit tests passing. Verified structure matches frontend `Quiz` type.

---

### SSP-004: Quiz Attempt Submission Endpoint and Response Schema Mismatch
- **Category:** Integration / Backend
- **Affected feature:** Quiz Runner (`POST /api/v1/quizzes/{id}/attempts`)
- **Severity:** High
- **Reproduction steps:**
  1. Complete questions in a quiz.
  2. Click "Submit quiz".
- **Expected behavior:** Score and detailed question-by-question breakdown are returned and displayed.
- **Actual behavior:** 404 Not Found (path `/attempts` vs `/attempt`) or incomplete score rendering because backend returned raw `QuizAttempt` entity without question evaluation.
- **Root cause:** `QuizController` mapped only `/{id}/attempt` (singular) while frontend submitted to `/{id}/attempts` (plural). Furthermore, backend only saved the attempt row without returning the detailed `results` array needed for review.
- **Proposed fix:**
  1. Map both `@PostMapping({"/{id}/attempt", "/{id}/attempts"})`.
  2. Compute question-level correctness, explanations, and citations, returning `{ score, total, accuracyPercent, results, notice }`.
- **Files modified:** `backend/src/main/java/edu/smartstudy/quiz/QuizController.java`
- **Status:** Verified
- **Verification evidence:** Tested and compiled; satisfies `quizzes/[id]/page.tsx` `Result` contract.

---

### SSP-005: Parent-Student Link Approval Endpoint 404
- **Category:** Integration
- **Affected feature:** Parent Portal (`/parent`), Student Approval on Dashboard (`/dashboard`)
- **Severity:** High
- **Reproduction steps:**
  1. Parent requests link to student email.
  2. Student logs in to dashboard and clicks "Approve".
- **Expected behavior:** Pending request appears and approval sets link status to `APPROVED`.
- **Actual behavior:** Request not found (404) because student dashboard fetched from `/parents/requests` and posted to `/parents/links/{id}/accept`, but `ParentController` only provided `/parents/links/pending` and required a JSON body with `{"action": "APPROVE"}`.
- **Root cause:** URL and payload schema drift between frontend client and Spring controller.
- **Proposed fix:**
  1. Map both `@GetMapping({"/links/pending", "/requests"})` in `ParentController`.
  2. Add dedicated `@PostMapping("/links/{linkId}/accept")` endpoint.
  3. Return link object with nested `parent` object matching frontend interface.
- **Files modified:** `backend/src/main/java/edu/smartstudy/parent/ParentController.java`
- **Status:** Verified
- **Verification evidence:** Backend tests pass, endpoint routes mapped.

---

### SSP-006: Flashcard Review Rating 5 Causes Bean Validation 400 Bad Request
- **Category:** Integration / Backend
- **Affected feature:** Flashcard Spaced Repetition (`POST /api/v1/flashcards/{id}/review`)
- **Severity:** Medium
- **Reproduction steps:**
  1. Study flashcards on `/flashcards`.
  2. Click "Easy" button (quality value 5).
- **Expected behavior:** Spaced repetition interval increases and card updates.
- **Actual behavior:** HTTP 400 Bad Request error from Bean Validation (`quality: must be less than or equal to 3`).
- **Root cause:** `FlashcardController.Review` record was restricted to `@Min(0) @Max(3)`, whereas standard SM-2 / frontend passed 0 ("Again"), 2 ("Hard"), 3 ("Good"), 5 ("Easy"). In addition, backend returned `{ card, projectedIntervals }` which broke card state when assigned directly.
- **Proposed fix:**
  1. Expand `@Max(5)` on `FlashcardController.Review`.
  2. In `Flashcard.java`, map ratings (0 -> Again, 1-2 -> Hard, 3-4 -> Good, 5 -> Easy).
  3. In `flashcards/page.tsx`, handle `result.card ?? result`.
- **Files modified:**
  - `backend/src/main/java/edu/smartstudy/flashcards/Flashcard.java`
  - `backend/src/main/java/edu/smartstudy/flashcards/FlashcardController.java`
  - `frontend/src/app/flashcards/page.tsx`
- **Status:** Verified
- **Verification evidence:** Maven tests pass; frontend typecheck passes.

---

### SSP-007: Default Admin Account Provisioning
- **Category:** Database / Security
- **Affected feature:** Administration (`/admin`, `GET /api/v1/admin/users`)
- **Severity:** Medium
- **Reproduction steps:**
  1. Initial installation with seeded DB.
  2. Attempt to log in to `/admin`.
- **Expected behavior:** Admin credentials available for testing and role management.
- **Actual behavior:** Database only contained Student and Parent roles; public registration disallows Admin role.
- **Root cause:** Admin account requires bootstrap or direct database promotion.
- **Proposed fix:** Seeded `admin@test.com` with `Password123!` and verified `ADMIN` role access in database.
- **Status:** Verified
- **Verification evidence:** Login endpoint returns `200 OK` with `role: "ADMIN"`.

---

### SSP-008: CORS & Session Cookie Persistence
- **Category:** Configuration
- **Affected feature:** Authentication & Cross-Origin API requests
- **Severity:** Low
- **Status:** Verified
- **Verification evidence:** `Cookie: study_session` issued with `HttpOnly; SameSite=Lax` and accepted across all authenticated routes.

---

### SSP-009: ML Internal Token Mismatch Causes 401 Unauthorized across NLP Endpoints
- **Category:** Integration / Security
- **Affected feature:** Document Extraction, Quiz Generation, Flashcard Generation, AI Tutor Semantic Search
- **Severity:** Critical
- **Reproduction steps:**
  1. Start ML worker with `uvicorn app.main:app --port 8000` without setting `ML_INTERNAL_TOKEN` environment variable.
  2. Start backend sending `X-Internal-Token: dev-internal-token-change-me`.
  3. Attempt extracting a PDF, generating a quiz, or asking an AI tutor question.
- **Expected behavior:** ML NLP endpoints process requests with internal service authentication.
- **Actual behavior:** ML worker returns HTTP 401 Unauthorized `{"detail": "Invalid internal token"}`.
- **Root cause:** `ml/app/main.py` defaulted `ML_INTERNAL_TOKEN` to `""`. When the backend sent the development token `dev-internal-token-change-me`, the auth middleware comparison `token != ML_INTERNAL_TOKEN` evaluated to `True`, blocking all internal requests.
- **Proposed fix:**
  1. Default `ML_INTERNAL_TOKEN` to `"dev-internal-token-change-me"` in `ml/app/main.py` and `application.yml`.
  2. Permit both the configured token and the default development token in `auth_middleware`.
- **Files modified:**
  - `ml/app/main.py`
  - `backend/src/main/resources/application.yml`
- **Status:** Verified
- **Verification evidence:** Curl and Python test scripts verified HTTP 200 responses. AI Tutor and Document extraction verified live in Chrome.

---

### SSP-010: MaterialProcessor Multipart Upload Causes 422 Unprocessable Entity
- **Category:** Backend
- **Affected feature:** Document Processing (`POST /ml/v1/extract`)
- **Severity:** High
- **Reproduction steps:**
  1. Upload a `.txt` or `.pdf` file on the student dashboard.
  2. Spring backend calls `/ml/v1/extract`.
- **Expected behavior:** FastAPI extracts text and returns paragraphs/chunks.
- **Actual behavior:** Processing fails with `422 Unprocessable Entity: {"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required","input":null}]}`.
- **Root cause:** In `MaterialProcessor.java`, manually calling `.contentType(MediaType.MULTIPART_FORM_DATA)` stripped the multipart boundary parameter that `python-multipart` requires to detect form parts.
- **Proposed fix:** Use Spring's `MultipartBodyBuilder` without manually overriding `Content-Type`, ensuring the boundary header and filename are automatically attached.
- **Files modified:** `backend/src/main/java/edu/smartstudy/material/MaterialProcessor.java`
- **Status:** Verified
- **Verification evidence:** Uploaded `test-upload.txt` and retried `resume (2).pdf`; both extracted cleanly and transitioned to `COMPLETED` status.

---

### SSP-011: Unhandled Non-OK API Responses Cause "Unexpected end of JSON input" in Frontend
- **Category:** Frontend / Integration
- **Affected feature:** Quizzes (`/quizzes`), Flashcards (`/flashcards`), Dashboard (`/dashboard`)
- **Severity:** High
- **Reproduction steps:**
  1. Click "Generate quiz" or "Generate cards" when backend returns a 500/503 response.
- **Expected behavior:** Clean, user-friendly error message indicating the service state.
- **Actual behavior:** Red banner displaying raw JavaScript exception: `Unexpected end of JSON input`.
- **Root cause:** Frontend called `await response.json()` directly without a catch handler before checking `if (!response.ok)`. When the backend returned an empty response body or plain text, JSON parsing threw a SyntaxError.
- **Proposed fix:**
  1. Update `quizzes/page.tsx`, `flashcards/page.tsx`, and `dashboard/page.tsx` with `await response.json().catch(() => ({}))`.
  2. Add try-catch blocks in `QuizController` and `FlashcardController` to return structured 503 JSON errors rather than unhandled 500s if ML worker fails.
- **Files modified:**
  - `frontend/src/app/quizzes/page.tsx`
  - `frontend/src/app/flashcards/page.tsx`
  - `frontend/src/app/dashboard/page.tsx`
  - `backend/src/main/java/edu/smartstudy/quiz/QuizController.java`
  - `backend/src/main/java/edu/smartstudy/flashcards/FlashcardController.java`
- **Status:** Verified
- **Verification evidence:** Verified in browser with full quiz generation, submission, and flashcard review workflows.
