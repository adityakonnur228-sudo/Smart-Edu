import json
import unittest
from io import BytesIO
from starlette.datastructures import UploadFile
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from app.main import TextInput, extract, health, keywords, topics, summarize
from app.ollama_client import close_ollama_client
from app.vector_store import close_vector_store

def _to_data(res):
    if isinstance(res, JSONResponse):
        return json.loads(res.body.decode("utf-8"))
    return res

class ServiceTests(unittest.TestCase):
    def test_health(self):
        from unittest.mock import AsyncMock, patch, MagicMock

        async def health_and_close_clients():
            try:
                return await health()
            finally:
                await close_ollama_client()
                await close_vector_store()

        # 1. Unmocked runtime check: process liveness is operational, status reflects actual readiness
        res = self.run_async(health_and_close_clients())
        status = res.status if hasattr(res, "status") else res["status"]
        liveness = res.liveness if hasattr(res, "liveness") else res.get("liveness")
        readiness = res.readiness if hasattr(res, "readiness") else res.get("readiness")
        self.assertEqual(liveness, "healthy")
        self.assertIn(status, ["healthy", "degraded"])
        self.assertEqual(status, readiness)

        # 2. Mocked healthy external dependency: verify readiness and status report healthy
        mock_healthy = MagicMock()
        mock_healthy.health_check = AsyncMock(return_value={
            "server": "healthy",
            "chat_model": {"available": True, "name": "smartstudy-tutor"}
        })
        with patch("app.main.get_ollama_client", return_value=mock_healthy):
            res_h = self.run_async(health())
            self.assertEqual(res_h.liveness, "healthy")
            self.assertEqual(res_h.readiness, "healthy")
            self.assertEqual(res_h.status, "healthy")

        # 3. Mocked degraded external dependency: verify readiness and status report degraded without masking
        mock_degraded = MagicMock()
        mock_degraded.health_check = AsyncMock(return_value={
            "server": "offline",
            "error": "Connection refused",
            "chat_model": {"available": False}
        })
        with patch("app.main.get_ollama_client", return_value=mock_degraded):
            res_d = self.run_async(health())
            self.assertEqual(res_d.liveness, "healthy")
            self.assertEqual(res_d.readiness, "degraded")
            self.assertEqual(res_d.status, "degraded")

    def test_keyword_extraction(self):
        result = self.run_async(keywords(TextInput(text="Photosynthesis converts light energy into chemical energy. Photosynthesis supports plant growth.")))
        self.assertEqual(result["keywords"][0]["keyword"], "photosynthesis")

    def test_topic_extraction_handles_empty_candidate_set(self):
        result = self.run_async(topics(TextInput(text="the and are is for")))
        self.assertEqual(result["topics"], [])

    def test_summary_is_marked_as_draft(self):
        from unittest.mock import AsyncMock, patch, MagicMock

        # Mock OllamaClient with a deterministic summary response
        mock_client = MagicMock()
        mock_client.config = MagicMock(chat_model="smartstudy-tutor")
        mock_client.health_check = AsyncMock(return_value={
            "server": "healthy",
            "chat_model": {"available": True, "name": "smartstudy-tutor"}
        })
        mock_client.chat = AsyncMock(return_value={
            "message": {"content": "A cell is the basic unit of life and foundational biological structure."}
        })

        with patch("app.main.get_ollama_client", return_value=mock_client):
            # Test A: Extractive fallback draft for concise text
            result = _to_data(self.run_async(summarize(TextInput(text="A cell is the basic unit of life. Cells form tissues in many organisms."))))
            self.assertIn("basic unit", result["summary"])
            self.assertIn("Verify", result["notice"])
            self.assertEqual(result["sections_processed"], 1)
            self.assertEqual(result["method"], "extractive_fallback")

            # Test B: Full document summarization using mocked LLM
            long_text = "A cell is the basic unit of life. " * 20
            result_llm = _to_data(self.run_async(summarize(TextInput(text=long_text))))
            self.assertIn("basic unit", result_llm["summary"])
            self.assertIn("Verify", result_llm["notice"])
            self.assertIn("direct_llm", result_llm["method"])

    def test_summary_handles_ollama_unavailable(self):
        from unittest.mock import AsyncMock, patch, MagicMock

        # Verify graceful error handling when Ollama service is unreachable
        mock_client = MagicMock()
        mock_client.health_check = AsyncMock(return_value={
            "server": "offline",
            "error": "Connection refused"
        })

        with patch("app.main.get_ollama_client", return_value=mock_client):
            result = _to_data(self.run_async(summarize(TextInput(text="A cell is the basic unit of life."))))
            self.assertEqual(result["summary"], "Local AI service unavailable for summarization.")
            self.assertEqual(result["method"], "unavailable")
            self.assertEqual(result["sections_processed"], 0)

    def test_extracts_utf8_text(self):
        result = self.run_async(extract(UploadFile(filename="notes.txt", file=BytesIO(b"A short study note."))))
        text_val = result.text if hasattr(result, "text") else result["text"]
        self.assertEqual(text_val, "A short study note.")

    def test_rejects_unsupported_file(self):
        with self.assertRaises(HTTPException) as caught:
            self.run_async(extract(UploadFile(filename="image.png", file=BytesIO(b"x"))))
        self.assertEqual(caught.exception.status_code, 415)

    def test_semantic_search_only_returns_matching_source_text(self):
        from app.main import SearchInput, semantic_search
        result = semantic_search(SearchInput(question="How do plants make sugar?", context="Photosynthesis is the process plants use to convert light into chemical energy. Cell membranes control movement in and out of cells."))
        self.assertEqual(len(result["matches"]), 1)
        self.assertIn("Photosynthesis", result["matches"][0]["text"])

    def test_question_and_card_generation_uses_explicit_definitions(self):
        from app.main import flashcards, questions, FlashcardsRequest, QuestionsRequest
        source = "Photosynthesis is the process by which plants convert light into chemical energy. Respiration is the process organisms use to release energy from food."
        cards = flashcards(FlashcardsRequest(text=source))["flashcards"]
        quiz = _to_data(self.run_async(questions(QuestionsRequest(text=source))))["questions"]
        self.assertGreaterEqual(len(cards), 2)
        self.assertEqual(len(quiz), 2)  # One question per definition pair
        self.assertIn(quiz[0]["correct_answer"], quiz[0]["options"])

    def test_question_generation_by_topic(self):
        from unittest.mock import patch
        from app.main import questions, QuestionsRequest
        with (
            patch("app.main.call_llm", side_effect=RuntimeError("offline test")),
            patch("app.main.fetch_topic_encyclopedia_data", return_value=(None, None)),
            patch("app.main.generate_encyclopedic_quiz", return_value=[]),
        ):
            quiz = _to_data(self.run_async(questions(QuestionsRequest(topic="Operating Systems", count=3))))["questions"]
        self.assertEqual(len(quiz), 3)
        self.assertTrue("operating system" in quiz[0]["question"].lower())
        self.assertEqual(len(quiz[0]["options"]), 4)
        self.assertEqual(quiz[0]["correct_index"], 0)

    def test_flashcard_generation_by_topic(self):
        from unittest.mock import patch
        from app.main import flashcards, FlashcardsRequest
        with patch("app.main.call_llm", side_effect=RuntimeError("offline test")):
            cards = flashcards(FlashcardsRequest(topic="Database Systems", count=4))["flashcards"]
        self.assertEqual(len(cards), 4)
        self.assertTrue("database system" in cards[0]["front"].lower())

    @staticmethod
    def run_async(awaitable):
        import asyncio
        return asyncio.run(awaitable)

if __name__ == "__main__":
    unittest.main()
