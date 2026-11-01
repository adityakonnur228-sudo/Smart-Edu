# Smart Study Portal (Smart Edu) — API Reference Specification

## 1. Authentication & Security Headers

### Global Authentication
- **Session Cookie:** `study_session` (HTTP-only, SameSite=Lax, Secure in production).
- **Bearer Token:** `Authorization: Bearer <JWT_TOKEN>` (Supported on all authenticated endpoints).
- **Internal ML Token:** `X-Internal-Token: dev-internal-token-change-me` (Required on internal ML service endpoints).

---

## 2. Authentication API (`/api/v1/auth`)

### 2.1 Register User
- **Method / Path:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@smartstudy.edu",
  "password": "SecurePassword123!",
  "role": "STUDENT"
}
```
- **Validation Rules:**
  - `name`: 1-120 characters, non-blank.
  - `email`: Valid RFC 5322 email string.
  - `password`: Minimum 10 characters, maximum 72 characters.
  - `role`: Optional, `"STUDENT"` (default) or `"PARENT"`.
- **Response (200 OK):**
```json
{
  "id": 12,
  "name": "Jane Doe",
  "email": "jane@smartstudy.edu",
  "role": "STUDENT",
  "timezone": "Asia/Kolkata",
  "emailVerified": true,
  "token": "eyJhbGciOi..."
}
```

### 2.2 Login User
- **Method / Path:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "jane@smartstudy.edu",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):** Sets `study_session` cookie and returns user object with token.
- **Error (401 Unauthorized):** `{"error": "Email or password is incorrect"}`

### 2.3 Logout User (Instant Revocation)
- **Method / Path:** `POST /api/v1/auth/logout`
- **Access:** Authenticated
- **Behavior:** Increments `token_version` in MySQL database, immediately invalidating all active JWTs for this account. Clears session cookie.
- **Response (200 OK):** `{"ok": true}`

### 2.4 Get Current User Profile
- **Method / Path:** `GET /api/v1/auth/me`
- **Access:** Authenticated
- **Response (200 OK):**
```json
{
  "id": 1,
  "name": "Student User",
  "email": "student@test.com",
  "role": "STUDENT",
  "timezone": "Asia/Kolkata",
  "emailVerified": true
}
```

---

## 3. Study Materials API (`/api/v1/materials`)

### 3.1 Upload Document
- **Method / Path:** `POST /api/v1/materials`
- **Access:** Authenticated (Student)
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `file` (Binary file), `title` (Optional custom title).
- **Supported Formats:** PDF, DOCX, PPTX, XLSX, XLSM, CSV, TXT, MD.
- **Constraints:** Maximum 20 MB per file, 500 MB cumulative storage quota.
- **Response (202 Accepted):**
```json
{
  "id": 42,
  "title": "Operating_Systems_Concurrency.txt",
  "fileName": "Operating_Systems_Concurrency.txt",
  "fileSize": 1420,
  "status": "PROCESSING",
  "createdAt": "2026-11-01T02:00:00Z"
}
```

### 3.2 List User Materials
- **Method / Path:** `GET /api/v1/materials`
- **Access:** Authenticated (Student)
- **Query Params:** `page` (default 0), `size` (default 20), `status` (optional filter).
- **Response (200 OK):** Paginated JSON with `content`, `totalElements`, `totalPages`.

### 3.3 Get Extracted Material Text
- **Method / Path:** `GET /api/v1/materials/{id}/text`
- **Access:** Authenticated (Owner only)
- **Query Params:** `page` (default 0), `size` (default 100).
- **Response (200 OK):**
```json
{
  "id": 42,
  "title": "Operating Systems Concurrency",
  "text": "Full extracted text content...",
  "pageCount": 1,
  "status": "COMPLETED"
}
```

### 3.4 Delete Material
- **Method / Path:** `DELETE /api/v1/materials/{id}`
- **Access:** Authenticated (Owner only)
- **Behavior:** Cascades deletion of relational records, relational chunks, and removes vector embeddings from ChromaDB `smart_study_documents`.
- **Response (200 OK):** `{"message": "Material and associated embeddings deleted successfully"}`

---

## 4. AI Tutor API (`/api/v1/tutor`)

### 4.1 Grounded Tutor Ask
- **Method / Path:** `POST /api/v1/tutor/ask`
- **Access:** Authenticated (Student)
- **Request Body:**
```json
{
  "question": "What is the difference between Preemptive and Non-Preemptive scheduling?",
  "subject": "operating_systems",
  "conversationId": 14,
  "materialIds": [42],
  "mode": "learn"
}
```
- **Modes:** `"learn"` (Deep 9-step pedagogical masterclass) or `"quick_revision"` (High-yield summary with comparison tables).
- **Response (200 OK):**
```json
{
  "conversationId": 14,
  "answer": "### CPU Scheduling: Preemptive vs Non-Preemptive...",
  "sources": [
    {
      "source_name": "OS All Modules Notes.pdf",
      "citation": "OS All Modules Notes.pdf (Page 45)",
      "score": 0.726,
      "metadata": {"page": 45, "material_id": -1}
    }
  ],
  "messages": [
    {"role": "USER", "content": "..."},
    {"role": "TUTOR", "content": "...", "sources": [...]}
  ]
}
```

### 4.2 List Tutor Conversations (Paginated & Searchable)
- **Method / Path:** `GET /api/v1/tutor/conversations`
- **Access:** Authenticated (Student)
- **Query Params:**
  - `page`: Page index (default 0).
  - `size`: Page size (default 20).
  - `search`: Case-insensitive title and message content query.
- **Response (200 OK):** Spring Data `Page<TutorConversation>` with pagination metadata.

---

## 5. Quizzes & Assessments API (`/api/v1/quizzes`)

### 5.1 Generate Quiz
- **Method / Path:** `POST /api/v1/quizzes/generate`
- **Access:** Authenticated (Student)
- **Request Body:**
```json
{
  "topic": "Operating Systems Concurrency",
  "count": 5,
  "materialId": 42
}
```
- **Response (201 Created):** Returns generated quiz with unique ID and parsed questions list.

### 5.2 Submit Quiz Attempt
- **Method / Path:** `POST /api/v1/quizzes/{id}/attempts`
- **Access:** Authenticated (Student)
- **Request Body:**
```json
{
  "answers": ["Option B", "Option A", "Option C"]
}
```
- **Response (200 OK):**
```json
{
  "score": 3,
  "total": 3,
  "accuracyPercent": 100,
  "results": [
    {
      "question": "What is dual mode operation?",
      "selectedAnswer": "Option B",
      "correctAnswer": "Option B",
      "correct": true,
      "explanation": "Dual-mode operation allows the operating system to differentiate...",
      "sourceReference": "Operating Systems BCS303"
    }
  ]
}
```

---

## 6. Tasks & Study Planner API (`/api/v1/tasks` & `/api/v1/plans`)

### 6.1 Create Task
- **Method / Path:** `POST /api/v1/tasks`
- **Access:** Authenticated (Student)
- **Request Body:**
```json
{
  "title": "Solve Dijkstra and 0/1 Knapsack",
  "subject": "Analysis & Design of Algorithms",
  "scheduledDate": "2026-11-01",
  "estimatedMinutes": 45,
  "priority": "HIGH"
}
```
- **Validation Rules:**
  - `estimatedMinutes`: `@Min(5) @Max(600)`
  - `priority`: `@Pattern(regexp = "LOW|NORMAL|MEDIUM|HIGH")`

### 6.2 Task Status Transitions
- `POST /api/v1/tasks/{id}/complete` -> Status = `COMPLETED`, sets `completed_at`.
- `POST /api/v1/tasks/{id}/reopen` -> Status = `PENDING`, clears `completed_at`.
- `POST /api/v1/tasks/{id}/toggle` -> Toggles between `COMPLETED` and `PENDING`.

### 6.3 Generate Adaptive Study Plan
- **Method / Path:** `POST /api/v1/plans/generate`
- **Access:** Authenticated (Student)
- **Request Body:**
```json
{
  "availableMinutesPerDay": 60,
  "startDate": "2026-11-01"
}
```
- **Validation:** `availableMinutesPerDay` between 10 and 600. `startDate` must be today or in the future.

---

## 7. Focus & Pomodoro Sessions API (`/api/v1/focus/sessions`)

### 7.1 Start Focus Session
- **Method / Path:** `POST /api/v1/focus/sessions/start`
- **Access:** Authenticated (Student)
- **Request Body:** `{"taskId": 27}` (Optional).
- **Concurrency Invariant:** Rejects with `HTTP 409 Conflict` if an active or paused session is already open.

### 7.2 Session State Controls
- `PATCH /api/v1/focus/sessions/{id}/pause` -> Pauses session, accumulates active duration.
- `PATCH /api/v1/focus/sessions/{id}/resume` -> Resumes session, sets `activeSince = now()`.
- `POST /api/v1/focus/sessions/{id}/finish` -> Marks session `COMPLETED`, computes final duration.

---

## 8. Flashcards & SM-2 Spaced Repetition API (`/api/v1/flashcards`)

### 8.1 Review Flashcard (SuperMemo SM-2)
- **Method / Path:** `POST /api/v1/flashcards/{id}/review`
- **Access:** Authenticated (Owner)
- **Request Body:** `{"quality": 2}`
  - `0`: Again (Lapse: count=0, interval=1d, EF decreases by 0.20, min 1.30).
  - `1`: Hard (Interval * 1.2, EF decreases by 0.15).
  - `2`: Good (Interval sequence: 1d -> 3d -> interval * EF).
  - `3`: Easy (Interval sequence: 3d -> 6d -> interval * EF * 1.3, EF increases +0.15).
- **Response (200 OK):**
```json
{
  "card": {
    "id": 20,
    "easeFactor": 2.50,
    "intervalDays": 3,
    "reviewCount": 2,
    "lapses": 0,
    "nextReview": "2026-11-04"
  },
  "projectedIntervals": {
    "again": 1,
    "hard": 2,
    "good": 3,
    "easy": 6
  }
}
```

---

## 9. Parent Portal API (`/api/v1/parents`)

### 9.1 Request Link to Student
- **Method / Path:** `POST /api/v1/parents/links`
- **Access:** `ROLE_PARENT`
- **Request Body:** `{"studentEmail": "student@test.com"}`
- **Response (201 Created):** Link created with status `PENDING`.

### 9.2 Student Consent Approval / Rejection
- **Method / Path:** `POST /api/v1/parents/links/{id}`
- **Access:** `ROLE_STUDENT`
- **Request Body:** `{"action": "APPROVE"}` or `{"action": "REJECT"}`

### 9.3 Parent View Student Progress
- **Method / Path:** `GET /api/v1/parents/children/{studentId}/progress`
- **Access:** `ROLE_PARENT` (Requires approved link)
- **Response (200 OK):** Comprehensive read-only progress report (study minutes, task completions, quiz accuracy, status assessment). Raw documents and AI Tutor chat logs are omitted for student privacy.

---

## 10. Admin Portal API (`/api/v1/admin`)

### 10.1 System Diagnostics & Telemetry
- **Method / Path:** `GET /api/v1/admin/system`
- **Access:** `ROLE_ADMIN`
- **Response (200 OK):**
```json
{
  "users": 6,
  "students": 2,
  "parents": 2,
  "admins": 2,
  "totalMaterials": 21,
  "totalQuizzes": 16,
  "totalStudyMinutes": 130,
  "serverTelemetry": {
    "jvmUsedMemoryMB": 155,
    "jvmMaxMemoryMB": 3928,
    "memoryUsagePercent": 4,
    "availableProcessors": 12,
    "javaVersion": "25.0.2",
    "mlEngineStatus": "ONLINE"
  }
}
```

### 10.2 User Account Status Toggle (Suspend / Reactivate)
- **Method / Path:** `PATCH /api/v1/admin/users/{id}/toggle-status`
- **Access:** `ROLE_ADMIN`
- **Guardrails:** Admins cannot suspend their own account or the last remaining active admin.

