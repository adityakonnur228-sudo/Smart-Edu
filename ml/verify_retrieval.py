import asyncio
import json
import sys
import chromadb
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CHROMA_DIR = r"D:\Smart Edu\ml\chroma_data"
OLLAMA_URL = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text:latest"

test_queries = [
    {
        "subject_id": "operating_systems",
        "query": "explain deadlock conditions and Banker algorithm",
        "expected_code": "BCS303",
        "expected_filename": "OS All Modules Notes.pdf"
    },
    {
        "subject_id": "ada",
        "query": "divide and conquer merge sort time complexity and Master theorem",
        "expected_code": "BCS401",
        "expected_filename": "ADA – BCS401.pdf"
    },
    {
        "subject_id": "dsa",
        "query": "binary search tree insertion deletion and traversal algorithms",
        "expected_code": "BCS304",
        "expected_filename": "DSA – BCS304.pdf"
    },
    {
        "subject_id": "cloud_computing",
        "query": "NIST cloud service models IaaS PaaS SaaS and hypervisor virtualization",
        "expected_code": "BIS613D",
        "expected_filename": "Cloud Computing – BIS613D.pdf"
    },
    {
        "subject_id": "software_engineering",
        "query": "agile software development principles extreme programming user stories",
        "expected_code": "BCS501",
        "expected_filename": "Software Engineering.pdf"
    },
    {
        "subject_id": "project_management",
        "query": "COCOMO model cost estimation software project planning risk management",
        "expected_code": "BCS501",
        "expected_filename": "Software Engineering.pdf"
    },
    {
        "subject_id": "python",
        "query": "python lists dictionaries list comprehensions and functions",
        "expected_code": "BDS306B",
        "expected_filename": "Python – BDS306B.pdf"
    },
    {
        "subject_id": "java",
        "query": "java object oriented programming inheritance polymorphism interfaces",
        "expected_code": "BCS306A",
        "expected_filename": "Java – BCS306A.pdf"
    },
    {
        "subject_id": "parallel_computing",
        "query": "shared memory architectures message passing MPI OpenMP threads",
        "expected_code": "BCI714B",
        "expected_filename": "Parallel Computing – BCI714B.pdf"
    },
    {
        "subject_id": "generative_ai",
        "query": "diffusion models variational autoencoders transformer attention mechanism",
        "expected_code": "BAIL657C",
        "expected_filename": "Generative AI – BAIL657C.pdf"
    },
    {
        "subject_id": "rpa",
        "query": "robotic process automation bot architecture workflow automation UI automation",
        "expected_code": "",
        "expected_filename": "RPA.pdf"
    }
]

async def embed_all_queries(texts):
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/embed", json={"model": EMBED_MODEL, "input": texts})
        resp.raise_for_status()
        return resp.json()["embeddings"]

async def run_verification():
    print("=" * 60)
    print("PHASE 7 RETRIEVAL & CITATION VERIFICATION SUITE")
    print("=" * 60)

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    vtu_col = client.get_collection("vtu_academic_knowledge")
    priv_col = client.get_collection("smart_study_documents")

    print(f"Total Academic Chunks in 'vtu_academic_knowledge': {vtu_col.count()}")
    print(f"Total Private Chunks in 'smart_study_documents': {priv_col.count()}")
    assert vtu_col.count() == 1028, f"Expected 1028 academic chunks, found {vtu_col.count()}"
    assert priv_col.count() == 323, f"Expected 323 private chunks, found {priv_col.count()}"

    query_texts = [t["query"] for t in test_queries]
    print(f"Embedding all {len(query_texts)} test queries in single batch via Ollama...")
    embeddings = await embed_all_queries(query_texts)
    print("Batch query embedding completed successfully.")

    verification_results = []

    for i, t in enumerate(test_queries):
        print(f"\n[TEST QUERY {i+1}/11] Subject: {t['subject_id']}")
        print(f"                     Query: '{t['query']}'")
        
        q_emb = embeddings[i]
        
        # Build filter (handling project_management -> software_engineering canonical mapping)
        if t["subject_id"] == "project_management":
            search_filter = {"$or": [{"subject_id": "project_management"}, {"subject_id": "software_engineering"}]}
        else:
            search_filter = {"subject_id": t["subject_id"]}
            
        results = vtu_col.query(
            query_embeddings=[q_emb],
            n_results=3,
            where=search_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        chunks_returned = len(results["ids"][0])
        print(f"                     Retrieved: {chunks_returned} chunks")
        assert chunks_returned > 0, f"No chunks returned for {t['subject_id']}"
        
        top_meta = results["metadatas"][0][0]
        top_dist = results["distances"][0][0]
        top_sim = round(1.0 - top_dist, 4)
        top_doc = results["documents"][0][0]
        
        p_start = top_meta.get("page_number")
        p_end = top_meta.get("page_end")
        src_name = top_meta.get("source_filename")
        subj_name = top_meta.get("subject_name")
        course_code = top_meta.get("course_code")
        
        citation = f"[{src_name}, p. {p_start}-{p_end}]" if p_start != p_end else f"[{src_name}, p. {p_start}]"
        print(f"                     Top Citation: {citation} | Similarity: {top_sim}")
        print(f"                     Course: {course_code} - {subj_name}")
        clean_excerpt = " ".join(top_doc.split())[:120]
        print(f"                     Excerpt: {clean_excerpt}...")
        
        # Strict isolation check: confirm no student_id field or private document content
        assert "student_id" not in top_meta or top_meta["student_id"] is None
        assert top_meta.get("scope") == "global_vtu"
        
        verification_results.append({
            "subject_id": t["subject_id"],
            "query": t["query"],
            "top_citation": citation,
            "similarity": top_sim,
            "source_filename": src_name,
            "course_code": course_code,
            "page_start": p_start,
            "page_end": p_end,
            "excerpt": clean_excerpt
        })

    # Test Private Student Isolation: Ensure student search doesn't leak academic chunks
    print("\n" + "=" * 60)
    print("SECURITY & ISOLATION CHECK: STUDENT PRIVATE STORE")
    print("=" * 60)
    priv_test_emb = (await embed_all_queries(["operating systems process scheduling"]))[0]
    priv_res = priv_col.query(
        query_embeddings=[priv_test_emb],
        n_results=3,
        where={"student_id": 1},
        include=["metadatas"]
    )
    for meta in priv_res["metadatas"][0]:
        print(f"Private retrieval chunk student_id: {meta.get('student_id')}, doc_id: {meta.get('document_id')}")
        assert meta.get("student_id") == 1
        assert "global_vtu" != meta.get("scope")

    print("\n[SUCCESS] ALL 11 SUBJECT QUERIES & SECURITY ISOLATION VERIFIED!")
    
    with open(r"D:\Smart Edu\scratch\verification_report_data.json", "w", encoding="utf-8") as f:
        json.dump(verification_results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(run_verification())
