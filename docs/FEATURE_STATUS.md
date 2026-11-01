# Smart Study Portal — Feature Status Matrix

**Date:** 2026-10-12  
**Purpose:** Comprehensive breakdown of implemented, partially implemented, and future features for project demonstration.

---

## 1. Authentication & Security

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Student Registration | Implemented | Form validation, BCrypt password hashing, session issuance |
| Parent Registration | Implemented | Role selection during sign-up (`STUDENT` / `PARENT`) |
| Admin Registration | Restricted | Intentionally disallowed on public form; bootstrapped via DB |
| Login / Session Cookie | Implemented | Signed JWT stored in `HttpOnly; SameSite=Lax` cookie (`study_session`) |
| Logout / Token Revocation | Implemented | Server-side `token_version` bump and cookie clear |
| Role-based Access Control | Implemented | Spring Security `@PreAuthorize` guards for `STUDENT`, `PARENT`, `ADMIN` |
| Password Reset Flow | Implemented | Token generation, SHA-256 hashed storage, Mailpit SMTP in dev |
| Email Verification | Implemented | Configurable flag `REQUIRE_EMAIL_VERIFICATION` |

---

## 2. Study Materials & Document Processing

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| File Upload (PDF, DOCX, TXT) | Implemented | Magic signature verification, size checks, UUID storage |
| Asynchronous Processing | Implemented | Spring `@Async` dispatch to FastAPI ML worker |
| Extractive Summarization | Implemented | Deterministic sentence ranking, marked as draft |
| Keyword Extraction | Implemented | Stopword filtering, frequency scoring |
| Topic Identification | Implemented | Salient noun phrase extraction with importance scoring |
| Document Deletion | Implemented | Removes filesystem file, chunks, and cascading DB entities |
| File Download | Implemented | Owner-scoped download with `nosniff` header |
| Full-text Search | Implemented | FULLTEXT index on material chunks |
| OCR Support | Ready (Flagged) | Tesseract integration in ML worker, toggleable via `OCR_ENABLED` |

---

## 3. Study Planning & Tasks

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Automated Plan Generation | Implemented | Topic importance ranking, daily minutes distribution |
| Manual Task CRUD | Implemented | Custom title, subject, estimated duration, scheduled date |
| Task Completion & Reopen | Implemented | Real-time status update, persisted in MySQL |
| Task Filters | Implemented | Filter by scheduled date, pending, and completed status |

---

## 4. Focus Mode & Time Tracking

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Start / Pause / Resume | Implemented | Timestamp-based elapsed calculation, no drift |
| Task Linking | Implemented | Optional association with a pending study task |
| Session Completion | Implemented | Total seconds recorded to student's history in MySQL |
| Active Session Recovery | Implemented | `GET /focus/sessions/active` restores running session on reload |

---

## 5. Quizzes & Self-Assessment

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Question Generation | Implemented | Deterministic definition-based MCQ creation via ML worker |
| Quiz Runner UI | Implemented | Single-question view, option selection, submission |
| Automated Scoring | Implemented | Instant accuracy %, correct vs expected evaluation |
| Source Grounding / Citations | Implemented | Direct reference to source paragraph / note passage |

---

## 6. Flashcards & Spaced Repetition

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Automated Card Generation | Implemented | Extracted from definition sentences in processed notes |
| Manual Card Creation | Implemented | Custom front and back text |
| SuperMemo SM-2 Review | Implemented | 4-tier rating ("Again", "Hard", "Good", "Easy") setting intervals |
| Review Queue & Due Counters | Implemented | Compares `next_review` against local date |
| Review History Logging | Implemented | Logs previous/new intervals and ease factors for analytics |

---

## 7. AI Tutor (PDF & Document Summarizer & Grounded Q&A)

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| PDF & DOC Text Summarizer | In Development | Deep multi-tier document summarization pipeline (See [AI_TUTOR_SUMMARIZATION_ROADMAP.md](../AI_TUTOR_SUMMARIZATION_ROADMAP.md)) |
| Source-Grounded Reference Q&A | In Development | Page and paragraph citation-backed question answering strictly bounded to uploaded files |
| UI Showcase & Architecture Blueprint | Implemented | High-fidelity interactive prototype, roadmap milestone viewer, and document previews |
| Automated Quiz Synthesis from Summaries | Planned | Seamless export of generated document digests into targeted practice quizzes |

---

## 8. Progress Analytics

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Recorded Study Time | Implemented | Total focus minutes computed from completed focus sessions |
| Task Completion Rate | Implemented | Percentage of completed vs total tasks |
| Quiz Accuracy Trend | Implemented | Average score across attempts |
| 7-Day Visual Chart | Implemented | Daily bar distribution of focus minutes |

---

## 9. Parent Portal

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| Student Link Request | Implemented | Parent requests connection by student email |
| Student Approval | Implemented | Student approves link from dashboard |
| Progress Report Viewing | Implemented | Aggregate summary (study minutes, tasks, quiz accuracy) |
| Privacy Protection | Implemented | Parents strictly cannot view raw notes, quiz answers, or chats |

---

## 10. Administration Portal

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| User Listing | Implemented | Last 100 accounts with email, name, role, creation date |
| Role Management | Implemented | Promote/demote between STUDENT, PARENT, ADMIN |
| Safety Guards | Implemented | Prevents demoting the last active administrator |
| System Health Overview | Implemented | Total user breakdown and document processing pipeline counts |
