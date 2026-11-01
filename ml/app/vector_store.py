"""
ChromaDB Vector Store for Document Chunk Storage and Retrieval
Provides persistent local vector storage with metadata filtering and strict student isolation.
"""

import os
import json
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from .ollama_client import OllamaClient, get_ollama_client, OllamaConfig

logger = logging.getLogger(__name__)

SUBJECT_CANONICAL_MAP: Dict[str, Dict[str, Any]] = {
    "operating_systems": {
        "id": "operating_systems",
        "code": "BCS303",
        "name": "Operating Systems",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["operating_systems", "os", "operating systems", "bcs303", "operating system"],
    },
    "computer_networks": {
        "id": "computer_networks",
        "code": "BCS502",
        "name": "Computer Networks",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["computer_networks", "cn", "computer networks", "bcs502", "computer network", "networking"],
    },
    "ada": {
        "id": "ada",
        "code": "BCS401",
        "name": "Analysis & Design of Algorithms",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["ada", "analysis and design of algorithms", "design of algorithms", "bcs401", "algorithms", "algorithm"],
    },
    "dsa": {
        "id": "dsa",
        "code": "BCS304",
        "name": "Data Structures and Applications",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["dsa", "data structures", "data structures and applications", "bcs304", "data structure"],
    },
    "java": {
        "id": "java",
        "code": "BCS306A",
        "name": "Object Oriented Programming with Java",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["java", "oop java", "bcs306a", "java programming", "oops with java"],
    },
    "python": {
        "id": "python",
        "code": "BDS306B",
        "name": "Python Programming for Data Science",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["python", "python programming", "bds306b", "python for data science"],
    },
    "dbms": {
        "id": "dbms",
        "code": "BCS403",
        "name": "Database Management Systems",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["dbms", "database", "databases", "bcs403", "database management systems", "database management system"],
    },
    "parallel_computing": {
        "id": "parallel_computing",
        "code": "BCI714B",
        "name": "Parallel Computing",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["parallel_computing", "parallel computing", "parallel", "bci714b", "parallel architecture"],
    },
    "rpa": {
        "id": "rpa",
        "code": "UNVERIFIED_RPA",
        "name": "Robotic Process Automation",
        "has_notes": True,
        "is_supplementary": True,
        "aliases": ["rpa", "robotic process automation", "automation bot", "robotic automation"],
    },
    "cryptography": {
        "id": "cryptography",
        "code": "BCS703",
        "name": "Cryptography & Network Security",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["cryptography", "crypto", "network security", "bcs703", "cns", "cryptography and network security", "cryptography & network security"],
    },
    "cloud_computing": {
        "id": "cloud_computing",
        "code": "BIS613D",
        "name": "Cloud Computing & Security",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["cloud_computing", "cloud computing", "cloud", "bis613d", "cloud security"],
    },
    "generative_ai": {
        "id": "generative_ai",
        "code": "BAIL657C",
        "name": "Generative AI",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["generative_ai", "generative ai", "genai", "gen ai", "bail657c"],
    },
    "computer_graphics": {
        "id": "computer_graphics",
        "code": "UNVERIFIED_CG",
        "name": "Computer Graphics",
        "has_notes": False,
        "is_supplementary": True,
        "aliases": ["computer_graphics", "computer graphics", "graphics", "cg"],
    },
    "software_engineering": {
        "id": "software_engineering",
        "code": "BCS501",
        "name": "Software Engineering & Project Management",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["software_engineering", "software engineering", "se", "bcs501", "software eng"],
    },
    "project_management": {
        "id": "project_management",
        "code": "BCS501",
        "name": "Software Engineering & Project Management",
        "has_notes": True,
        "is_supplementary": False,
        "aliases": ["project_management", "project management", "pm", "project mgmt"],
    },
}


def resolve_subject(identifier: Optional[str]) -> Optional[Dict[str, Any]]:
    """Resolve any subject ID, course code, or alias to canonical subject metadata."""
    if not identifier:
        return None
    raw = str(identifier).strip().lower()
    if raw in SUBJECT_CANONICAL_MAP:
        return SUBJECT_CANONICAL_MAP[raw]
    for key, info in SUBJECT_CANONICAL_MAP.items():
        if raw == info["code"].lower() or raw in [a.lower() for a in info["aliases"]]:
            return info
    return None


@dataclass
class DocumentChunk:
    """Represents a document chunk with metadata for vector storage."""
    id: str
    material_id: int
    chunk_ordinal: int
    text: str
    page_number: Optional[int] = None
    heading: Optional[str] = None
    sheet_name: Optional[str] = None
    row_range: Optional[str] = None
    slide_number: Optional[int] = None
    section: Optional[str] = None
    token_count: int = 0
    file_type: str = "unknown"
    filename: str = ""
    student_id: Optional[int] = None
    scope: str = "private"  # "private" or "global_vtu"
    subject_code: Optional[str] = None
    semester: Optional[int] = None
    # Academic knowledge base fields
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    scheme: str = "2022"
    branch: str = "CSE_AI_ML"
    course_type: Optional[str] = None
    classification: Optional[str] = None
    module_number: Optional[int] = None
    topic: Optional[str] = None
    source_name: Optional[str] = None
    source_filename: Optional[str] = None
    source_sha256: Optional[str] = None
    page_end: Optional[int] = None
    verification_status: Optional[str] = None
    is_supplementary: bool = False

    @property
    def course_code(self) -> Optional[str]:
        return self.subject_code

    @property
    def citation(self) -> str:
        fn = self.source_filename or self.filename or "VTU Notes"
        if self.page_number is not None and self.page_number > 0:
            if self.page_end is not None and self.page_end > self.page_number:
                return f"{fn}, pp. {self.page_number}-{self.page_end}"
            return f"{fn}, p. {self.page_number}"
        return fn

    def to_metadata(self) -> Dict[str, Any]:
        """Convert to ChromaDB-compatible metadata (no nested objects)."""
        return {
            "material_id": self.material_id,
            "chunk_ordinal": self.chunk_ordinal,
            "page_number": self.page_number if self.page_number is not None else -1,
            "heading": self.heading or "",
            "sheet_name": self.sheet_name or "",
            "row_range": self.row_range or "",
            "slide_number": self.slide_number if self.slide_number is not None else -1,
            "section": self.section or "",
            "token_count": self.token_count,
            "file_type": self.file_type,
            "filename": self.filename,
            "student_id": self.student_id if self.student_id is not None else -1,
            "scope": self.scope,
            "subject_code": self.subject_code or "",
            "semester": self.semester if self.semester is not None else -1,
            "subject_id": self.subject_id or "",
            "subject_name": self.subject_name or "",
            "scheme": self.scheme,
            "branch": self.branch,
            "course_type": self.course_type or "",
            "classification": self.classification or "",
            "module_number": self.module_number if self.module_number is not None else -1,
            "topic": self.topic or "",
            "source_name": self.source_name or "",
            "source_filename": self.source_filename or self.filename,
            "source_sha256": self.source_sha256 or "",
            "page_end": self.page_end if self.page_end is not None else (self.page_number if self.page_number is not None else -1),
            "verification_status": self.verification_status or "",
            "is_supplementary": self.is_supplementary,
        }

    @classmethod
    def from_metadata(cls, metadata: Dict[str, Any], text: str, chunk_id: str) -> "DocumentChunk":
        """Reconstruct chunk from ChromaDB metadata."""
        return cls(
            id=chunk_id,
            material_id=metadata.get("material_id", 0),
            chunk_ordinal=metadata.get("chunk_ordinal", 0),
            text=text,
            page_number=metadata.get("page_number") if metadata.get("page_number", -1) != -1 else None,
            heading=metadata.get("heading") or None,
            sheet_name=metadata.get("sheet_name") or None,
            row_range=metadata.get("row_range") or None,
            slide_number=metadata.get("slide_number") if metadata.get("slide_number", -1) != -1 else None,
            section=metadata.get("section") or None,
            token_count=metadata.get("token_count", 0),
            file_type=metadata.get("file_type", "unknown"),
            filename=metadata.get("filename", ""),
            student_id=metadata.get("student_id") if metadata.get("student_id", -1) != -1 else None,
            scope=metadata.get("scope", "private"),
            subject_code=metadata.get("course_code") or metadata.get("subject_code") or None,
            semester=metadata.get("semester") if metadata.get("semester", -1) != -1 else None,
            subject_id=metadata.get("subject_id") or None,
            subject_name=metadata.get("subject_name") or None,
            scheme=metadata.get("scheme", "2022"),
            branch=metadata.get("branch", "CSE_AI_ML"),
            course_type=metadata.get("course_type") or None,
            classification=metadata.get("classification") or None,
            module_number=metadata.get("module_number") if metadata.get("module_number", -1) != -1 else None,
            topic=metadata.get("topic") or None,
            source_name=metadata.get("source_name") or None,
            source_filename=metadata.get("source_filename") or None,
            source_sha256=metadata.get("source_sha256") or None,
            page_end=metadata.get("page_end") if metadata.get("page_end", -1) != -1 else None,
            verification_status=metadata.get("verification_status") or None,
            is_supplementary=bool(metadata.get("is_supplementary", False)),
        )

    def citation_string(self) -> str:
        """Generate human-readable citation string."""
        if self.scope == "global_vtu":
            source_display = self.source_filename or self.filename
            if self.page_number is not None:
                if self.page_end and self.page_end != self.page_number:
                    return f"[{source_display}, pp. {self.page_number}-{self.page_end}]"
                return f"[{source_display}, p. {self.page_number}]"
            return f"[{source_display}]"

        parts = [self.filename]
        if self.file_type == "pdf" and self.page_number is not None:
            parts.append(f"page {self.page_number}")
        elif self.file_type in ("xlsx", "xlsm", "csv") and self.sheet_name:
            if self.row_range:
                parts.append(f"sheet {self.sheet_name}, rows {self.row_range}")
            else:
                parts.append(f"sheet {self.sheet_name}")
        elif self.file_type in ("pptx", "ppt") and self.slide_number is not None:
            parts.append(f"slide {self.slide_number}")
        elif self.heading:
            parts.append(f"section '{self.heading}'")
        return f"[{', '.join(parts)}]"


class ChromaVectorStore:
    """
    Persistent local vector store using ChromaDB.
    Enforces strict isolation between private student materials and global VTU knowledge.
    """

    def __init__(
        self,
        persist_dir: Optional[str] = None,
        collection_name: str = "smart_study_documents",
        vtu_collection_name: str = "vtu_academic_knowledge",
        ollama_client: Optional[OllamaClient] = None,
    ):
        if persist_dir:
            self.persist_dir = Path(persist_dir).resolve()
        else:
            self.persist_dir = Path(__file__).resolve().parent.parent / "chroma_data"
        self.collection_name = collection_name
        self.vtu_collection_name = vtu_collection_name
        self.ollama_client = ollama_client
        self._client: Optional[chromadb.PersistentClient] = None
        self._collection = None
        self._vtu_collection = None

    def _get_client(self) -> chromadb.PersistentClient:
        """Get or create ChromaDB persistent client."""
        if self._client is None:
            self.persist_dir.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=str(self.persist_dir),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ),
            )
        return self._client

    def _get_collection(self):
        """Get or create the private student document collection."""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def _get_vtu_collection(self):
        """Get or create the separate, trusted global VTU academic knowledge collection."""
        if self._vtu_collection is None:
            client = self._get_client()
            self._vtu_collection = client.get_or_create_collection(
                name=self.vtu_collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._vtu_collection

    async def initialize(self):
        """Initialize the vector store and verify Ollama connection."""
        self._get_collection()
        self._get_vtu_collection()
        if self.ollama_client:
            health = await self.ollama_client.health_check()
            if health.get("server") != "healthy":
                logger.warning(f"Ollama health check: {health}")
            elif not health.get("embed_model", {}).get("available", False):
                logger.warning(f"Embedding model {self.ollama_client.config.embed_model} not available")

    async def add_chunks(self, chunks: List[DocumentChunk], collection_target: str = "private") -> int:
        """
        Add document chunks with embeddings to the vector store.
        `collection_target`: "private" for student notes, "global_vtu" for official VTU materials.
        """
        if not chunks:
            return 0

        target_coll = self._get_vtu_collection() if collection_target == "global_vtu" else self._get_collection()

        # Generate embeddings
        texts = [chunk.text for chunk in chunks]
        embeddings = await self._get_embeddings(texts)

        # Prepare data for ChromaDB
        ids = [chunk.id for chunk in chunks]
        metadatas = [chunk.to_metadata() for chunk in chunks]
        documents = texts

        # Add to collection (upsert to handle duplicates)
        target_coll.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents,
        )

        logger.info(f"Added {len(chunks)} chunks to '{target_coll.name}' (material_id={chunks[0].material_id})")
        return len(chunks)

    async def add_vtu_chunks(self, chunks: List[DocumentChunk]) -> int:
        """Add global VTU curriculum/notes chunks into the dedicated VTU collection."""
        for c in chunks:
            c.scope = "global_vtu"
        return await self.add_chunks(chunks, collection_target="global_vtu")

    async def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings from local Ollama nomic-embed-text."""
        if self.ollama_client:
            return await self.ollama_client.embed(texts)
        else:
            logger.warning("No Ollama client available for embeddings")
            return [[0.0] * 768 for _ in texts]

    async def search(
        self,
        query_text: str,
        material_ids: Optional[List[int]] = None,
        file_types: Optional[List[str]] = None,
        k: int = 5,
        min_score: float = -1.0,
        scope: str = "private",
        subject_code: Optional[str] = None,
        subject_id: Optional[str] = None,
        module_number: Optional[int] = None,
    ) -> List[Tuple[DocumentChunk, float]]:
        """
        Search for relevant chunks using semantic similarity with strict tenant isolation.

        SECURITY RULES:
        1. When scope == "private", material_ids MUST be non-empty. An empty or None allowlist
           will NEVER trigger an unrestricted search across other students' private documents.
        2. If a filtered query encounters an exception, it NEVER falls back to an unfiltered query.
           It safely returns an empty list.
        3. Global VTU academic materials reside in a distinct collection (`vtu_academic_knowledge`)
           and are queried separately.
        """
        # Determine target collection based on scope
        if scope == "global_vtu":
            target_collection = self._get_vtu_collection()
        else:
            target_collection = self._get_collection()

        # Build where filter
        conditions = []

        if scope == "private":
            # Strict student isolation enforcement
            if not material_ids:
                logger.warning(
                    "[RAG Security] Private search requested with empty or missing material_ids allowlist. "
                    "Refusing unrestricted cross-tenant search. Returning empty result."
                )
                return []

            clean_ids = []
            for m in material_ids:
                try:
                    val = int(m)
                    if val > 0:
                        clean_ids.append(val)
                except (ValueError, TypeError):
                    continue

            if not clean_ids:
                logger.warning("[RAG Security] No valid positive integer material_ids found in allowlist. Returning empty.")
                return []

            if len(clean_ids) == 1:
                conditions.append({"material_id": clean_ids[0]})
            else:
                conditions.append({"material_id": {"$in": clean_ids}})

        elif scope == "global_vtu":
            resolved = resolve_subject(subject_id or subject_code or "")
            if resolved:
                # If subject is verified to have 0 indexed notes, return immediately without scanning or cross-leakage
                if not resolved["has_notes"]:
                    logger.info(f"[RAG Subject Isolation] Subject {resolved['id']} ({resolved['code']}) has no indexed notes. Returning empty.")
                    return []
                # Both software_engineering and project_management map to shared canonical BCS501
                if resolved["id"] in ("software_engineering", "project_management"):
                    conditions.append({"course_code": "BCS501"})
                else:
                    conditions.append({"course_code": resolved["code"]})
            elif subject_id and subject_id.strip():
                clean_sid = subject_id.strip().lower()
                conditions.append({"subject_id": clean_sid})
            elif subject_code and subject_code.strip():
                conditions.append({"course_code": subject_code.strip().upper()})
            if module_number is not None and int(module_number) > 0:
                conditions.append({"module_number": int(module_number)})

        if file_types:
            clean_types = [str(ft).strip().lower() for ft in file_types if str(ft).strip()]
            if len(clean_types) == 1:
                conditions.append({"file_type": clean_types[0]})
            elif len(clean_types) > 1:
                conditions.append({"file_type": {"$in": clean_types}})

        where = None
        if len(conditions) == 1:
            where = conditions[0]
        elif len(conditions) > 1:
            where = {"$and": conditions}

        # Generate query embedding
        query_embedding = None
        if self.ollama_client:
            try:
                query_embedding = await self.ollama_client.embed_single(query_text)
            except Exception as e:
                logger.warning(f"Error obtaining query embedding from Ollama: {e}")

        # Execute filtered query with ABSOLUTELY ZERO unfiltered retries
        results = None
        try:
            if query_embedding:
                results = target_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=k,
                    where=where if where else None,
                    include=["documents", "metadatas", "distances"],
                )
            else:
                results = target_collection.query(
                    query_texts=[query_text],
                    n_results=k,
                    where=where if where else None,
                    include=["documents", "metadatas", "distances"],
                )
        except Exception as e:
            # SECURITY CRITICAL: Never fall back to an unfiltered query!
            logger.error(
                f"[RAG Security] ChromaDB query with filter failed: {e}. "
                f"Returning empty results to prevent cross-tenant chunk leakage."
            )
            return []

        # Convert results to DocumentChunk objects with scores
        chunks_with_scores = []
        if results and results.get("ids") and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i]
                # Convert cosine distance to similarity score (1 - distance)
                score = 1.0 - distance

                if score < min_score:
                    continue

                metadata = results["metadatas"][0][i]
                text = results["documents"][0][i]
                chunk = DocumentChunk.from_metadata(metadata, text, chunk_id)
                chunks_with_scores.append((chunk, score))

        return chunks_with_scores

    async def search_private(
        self,
        query_text: str,
        authorized_material_ids: List[int],
        k: int = 5,
        min_score: float = -1.0,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Search strictly within a student's authorized private documents."""
        return await self.search(
            query_text=query_text,
            material_ids=authorized_material_ids,
            k=k,
            min_score=min_score,
            scope="private",
        )

    async def search_vtu(
        self,
        query_text: str,
        subject_id: Optional[str] = None,
        subject_code: Optional[str] = None,
        module_number: Optional[int] = None,
        k: int = 5,
        min_score: float = -1.0,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Search strictly within the global VTU academic knowledge base."""
        return await self.search(
            query_text=query_text,
            subject_id=subject_id,
            subject_code=subject_code,
            module_number=module_number,
            k=k,
            min_score=min_score,
            scope="global_vtu",
        )

    async def search_by_material(
        self,
        query_text: str,
        material_id: int,
        k: int = 5,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Search within a specific material."""
        return await self.search(query_text, material_ids=[material_id], k=k, scope="private")

    def get_material_chunks(self, material_id: int) -> List[DocumentChunk]:
        """Get all chunks for a specific material."""
        collection = self._get_collection()
        results = collection.get(
            where={"material_id": material_id},
            include=["documents", "metadatas"],
        )

        chunks = []
        if results["ids"]:
            for i, chunk_id in enumerate(results["ids"]):
                metadata = results["metadatas"][i]
                text = results["documents"][i]
                chunk = DocumentChunk.from_metadata(metadata, text, chunk_id)
                chunks.append(chunk)

        # Sort by chunk_ordinal
        chunks.sort(key=lambda c: c.chunk_ordinal)
        return chunks

    def delete_material(self, material_id: int) -> int:
        """Delete all chunks for a material from the private collection. Returns count deleted."""
        collection = self._get_collection()
        results = collection.get(where={"material_id": material_id}, include=[])
        if results["ids"]:
            collection.delete(ids=results["ids"])
            logger.info(f"Deleted {len(results['ids'])} chunks for material {material_id}")
            return len(results["ids"])
        return 0

    def delete_vtu_source(self, source_sha256: str) -> int:
        """Delete all chunks for a specific academic source from the VTU collection. Returns count deleted."""
        vtu_collection = self._get_vtu_collection()
        results = vtu_collection.get(where={"source_sha256": source_sha256}, include=[])
        if results["ids"]:
            vtu_collection.delete(ids=results["ids"])
            logger.info(f"Deleted {len(results['ids'])} chunks for VTU source {source_sha256}")
            return len(results["ids"])
        return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics for both private and VTU collections."""
        collection = self._get_collection()
        vtu_collection = self._get_vtu_collection()
        return {
            "total_chunks": collection.count(),
            "collection_name": self.collection_name,
            "vtu_chunks": vtu_collection.count(),
            "vtu_collection_name": self.vtu_collection_name,
            "persist_dir": str(self.persist_dir),
        }

    def reset(self):
        """Reset the private collection (delete all student data)."""
        client = self._get_client()
        try:
            client.delete_collection(self.collection_name)
        except Exception:
            pass
        self._collection = None
        self._get_collection()


# Global vector store instance
_global_vector_store: Optional[ChromaVectorStore] = None


async def get_vector_store() -> ChromaVectorStore:
    """Get or create global vector store."""
    global _global_vector_store
    if _global_vector_store is None:
        default_dir = str(Path(__file__).resolve().parent.parent / "chroma_data")
        persist_dir = os.getenv("CHROMA_PERSIST_DIR") or os.getenv("CHROMA_PERSIST_DIRECTORY") or default_dir
        ollama = await get_ollama_client()
        _global_vector_store = ChromaVectorStore(
            persist_dir=persist_dir,
            ollama_client=ollama,
        )
        await _global_vector_store.initialize()
    return _global_vector_store


async def close_vector_store():
    """Close global vector store."""
    global _global_vector_store
    _global_vector_store = None
