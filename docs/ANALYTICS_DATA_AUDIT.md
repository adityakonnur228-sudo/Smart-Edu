# SMART STUDY PORTAL — REAL-TIME ANALYTICS DATA & ARCHITECTURE AUDIT

## 1. Executive Summary

An exhaustive investigation of the Smart Study Portal analytics pipeline was conducted across the frontend (Next.js 16, React 19, TanStack React Query), backend (Spring Boot 3.4.2, Spring Security, JPA Hibernate), and database (MySQL 8).

While the application persisted focus sessions, task completions, and quiz submissions to MySQL, the Analytics dashboard frequently appeared frozen, displayed static mock data, or failed to update in real time when mutations occurred.

---

## 2. Identified Root Causes

### Root Cause 1: Raw Fetch and Silent Demo Data Fallback in `AnalyticsPage`
* **File:** `frontend/src/app/analytics/page.tsx` (Lines 72–119)
* **Issue:** Instead of utilizing the existing TanStack Query cache (`useProgressOverview`, `useProgressTrends`), `AnalyticsPage` executed raw `fetch()` calls. 
* **Failure Mechanism:** The `load()` function was wrapped in a broad `try { ... } catch { ... }` block that unconditionally substituted real user data with static mock fixtures (`demoOverview`, `demoTrends`, and mock quiz records like "Cellular Respiration & ATP") on any transient HTTP error, network latency, or non-200 response. This silently masked failures and permanently locked the UI into demo state without informing the user.

### Root Cause 2: Lack of Mutation-Driven Invalidation Across Modules
* **Files:** `frontend/src/hooks/useTasks.ts`, `frontend/src/hooks/useFocus.ts`, `frontend/src/app/quizzes/[id]/page.tsx`, `frontend/src/app/focus/page.tsx`, `frontend/src/app/tasks/page.tsx`
* **Issue:** Write operations (task completion, focus session finish, quiz submission) only invalidated their local query keys (`['tasks']`, `['focus']`) or executed direct fetches. None invalidated `['progress']` or `['analytics']`.
* **Failure Mechanism:** When a student finished a 25-minute focus session or completed a study task, the analytics cache remained unaware, leaving numbers unchanged until a hard refresh or unmanaged interval ran.

### Root Cause 3: Unmanaged Polling & Out-of-Order Race Conditions
* **File:** `frontend/src/app/analytics/page.tsx` (Lines 121–133)
* **Issue:** Polling was implemented via `setInterval(..., 3000)` invoking asynchronous `load()`.
* **Failure Mechanism:** When network requests took longer than 3 seconds or executed under load, multiple overlapping requests resulted in out-of-order state updates (`setState`), race conditions, and unthrottled background polling even when tabs were inactive or backgrounded.

### Root Cause 4: Server Timezone Variance (`ZoneId.systemDefault()`)
* **File:** `backend/src/main/java/edu/smartstudy/progress/ProgressController.java` (Line 78)
* **Issue:** Trends and daily aggregations calculated date boundaries using `ZoneId.systemDefault()`.
* **Failure Mechanism:** In environments where the host or JVM defaults to UTC (e.g. Docker, Windows default UTC, cloud servers), midnight occurs at 05:30 AM IST. Activity recorded between midnight IST and 05:30 AM IST was misattributed to the previous day or discarded, creating discrepancies between the "Today" card and the 7-day distribution chart. The display timezone must strictly be `ZoneId.of("Asia/Kolkata")`.

### Root Cause 5: Unfiltered Focus Session Status in Trends
* **File:** `backend/src/main/java/edu/smartstudy/progress/ProgressController.java` (Line 87)
* **Issue:** `focus.findByStudentIdAndStartedAtGreaterThanEqualOrderByStartedAtAsc` retrieved all sessions regardless of status.
* **Failure Mechanism:** While `overview()` correctly summed only `COMPLETED` sessions via `@Query("... status='COMPLETED'")`, `trends()` iterated over all sessions without filtering out abandoned, paused, or invalid sessions, causing weekly chart sums to disagree with cumulative totals.

### Root Cause 6: Topic Mastery Architectural Gap
* **Files:** `frontend/src/app/analytics/page.tsx` (Lines 287–310) & `backend/src/main/java/edu/smartstudy/quiz/QuizController.java` (Lines 80–104)
* **Issue:** Topic mastery was derived on the frontend from the `/quizzes` list endpoint, which naively stripped `"Quiz on "` from quiz titles.
* **Failure Mechanism:** 
  1. Live web research quizzes (e.g., "Samay Raina", "WWE", "Formula 1") were treated identically to VTU engineering curriculum (e.g., "Operating Systems", "Computer Networks").
  2. Single quiz attempts with 1 question were evaluated as 100% "Mastered", with zero confidence threshold or insufficient-data state.

### Root Cause 7: Missing Cache-Control Headers on Authenticated Analytics Endpoints
* **File:** `backend/src/main/java/edu/smartstudy/progress/ProgressController.java`
* **Issue:** Spring Boot endpoints did not set `Cache-Control: no-store, no-cache, must-revalidate`.
* **Failure Mechanism:** Browsers and Next.js internal fetch caches could serve cached 304 or 200 responses rather than executing fresh database queries.

### Root Cause 8: Dishonest Status Indicator
* **File:** `frontend/src/app/analytics/page.tsx` (Lines 346–354)
* **Issue:** The UI displayed "Live Telemetry" with a green pulsing badge unconditionally, even when falling back to demo data or when background syncing failed.

---

## 3. Database Sources & Metric Definitions Audit

| Metric | Source Database Table | Verification Rule | Status |
| :--- | :--- | :--- | :--- |
| **Total Study Time** | `focus_sessions` (`status='COMPLETED'`) | `COALESCE(SUM(duration_seconds), 0)` + active ongoing session if present (capped at 4h). | Audited & Validated |
| **Weekly Study Time** | `focus_sessions` (`status='COMPLETED'`) | Filtered to last 7 days starting from `Asia/Kolkata` midnight. | Audited & Fixed |
| **Tasks Completed** | `study_tasks` (`status='COMPLETED'`) | Authenticated `student_id`, count of completed vs total. | Audited & Validated |
| **Task Velocity %** | `study_tasks` | `(completed / total) * 100` (rounded). 0% if total == 0. | Audited & Validated |
| **Active Practice Days**| `focus_sessions`, `study_tasks`, `quiz_attempts` | Distinct calendar dates in `Asia/Kolkata` in the past 7 days with study minutes > 0, completed task, or quiz attempt. | Audited & Fixed |
| **Quiz Accuracy** | `quiz_attempts` | Weighted: `SUM(score) / SUM(total_questions) * 100`. Excludes unweighted averages. | Audited & Validated |
| **7-Day Distribution**| `focus_sessions` (`status='COMPLETED'`) | 7 daily buckets in `Asia/Kolkata`. Daily sum reconciles with week total. | Audited & Fixed |
| **Daily Breakdown** | `focus_sessions`, `study_tasks`, `quiz_attempts` | Daily row per date showing study minutes, tasks completed, and quiz accuracy. | Audited & Fixed |
| **Topic Mastery** | `quizzes`, `quiz_attempts`, `materials` | VTU academic modules categorized separately from Live Web Research. Minimum 2 attempts required for mastery confidence. | Audited & Fixed |

---

## 4. Planned Corrective Action Plan

1. **Backend (`edu.smartstudy.progress.ProgressController.java` & DTOs):**
   - Enforce `ZoneId.of("Asia/Kolkata")` across all date calculations.
   - Filter `trends()` focus sessions strictly to `status='COMPLETED'`.
   - Add dedicated `/api/v1/analytics/mastery` and enriched `/overview` response with HTTP `Cache-Control: no-store, no-cache, must-revalidate`.
   - Separate VTU Academic Topics (`isAcademic: true`) from Live Web Research (`isAcademic: false`).
   - Add `confidenceStatus` (`INSUFFICIENT_DATA` if < 2 attempts, `MASTERED` if >= 80% and >= 2 attempts, `PRACTICING` if 60-79%, `NEEDS_REVIEW` if < 60%).
2. **Frontend TanStack Query Integration:**
   - Migrate `AnalyticsPage` to TanStack Query (`useQuery` with `queryKey: ['analytics', 'overview']`, `['analytics', 'trends']`, `['analytics', 'mastery']`).
   - Configure polling: `refetchInterval: (query) => (document.visibilityState === 'visible' ? 6000 : false)`.
   - Enable `refetchOnWindowFocus: true`.
   - Remove demo data fallback in catch blocks; render honest error and stale states.
   - Display honest sync badges: `Live`, `Syncing...`, `Connection Error`, `Data may be outdated`.
3. **Cross-Module Mutation Invalidation:**
   - Invalidate `['analytics']` and `['progress']` on task creation/completion/deletion, focus session finish, and quiz attempt submission.
   - Implement window event `smartstudy:mutation` for cross-component cache synchronization.
4. **End-to-End Automated Testing:**
   - Execute Playwright verification of live auto-refresh during real focus sessions, task toggles, and quiz submissions without manual page reload.

