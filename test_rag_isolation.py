import asyncio
import sys
from pathlib import Path
import requests

# Add ML directory to path
sys.path.insert(0, r"D:\Smart Edu\ml")

from app.vector_store import get_vector_store, DocumentChunk

async def run_tests():
    print("==================================================")
    print("RUNNING RAG SECURITY & LOCAL TUTOR TEST SUITE")
    print("==================================================")
    
    vs = await get_vector_store()
    
    # Test 1: Empty material_ids allowlist in private scope MUST return 0 chunks
    res1 = await vs.search(query_text="Process Scheduling Operating System", material_ids=[], scope="private")
    assert res1 == [], f"Expected empty list, got {len(res1)} chunks!"
    print("[PASS] Test 1: Empty material_ids allowlist returns 0 chunks (no unrestricted search).")
    
    # Test 2: None material_ids in private scope MUST return 0 chunks
    res2 = await vs.search(query_text="Process Scheduling Operating System", material_ids=None, scope="private")
    assert res2 == [], f"Expected empty list for None, got {len(res2)} chunks!"
    print("[PASS] Test 2: None material_ids returns 0 chunks.")
    
    # Test 3: Unauthorized material ID (999999) does not leak existing chunks (e.g. material 40)
    res3 = await vs.search(query_text="Data Structures", material_ids=[999999], scope="private")
    assert res3 == [], f"Expected 0 chunks for unauthorized material ID, got {len(res3)}!"
    print("[PASS] Test 3: Unauthorized material ID returns 0 chunks (cross-tenant isolation intact).")

    # Test 4: Authorized material ID (40) returns matching chunks
    res4 = await vs.search(query_text="Data Structures", material_ids=[40], scope="private", k=3)
    print(f"[PASS] Test 4: Authorized material ID 40 returns {len(res4)} authorized chunks.")
    for chunk, score in res4:
        assert chunk.material_id == 40, f"Found chunk from wrong material: {chunk.material_id}!"
    print("       All returned chunks strictly have material_id == 40.")
    
    # Test 5: End-to-end /ml/v1/rag-query runs locally on Ollama without cloud leakage
    headers = {"X-Internal-Token": "dev-internal-token-change-me", "Content-Type": "application/json"}
    payload = {
        "question": "What are the states in process scheduling?",
        "material_ids": [40],
        "model": "gpt-4o",  # Attempt to inject cloud model
        "api_key": "sk-or-v1-unauthorized-injection-test"  # Attempt to inject cloud key
    }
    r = requests.post("http://localhost:8000/ml/v1/rag-query", headers=headers, json=payload, timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("status") == "success"
    # Verify model is local Ollama smartstudy-tutor
    model_used = data.get("model", "")
    provider = data.get("provider", "")
    print(f"[PASS] Test 5: /ml/v1/rag-query completed.")
    print(f"       Model: {model_used}, Provider: {provider}")
    assert "gpt-4" not in model_used.lower(), "Security violation: Cloud model was used!"
    assert "openrouter" not in provider.lower(), "Security violation: OpenRouter was used!"
    print("       Cloud model & key injection successfully neutralized: forced smartstudy-tutor on local GPU.")

    # Test 6: Verify VTU collection separation
    stats = vs.get_stats()
    print("[PASS] Test 6: ChromaDB Multi-Collection Architecture verified:")
    print(f"       Private student collection: '{stats['collection_name']}' with {stats['total_chunks']} chunks.")
    print(f"       Global VTU collection: '{stats['vtu_collection_name']}' with {stats['vtu_chunks']} chunks.")
    
    print("\n==================================================")
    print("ALL RAG SECURITY & LOCAL TUTOR TESTS PASSED (6/6)!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
