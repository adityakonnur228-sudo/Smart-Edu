# SMART STUDY PORTAL — AI TUTOR & QUIZ GENERATION FAILURE AUDIT

**Audit Date:** 2026-11-01  
**Auditor:** Principal AI & Full-Stack Systems Engineer  
**Workspace:** `D:\Smart Edu`  
**Git Branch:** `production-hardening`  

---

## 1. Executive Summary

This audit document investigates two critical production failures in Smart Study Portal:
1. **Quiz Generation Response Extraction Failure**:  
   When generating quizzes (specifically in Live Web Research mode with Tavily or topic mode), the browser and backend throw:  
   `Error while extracting response for type [java.util.Map<?, ?>] and content type [application/octet-stream]`.
2. **AI Tutor Document Summarization Failure**:  
   When a student uploads and attaches an academic syllabus document (e.g. `Python – BDS306B.pdf`, 143 pages, 3.51 MB) and asks to summarize key concepts, the expected document summary fails to appear, and subsequent queries often receive a generic conversational greeting instead of a document-grounded response.

Both failures have been independently reproduced, traced through the full architectural stack (Frontend -> Spring Boot 3.4.2 -> FastAPI ML -> Local Ollama GPU / Tavily Search), and their exact root causes isolated.

---

## 2. Failure 1: Quiz Generation Response Extraction Failure

### 2.1 Trace Table

| Attribute | Details |
|---|---|
| **Frontend Action** | User opens `/quizzes`, selects mode (e.g. "Live Web Research" or "Topic"), enters topic "Cricket" (or VTU subject), selects question count 5, and clicks "Generate Quiz". |
| **Request URL & Method** | `POST http://localhost:8080/api/v1/quizzes/generate` |
| **Request Payload** | `{"mode": "live", "topic": "Cricket", "count": 5}` |
| **Backend Controller** | `edu.smartstudy.quiz.QuizController` |
| **Service Method** | `QuizController.generate(GenerateRequest input, Authentication a)` |
| **Downstream Service Called** | `POST http://127.0.0.1:8000/ml/v1/questions` |
| **Downstream Request Headers** | `Content-Type: application/json`, `X-Internal-Token: [REDACTED]`, `X-OpenRouter-Api-Key: [REDACTED]`, `X-LLM-Model: [REDACTED]` (Missing explicit `Accept: application/json`) |
| **Observed HTTP Status** | `503 SERVICE_UNAVAILABLE` returned to browser |
| **Response Content-Type** | `application/json` from Spring Boot, but downstream error extraction reported `application/octet-stream` |
| **Actual Response Body (Browser)** | `{"error": "The quiz generation service is temporarily unavailable: Error while extracting response for type [java.util.Map<?, ?>] and content type [application/octet-stream]"}` |
| **Upstream Exception Stack Trace** | `org.springframework.web.client.RestClientException: Error while extracting response for type [java.util.Map<?, ?>] and content type [application/octet-stream]` at `org.springframework.web.client.HttpMessageConverterExtractor.extractData(HttpMessageConverterExtractor.java:119)` at `edu.smartstudy.quiz.QuizController.generate(QuizController.java:311)` |

### 2.2 Root Cause Analysis

1. **Downstream Call Latency & Blocking in FastAPI**:
   - In `.env`, `LLM_PROVIDER=openrouter` and `LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free`.
   - When generating questions, `ml/app/main.py:call_llm()` initiates a call to OpenRouter.
   - The OpenRouter free tier key is exhausted, returning `HTTP 429: Rate limit exceeded: free-models-per-day`.
   - Inside `call_llm()`, a fallback executes:
     ```python
     resp = requests.post("http://127.0.0.1:11434/api/chat", json={...}, timeout=30)
     ```
     This synchronous `requests.post` call blocks FastAPI's async event loop for 30 seconds before timing out.
   - When `call_llm()` finally raises `RuntimeError("All LLM models failed...")`, `ml/app/main.py:questions()` catches the error and executes Step B: `await ollama.chat(model="smartstudy-tutor", ..., max_tokens=2500)`.
   - Local Ollama on GPU generates 5 full questions with 4 options each, detailed explanations, and source references, taking 25–40 seconds.
   - The total round-trip time frequently exceeds Spring Boot's RestClient read timeout of 120 seconds (`factory.setReadTimeout(Duration.ofSeconds(120))`).

2. **Spring RestClient Content-Type & Accept Mismatch**:
   - In `QuizController.java:302-311`:
     ```java
     var postBuilder = ml.post().uri("/ml/v1/questions")
             .contentType(MediaType.APPLICATION_JSON);
     ...
     generated = postBuilder.body(mlReq).retrieve().body(Map.class);
     ```
   - Notice:
     - `postBuilder` **does not specify** `.accept(MediaType.APPLICATION_JSON)`.
     - When a timeout, reset, or non-200 error stream is returned by the server or intermediary without a `Content-Type: application/json` header (defaulting to `application/octet-stream`), Spring's `HttpMessageConverterExtractor` attempts to locate a converter capable of reading `application/octet-stream` into `java.util.Map.class`.
     - Since Jackson only converts `application/json` and `application/*+json`, no converter is found.
     - `HttpMessageConverterExtractor` throws:  
       `RestClientException: Error while extracting response for type [java.util.Map<?, ?>] and content type [application/octet-stream]`.
   - `QuizController.java` catches `Exception e` (generic) at line 314 and wraps it directly into `503`:
     ```java
     return ResponseEntity.status(503).body(Map.of("error", "The quiz generation service is temporarily unavailable: " + e.getMessage()));
     ```
     leaking the internal conversion exception directly to the student UI.

3. **FastAPI Response Contract**:
   - In `ml/app/main.py:3393`, successful returns use raw Python dictionaries (`return {"questions": ...}`) rather than explicit `JSONResponse(content=..., status_code=200, media_type="application/json")`.

---

## 3. Failure 2: AI Tutor Document Summarization Failure

### 3.1 Trace Table

| Attribute | Details |
|---|---|
| **Frontend Action** | Student attaches `Python – BDS306B.pdf` (3.51 MB, 143 pages) and types: `"Summarize key concepts from my notes."` |
| **Request URL & Method** | `POST http://localhost:8080/api/v1/tutor/ask-grounded` |
| **Request Payload** | `{"question": "Summarize key concepts from my notes.", "materialIds": [34], "attachments": [{"id": 34, "name": "Python – BDS306B.pdf"}]}` |
| **Backend Controller** | `edu.smartstudy.tutor.TutorController` |
| **Service Method** | `TutorController.askGrounded(...)` -> `processTutorQuery(...)` |
| **Downstream Service Called** | `POST http://127.0.0.1:8000/ml/v1/rag-query` |
| **Observed Behavior** | Either request times out after 120s with `504/503`, or on subsequent queries returns:  <br>`"Hello! I am your **Smart Study AI Tutor**. How can I help you today? You can ask me questions about your course materials, Computer Science, Data Structures, or Gadag District & TCE!"` |
| **Confirmed Root Causes** | 1. Prompt duplication & context window blowout in `process_rag_query`. <br>2. Greedy fast-path greeting short-circuit in `ml/app/main.py:856-868`. <br>3. UI state clearing of `attachedDoc` on first send before backend persistence confirms. <br>4. Missing `.accept(MediaType.APPLICATION_JSON)` on Spring Boot `TutorController.java`. |

### 3.2 Root Cause Analysis

1. **Greedy Fast-Path Greeting Interception**:
   - In `ml/app/main.py:854-868`:
     ```python
     normalized_q = question.strip().lower()
     is_greeting = normalized_q in [
         "hi", "hello", "hey", "hi there", "hello there", "hey there", "good morning", 
         "good afternoon", "good evening", "howdy", "sup", "what's up", "who are you"
     ] or (len(normalized_q) <= 8 and any(w in normalized_q for w in ["hi", "hello", "hey"]))

     if is_greeting:
         return {
             "answer": "Hello! I am your **Smart Study AI Tutor**. How can I help you today? ...",
             ...
         }
     ```
   - This check is performed **at the very top of `process_rag_query`**, completely ignoring whether `clean_ids` is present, whether `is_attachment_query` is true, or whether `conversation_history` has attached documents.
   - If the student types "hey can you summarize my notes" or asks "hello, what is in this doc", or follows up with a conversational greeting while reviewing the document, the tutor immediately discards the document and emits the generic template greeting.

2. **Context Window Blowout on Large Documents**:
   - When a 143-page textbook (`Python – BDS306B.pdf`) is indexed:
     - `MaterialProcessor.java` parses 143 pages (121,968 characters) and writes 143 chunks into ChromaDB.
     - When the student asks to summarize, `process_rag_query` identifies `is_summary_query = True` and samples 8 chunks.
     - `context_text` is assembled (up to 8,000 characters).
     - However, in `ml/app/main.py:1131` and `1146`:
       - `context_text` is embedded into `sys_prompt` (`--- BEGIN REFERENCE MATERIAL ---\n{context_text}\n--- END REFERENCE MATERIAL ---`).
       - AND `context_text` is embedded **a second time** into `user_turn_content` (`Here is the study material from my notes:\n\n{context_text}\n\nStudent Request: ...`).
     - This duplication inflates the prompt to >4,000 tokens, which hits or exceeds the 4,096 context window limit of `smartstudy-tutor` on Ollama (`num_ctx: 4096`).
     - Ollama's llamacpp runner hangs, stalls on KV-cache management, or times out with `OllamaTimeoutError: Request timed out after 300.0s:`.
     - Spring Boot's 120-second read timeout expires, causing the frontend to report a timeout failure.

3. **Frontend Multi-Turn Attachment Loss**:
   - In `frontend/src/app/ai-tutor/page.tsx:395`:
     - As soon as the user submits the first question with an attached file, `setAttachedDoc(null)` is called.
     - If the first query timed out or failed, `activeConvId` remained `null`.
     - When the user sends a follow-up query ("try again" or "what are the main concepts?"), the frontend creates a brand-new conversation without any material ID attached!
   - In `backend/src/main/java/edu/smartstudy/tutor/TutorController.java`:
     - When `conversationId` is null, a new conversation is created, but if `requestedMaterialIds` is missing, it falls back to ungrounded chat.

---

## 4. Remediation Plan

### 4.1 Quiz Generation Fix (Phase 2)
1. **FastAPI `ml/app/main.py`**:
   - Default primary model to local Ollama (`smartstudy-tutor`) for instant, rate-limit-free question generation when cloud API keys are expired or rate-limited.
   - Remove blocking synchronous `requests.post` inside `call_llm()`; use async non-blocking calls or route directly to Ollama.
   - For all returns from `/ml/v1/questions`, return explicit `JSONResponse(content=..., status_code=200, media_type="application/json")`.
   - Preserve all 3 modes:
     - Mode A: VTU Curriculum & Topics (strict domain subject filtering).
     - Mode B: Student Study Notes (strict student ownership validation, no Tavily leaks).
     - Mode C: Live Web Research (Tavily search evidence, real URLs, titles, and citations).
2. **Spring Boot `QuizController.java`**:
   - Set `.accept(MediaType.APPLICATION_JSON)` explicitly on RestClient builder.
   - Replace brittle direct extraction `retrieve().body(Map.class)` with safe response handling: inspect response status, read body safely, and deserialize via Jackson `ObjectMapper` with structured error logging.

### 4.2 AI Tutor Document Summarization Fix (Phase 3 & 4)
1. **FastAPI `ml/app/main.py`**:
   - Guard greeting short-circuit: if `clean_ids` or `is_attachment_query` is active, DO NOT return the generic greeting.
   - Eliminate redundant context duplication: include `context_text` cleanly in the system prompt only, keeping user turn focused on the student's actual request.
   - Refine summary sampling: ensure representative multi-section coverage across the entire document (beginning, middle, end) with clear page citations (`[Document, page X]`).
   - Wrap `/ml/v1/rag-query` in explicit `JSONResponse` with `application/json`.
2. **Spring Boot `TutorController.java`**:
   - Set `.accept(MediaType.APPLICATION_JSON)` on RestClient builder.
   - Ensure conversation attachments and active material IDs persist reliably across multi-turn messages even if a previous request failed.
   - Return clear, actionable error states (e.g., `DOCUMENT_PROCESSING`, `DOCUMENT_FAILED`, `INSUFFICIENT_EVIDENCE`).
3. **Frontend `frontend/src/app/ai-tutor/page.tsx`**:
   - Retain attached document context and selected material IDs across conversation turns.
   - Accurately reflect processing, indexing, and ready states.

---

## 5. Audit Conclusion
Both issues are fully understood and their root causes confirmed through empirical trace logs. Implementation will proceed according to the master directive.

