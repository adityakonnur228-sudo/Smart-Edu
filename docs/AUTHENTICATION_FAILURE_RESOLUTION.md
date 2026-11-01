# SMART STUDY PORTAL — CRITICAL AUTHENTICATION FAILURE AUDIT & RESOLUTION

**Document ID:** `AUTH-FIX-2026-11-01`  
**Status:** **RESOLVED & VERIFIED**  
**Workspace:** `D:\Smart Edu`  
**Verification Suite:** Playwright 14-Step End-to-End Suite (`frontend/test_full_auth_suite.js`)  
**Result:** **14/14 Workflows Passed (100%)**

---

## 1. Executive Summary

A Next.js runtime error overlay displaying `Console ApiError: Authentication required. Please log in.` at `frontend/src/lib/api.ts:44` occurred in the application.

Investigation through Playwright network telemetry, Spring Security filter analysis, and frontend query lifecycle inspection isolated a multi-layered authentication defect spanning both the client-side authentication lifecycle and Spring Boot cookie/CORS handling.

A comprehensive dual-transport authentication architecture (`Authorization: Bearer <token>` in `localStorage` + secure `study_session` HTTP-only cookies) with single-flight automatic token refresh, safe session cleanup, and graceful login redirection has been implemented, tested, and verified against all 14 authentication workflows.

---

## 2. Exact Failing Endpoint & Request Profile

### Request Breakdown
- **Primary Failing Endpoint:** `GET /api/v1/progress/overview` (and subresource requests `GET /api/v1/progress/trends`, `GET /api/v1/tutor/conversations/1`).
- **HTTP Method:** `GET`
- **HTTP Status:** `401 Unauthorized`
- **Origin:** `http://localhost:3000` (and `http://localhost`)
- **Headers Sent:**
  - `Content-Type: application/json`
  - `Authorization`: **MISSING / NOT ATTACHED**
  - `Cookie`: **MISSING OR REJECTED**
- **Response Headers:**
  - `WWW-Authenticate: None`
  - `Content-Type: application/json`
- **Response Body:**
  ```json
  {"error":"Authentication required. Please log in.","code":"UNAUTHORIZED"}
  ```
- **Backend Filter Rejecting Request:** `org.springframework.security.web.access.intercept.AuthorizationFilter` delegating to `SecurityConfig.authenticationEntryPoint`.
- **Frontend Exception Point:** `frontend/src/lib/api.ts:44` inside `handleResponse()`:
  ```typescript
  const message = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
  throw new ApiError(message, response.status, errorData.code, errorData.fieldErrors, errorData.traceId);
  ```

---

## 3. Confirmed Root Causes

### 1. Missing Authorization Header in Frontend API Client
Although `getAuthHeaders()` was defined in `frontend/src/lib/api.ts`, it was **never invoked or merged** into `headers` in `api.get`, `api.post`, `api.patch`, `api.put`, `api.delete`, or `api.upload`. The client relied solely on cookies.

### 2. Failure to Persist JWT Token upon Successful Login / Register
In `frontend/src/app/auth-form.tsx`, both `performLogin()` and `submit()` received `{ id, name, email, role, token }` from `POST /api/v1/auth/login`. However, neither method persisted `token` to `localStorage.setItem('study_token', ...)`. As a consequence, `localStorage.getItem('study_token')` was always empty.

### 3. Lack of Central 401 Handling & Token Refresh Flow
When a protected endpoint returned HTTP 401, `api.ts` immediately threw an unhandled `ApiError`. The client had:
- No token refresh mechanism.
- No single retry attempt.
- No central session cleanup.
- No graceful redirection to `/login?redirect=...`.
TanStack Query hooks on `/analytics` and `/ai-tutor` surfaced this unhandled rejection directly to Next.js's development error overlay.

### 4. Absence of Client-Side Route Protection on Analytics
Unlike `dashboard/page.tsx` and `tasks/page.tsx` which executed auth checks on mount, `analytics/page.tsx` directly initiated `useProgressOverview()` queries on initial render. If unauthenticated, the queries immediately threw 401 errors before any redirect could occur.

### 5. Backend CORS Origin Pattern Gap
`SecurityConfig.java` configured allowed origins as `http://localhost:[*]` (requiring a colon and port). Requests with `Origin: http://localhost` (default port 80) did not match the pattern.

### 6. Missing Token Refresh Endpoint on Spring Boot
Spring Boot had no `/api/v1/auth/refresh` endpoint. Once the 1-hour session expired, requests could not be refreshed transparently, requiring full re-authentication.

---

## 4. Architectural Resolution & Code Changes

### 4.1 Backend Security Enhancements

1. **Token Refresh Endpoint (`backend/src/main/java/edu/smartstudy/auth/AuthController.java`)**:
   - Added `POST /api/v1/auth/refresh` accepting session credentials via either `study_session` cookie or `Authorization: Bearer <token>`.
   - Validates HMAC signature, user active status, and `token_version` match against MySQL.
   - Re-issues a fresh 1-hour session cookie and JWT.

2. **Expired Claims Refresh Parsing (`backend/src/main/java/edu/smartstudy/security/TokenService.java`)**:
   - Added `parseClaimsForRefresh(String token)`.
   - Captures `ExpiredJwtException` and permits token renewal within a 7-day grace period provided the HMAC signature is valid and the user has not invalidated their session via password reset or logout.

3. **Configurable Local vs Production Cookie Settings (`AuthController.java`)**:
   - Added dynamic cookie configuration:
     - Local development (`COOKIE_SECURE=false`): Sets `Secure=false`, `SameSite=Lax`.
     - Production (`COOKIE_SECURE=true`): Sets `Secure=true`, `SameSite=None`.
     - Supports optional environment overrides for `COOKIE_SAME_SITE` and `COOKIE_DOMAIN`.

4. **CORS Pattern Hardening (`backend/src/main/java/edu/smartstudy/security/SecurityConfig.java`)**:
   - Explicitly added `http://localhost`, `http://127.0.0.1`, `https://localhost`, `https://127.0.0.1` alongside wildcard port patterns.
   - Added `POST /api/v1/auth/refresh` to `permitAll()` (allowing refresh of expired tokens).

### 4.2 Frontend Authentication Lifecycle Enhancements

1. **Centralized Dual-Transport Client (`frontend/src/lib/api.ts`)**:
   - Added `getAuthToken()`, `setAuthToken(token)`, and `getAuthHeaders()`.
   - Implemented `fetchWithAuth(url, options)` which merges `Authorization: Bearer <token>` and `credentials: 'include'`.
   - Single-flight token refresh coordination via `attemptTokenRefresh()` to prevent concurrent refresh storms.
   - Automatic single retry (`_retry: true`) of failed requests upon successful refresh.
   - Safe session invalidation and redirection to `/login?redirect=...&reason=session_expired` avoiding redirect loops.
   - Bound all `api.get`, `api.post`, `api.patch`, `api.put`, `api.delete`, `api.upload`, `api.download` to `fetchWithAuth`.

2. **Login & Registration Persistence (`frontend/src/app/auth-form.tsx`)**:
   - Persists `body.token` via `setAuthToken(body.token)` on successful authentication.
   - Preserves intended destination (`redirectParam`) upon login redirect.
   - Detects `reason=session_expired` query parameter to display an informative warning banner instead of a runtime error.
   - Wrapped `login/page.tsx` and `register/page.tsx` in `<Suspense>` to ensure static page optimization compatibility.

3. **Protected Module Guarding & Silent 401 Handling**:
   - Updated `navbar.tsx`, `dashboard/page.tsx`, `ai-tutor/page.tsx`, `analytics/page.tsx`, `tasks/page.tsx`, `focus/page.tsx`, `quizzes/page.tsx`, `parent/page.tsx`, and `admin/page.tsx` to include `getAuthHeaders()`.
   - Added client-side authentication check on mount in `analytics/page.tsx`.
   - Handled 401 responses silently in `ai-tutor/page.tsx` to prevent console error forwarding to Next.js error overlays.

---

## 5. Local Versus Production Cookie Settings

| Parameter | Local HTTP Development | Production Cloud (Vercel + Railway) |
| :--- | :--- | :--- |
| **Protocol** | `http://` | `https://` |
| **Frontend Origin** | `http://localhost:3000` or `http://localhost` | `https://smart-study-web.vercel.app` |
| **Backend API** | `http://localhost:8080/api/v1` | `https://smart-study-backend.up.railway.app/api/v1` |
| **Cookie `Secure`** | `false` | `true` |
| **Cookie `SameSite`** | `Lax` | `None` (required for cross-site fetch) |
| **Cookie `HttpOnly`** | `true` | `true` |
| **Cookie `Path`** | `/` | `/` |
| **Fallback Transport** | `Authorization: Bearer <token>` | `Authorization: Bearer <token>` (active fallback if third-party cookies blocked) |

---

## 6. Before-and-After HTTP Responses

### Before: Unauthenticated Request to `/api/v1/progress/overview`
```http
GET /api/v1/progress/overview HTTP/1.1
Host: localhost:8080
Origin: http://localhost:3000
Content-Type: application/json

HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Authentication required. Please log in.","code":"UNAUTHORIZED"}
```
*(Result: Next.js dev overlay crashed with `Console ApiError: Authentication required. Please log in.` at `api.ts:44`)*

### After: Unauthenticated Request to `/api/v1/progress/overview`
```http
GET /api/v1/progress/overview HTTP/1.1
Host: localhost:8080
Origin: http://localhost:3000
Content-Type: application/json

HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Authentication required. Please log in.","code":"UNAUTHORIZED"}
```
*(Result: Intercepted by `fetchWithAuth()`. Refresh attempted -> failed -> clean redirect to `http://localhost:3000/login?redirect=%2Fanalytics&reason=session_expired`. **Zero runtime error overlays.**)*

### After: Authenticated Request with Dual Transport
```http
GET /api/v1/progress/overview HTTP/1.1
Host: localhost:8080
Origin: http://localhost:3000
Authorization: Bearer eyJhbGciOiJIUzM4NCJ9...
Cookie: study_session=eyJhbGciOiJIUzM4NCJ9...

HTTP/1.1 200 OK
Content-Type: application/json

{
  "totalStudyMinutes": 100,
  "completedTasks": 4,
  "totalTasks": 6,
  "taskCompletionPercent": 66.7,
  "quizAttempts": 8,
  "quizAccuracyPercent": 85.0
}
```

---

## 7. Playwright End-to-End Verification Results

Test execution script: `frontend/test_full_auth_suite.js`

```text
======================================================
PLAYWRIGHT AUTHENTICATION VERIFICATION SUMMARY
======================================================
✅ [PASS] Step 1: Open application logged out
   Home page loaded, title: "Smart Study Portal | Adaptive AI Learning Workspace"
✅ [PASS] Step 2: Public routes accessibility
   Routes /, /login, and /register are fully accessible.
✅ [PASS] Step 3/4: Redirection for /dashboard
   Cleanly redirected to: http://localhost:3000/login
✅ [PASS] Step 3/4: Redirection for /ai-tutor
   Cleanly redirected to: http://localhost:3000/login?redirect=%2Fai-tutor&reason=session_expired
✅ [PASS] Step 3/4: Redirection for /analytics
   Cleanly redirected to: http://localhost:3000/login?redirect=%2Fanalytics&reason=session_expired
✅ [PASS] Step 3/4: Redirection for /tasks
   Cleanly redirected to: http://localhost:3000/login
✅ [PASS] Step 3/4: Redirection for /focus
   Cleanly redirected to: http://localhost:3000/login
✅ [PASS] Step 3/4: Redirection for /quizzes
   Cleanly redirected to: http://localhost:3000/login
✅ [PASS] Step 5: Log in with valid credentials
   Redirected to http://localhost:3000/dashboard. Bearer token and study_session cookie successfully stored.
✅ [PASS] Step 6: Protected API requests succeed
   User verified: Student User (STUDENT)
✅ [PASS] Step 7/8: Reload & authentication persistence
   Authentication state persists on reload without redirects.
✅ [PASS] Step 9/10: Module navigation to /dashboard
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 9/10: Module navigation to /ai-tutor
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 9/10: Module navigation to /quizzes
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 9/10: Module navigation to /tasks
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 9/10: Module navigation to /focus
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 9/10: Module navigation to /analytics
   Rendered cleanly with no runtime overlay.
✅ [PASS] Step 11/12: Logout and protected route lockdown
   Protected route locked after logout. Redirected to: http://localhost:3000/login
✅ [PASS] Step 13: Expired/invalid token rejection
   Backend correctly returns HTTP 401 for invalid token.
✅ [PASS] Step 14: Student authorization / RBAC check
   Student access to admin resources correctly rejected with HTTP 403.
======================================================
Final Result: ALL 14 TEST WORKFLOWS PASSED
======================================================
```

---

## 8. Captured Artifacts & Visual Proof

1. **Login Redirection with Session Notice:**  
   [`auth_verified_login_redirect.png`](file:///C:/Users/Aditya/.gemini/antigravity/brain/ffaef119-7340-4c04-889b-744f1e8596c5/auth_verified_login_redirect.png)  
   Shows graceful redirection to `/login?redirect=%2Fanalytics&reason=session_expired` without uncaught runtime errors.

2. **Clean Analytics Navigation:**  
   [`auth_verified_analytics_clean.png`](file:///C:/Users/Aditya/.gemini/antigravity/brain/ffaef119-7340-4c04-889b-744f1e8596c5/auth_verified_analytics_clean.png)  
   Verified focus telemetry, live study timer, and analytics dashboard rendered cleanly with zero error overlays.

3. **Clean AI Tutor Navigation:**  
   [`auth_verified_aitutor_clean.png`](file:///C:/Users/Aditya/.gemini/antigravity/brain/ffaef119-7340-4c04-889b-744f1e8596c5/auth_verified_aitutor_clean.png)  
   Source-grounded AI Tutor interface rendered with active conversations and zero runtime warnings.

---

## 9. Remaining Issues

None. All 14 authentication workflows pass without warnings or regressions.
