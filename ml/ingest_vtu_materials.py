import asyncio
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import chromadb
import httpx
import pymupdf

BASE_DIR = Path(r"D:\Smart Edu")
STAGING_NOTES_DIR = Path(r"D:\VTU_Study_Materials_Staging\Subject_Notes")
CHROMA_DIR = BASE_DIR / "ml" / "chroma_data"
KB_DIR = BASE_DIR / "knowledge_base" / "vtu" / "2022" / "aiml"
CURRICULUM_FILE = KB_DIR / "curriculum.json"
MANIFEST_FILE = KB_DIR / "manifest.json"
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text:latest"

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192 * 16):
            h.update(chunk)
    return h.hexdigest()

class VTUIngestionPipeline:
    def __init__(self):
        self.curriculum = json.loads(CURRICULUM_FILE.read_text(encoding="utf-8"))
        self.curriculum_by_id = {s["subject_id"]: s for s in self.curriculum["subjects"]}
        self.manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        self.chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.vtu_collection = self.chroma_client.get_or_create_collection(
            name="vtu_academic_knowledge",
            metadata={"hnsw:space": "cosine"}
        )
        self.private_collection = self.chroma_client.get_collection("smart_study_documents")

    async def get_embeddings_batch(self, texts, batch_size=32):
        all_embeddings = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                payload = {
                    "model": EMBED_MODEL,
                    "input": batch
                }
                resp = await client.post(f"{OLLAMA_BASE_URL}/api/embed", json=payload)
                resp.raise_for_status()
                data = resp.json()
                embeddings = data.get("embeddings", [])
                if len(embeddings) != len(batch):
                    raise RuntimeError(f"Expected {len(batch)} embeddings, got {len(embeddings)}")
                all_embeddings.extend(embeddings)
        return all_embeddings

    def chunk_pdf(self, subject_id, filename):
        filepath = STAGING_NOTES_DIR / subject_id / filename
        assert filepath.exists(), f"File missing: {filepath}"
        
        file_hash = sha256_file(filepath)
        subj_meta = self.curriculum_by_id.get(subject_id, {})
        
        doc = pymupdf.open(str(filepath))
        total_pages = len(doc)
        
        current_module = -1
        chunks = []
        
        buffer_text = ""
        buffer_start_page = 1
        current_heading = ""
        
        TARGET_CHUNK_CHARS = 1800  # ~500-600 tokens
        OVERLAP_CHARS = 250        # ~70-80 tokens
        
        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]
            text = page.get_text()
            
            # Check module header on page
            mod_match = re.search(r'\b(MODULE|UNIT)\s*[-–—]?\s*([1-5])\b', text, re.IGNORECASE)
            if mod_match:
                try:
                    current_module = int(mod_match.group(2))
                except Exception:
                    pass
                    
            # Look for section headings
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            for ln in lines:
                if len(ln) < 80 and (ln.isupper() or re.match(r'^[1-9]\.[0-9]', ln)):
                    current_heading = ln
                    break
                    
            # Split page into paragraphs
            paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
            
            for para in paras:
                if not buffer_text:
                    buffer_text = para
                    buffer_start_page = page_num
                elif len(buffer_text) + len(para) < TARGET_CHUNK_CHARS:
                    buffer_text += "\n\n" + para
                else:
                    chunk_ord = len(chunks)
                    chunk_id = f"vtu_{file_hash[:16]}_{chunk_ord:05d}"
                    
                    chunk_dict = {
                        "id": chunk_id,
                        "text": buffer_text,
                        "metadata": {
                            "scope": "global_vtu",
                            "subject_id": subject_id,
                            "subject_name": subj_meta.get("subject_name", ""),
                            "course_code": subj_meta.get("course_code", ""),
                            "scheme": "2022",
                            "branch": "CSE_AI_ML",
                            "semester": subj_meta.get("semester", -1) if subj_meta.get("semester") is not None else -1,
                            "course_type": subj_meta.get("course_type", ""),
                            "classification": subj_meta.get("classification", ""),
                            "module_number": current_module,
                            "topic": current_heading or "",
                            "source_name": filename.replace(".pdf", ""),
                            "source_filename": filename,
                            "source_sha256": file_hash,
                            "page_number": buffer_start_page,
                            "page_end": page_num,
                            "chunk_ordinal": chunk_ord,
                            "verification_status": subj_meta.get("verification_status", ""),
                            "is_supplementary": "SUPPLEMENTARY" in subj_meta.get("verification_status", ""),
                            "token_count": len(buffer_text.split())
                        }
                    }
                    chunks.append(chunk_dict)
                    
                    # Overlap
                    overlap_text = buffer_text[-OVERLAP_CHARS:] if len(buffer_text) > OVERLAP_CHARS else ""
                    buffer_text = overlap_text + "\n\n" + para
                    buffer_start_page = page_num
                    
        # Final remaining buffer
        if buffer_text.strip():
            chunk_ord = len(chunks)
            chunk_id = f"vtu_{file_hash[:16]}_{chunk_ord:05d}"
            chunks.append({
                "id": chunk_id,
                "text": buffer_text,
                "metadata": {
                    "scope": "global_vtu",
                    "subject_id": subject_id,
                    "subject_name": subj_meta.get("subject_name", ""),
                    "course_code": subj_meta.get("course_code", ""),
                    "scheme": "2022",
                    "branch": "CSE_AI_ML",
                    "semester": subj_meta.get("semester", -1) if subj_meta.get("semester") is not None else -1,
                    "course_type": subj_meta.get("course_type", ""),
                    "classification": subj_meta.get("classification", ""),
                    "module_number": current_module,
                    "topic": current_heading or "",
                    "source_name": filename.replace(".pdf", ""),
                    "source_filename": filename,
                    "source_sha256": file_hash,
                    "page_number": buffer_start_page,
                    "page_end": total_pages,
                    "chunk_ordinal": chunk_ord,
                    "verification_status": subj_meta.get("verification_status", ""),
                    "is_supplementary": "SUPPLEMENTARY" in subj_meta.get("verification_status", ""),
                    "token_count": len(buffer_text.split())
                }
            })
            
        doc.close()
        return chunks, file_hash, total_pages

    async def ingest_document(self, subject_id, filename):
        print(f"\n---> Ingesting [{subject_id}] '{filename}'...")
        t0 = time.time()
        
        chunks, file_hash, total_pages = self.chunk_pdf(subject_id, filename)
        print(f"     Extracted {len(chunks)} chunks across {total_pages} pages (SHA-256: {file_hash[:16]}...)")
        
        # Check if already indexed with identical hash
        existing = self.vtu_collection.get(where={"source_sha256": file_hash}, include=[])
        if len(existing.get("ids", [])) == len(chunks) and len(chunks) > 0:
            print(f"     [SKIP] Document already fully indexed ({len(existing['ids'])} vectors matching hash).")
            return {
                "status": "ALREADY_INDEXED",
                "chunks_count": len(chunks),
                "pages_count": total_pages,
                "file_hash": file_hash,
                "duration": round(time.time() - t0, 2)
            }
            
        # Clean any partial/outdated vectors for this source
        if existing.get("ids", []):
            print(f"     Removing {len(existing['ids'])} outdated chunks for re-indexing...")
            self.vtu_collection.delete(ids=existing["ids"])
            
        # Extract texts for embedding
        texts = [c["text"] for c in chunks]
        print(f"     Generating local nomic embeddings for {len(texts)} chunks...")
        embeddings = await self.get_embeddings_batch(texts, batch_size=32)
        
        # Verify vector dimensions
        assert len(embeddings[0]) == 768, f"Expected 768 dimensions, got {len(embeddings[0])}"
        
        # Prepare ChromaDB arrays
        ids = [c["id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        documents = texts
        
        # ChromaDB upsert in batches of 100
        for i in range(0, len(ids), 100):
            self.vtu_collection.upsert(
                ids=ids[i:i + 100],
                embeddings=embeddings[i:i + 100],
                metadatas=metadatas[i:i + 100],
                documents=documents[i:i + 100]
            )
            
        duration = round(time.time() - t0, 2)
        print(f"     [DONE] Successfully indexed {len(chunks)} vectors in {duration}s!")
        return {
            "status": "INDEXED",
            "chunks_count": len(chunks),
            "pages_count": total_pages,
            "file_hash": file_hash,
            "duration": duration
        }

async def run_pipeline():
    print("==================================================")
    print("PHASE 7: LOCAL VTU ACADEMIC KNOWLEDGE BASE INGESTION")
    print("==================================================")
    
    pipeline = VTUIngestionPipeline()
    
    # Verify pre-ingestion collection counts
    priv_count = pipeline.private_collection.count()
    vtu_count = pipeline.vtu_collection.count()
    print(f"Pre-ingestion ChromaDB status:")
    print(f"  smart_study_documents: {priv_count} chunks (PRIVATE - PRESERVED)")
    print(f"  vtu_academic_knowledge: {vtu_count} chunks (GLOBAL VTU)")
    
    assert priv_count == 323, f"Private collection count mismatch: expected 323, found {priv_count}"
    
    # Target validated documents
    target_docs = [
        ("operating_systems", "OS All Modules Notes.pdf"),
        ("ada", "ADA – BCS401.pdf"),
        ("dsa", "DSA – BCS304.pdf"),
        ("cloud_computing", "Cloud Computing – BIS613D.pdf"),
        ("software_engineering", "Software Engineering.pdf"),
        ("python", "Python – BDS306B.pdf"),
        ("java", "Java – BCS306A.pdf"),
        ("parallel_computing", "Parallel Computing – BCI714B.pdf"),
        ("generative_ai", "Generative AI – BAIL657C.pdf"),
        ("rpa", "RPA.pdf")
    ]
    
    ingestion_results = {}
    total_indexed_chunks = 0
    total_indexed_pages = 0
    
    for subj_id, fname in target_docs:
        res = await pipeline.ingest_document(subj_id, fname)
        ingestion_results[subj_id] = res
        total_indexed_chunks += res["chunks_count"]
        total_indexed_pages += res["pages_count"]
        
    # Final collection count verification
    final_vtu_count = pipeline.vtu_collection.count()
    final_priv_count = pipeline.private_collection.count()
    
    print("\n==================================================")
    print("INGESTION COMPLETED SUCCESSFULLY")
    print(f"Total Academic Chunks in 'vtu_academic_knowledge': {final_vtu_count}")
    print(f"Private Chunks in 'smart_study_documents': {final_priv_count} (UNTOUCHED)")
    print("==================================================")
    
    # BCS501 Special Case: Map project_management to software_engineering ingestion result
    ingestion_results["project_management"] = {
        "status": "INDEXED_VIA_SHARED_BCS501",
        "chunks_count": ingestion_results["software_engineering"]["chunks_count"],
        "pages_count": ingestion_results["software_engineering"]["pages_count"],
        "file_hash": ingestion_results["software_engineering"]["file_hash"],
        "duration": 0.0
    }
    
    # Save raw ingestion results for report generation
    results_file = BASE_DIR / "scratch" / "phase7_ingestion_results.json"
    results_file.parent.mkdir(parents=True, exist_ok=True)
    results_file.write_text(json.dumps(ingestion_results, indent=2), encoding="utf-8")
    print(f"Saved ingestion summary to {results_file}")

if __name__ == "__main__":
    asyncio.run(run_pipeline())

