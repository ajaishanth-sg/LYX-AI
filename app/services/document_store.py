import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import EMBEDDING_BATCH_SIZE, EMBEDDING_CACHE_QUERIES, EMBEDDING_DEVICE, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

CHUNK_SIZE_WORDS = 220
CHUNK_OVERLAP_WORDS = 40
TOP_K_CHUNKS = 5  # increased from 3
MATCH_SCORE_THRESHOLD = 0.30  # lowered from 0.45 to improve recall for GitHub repos


@dataclass
class DocumentChunk:
    id: int
    doc_id: str
    doc_name: str
    text: str


@dataclass
class Document:
    doc_id: str
    name: str
    chunk_count: int
    status: str = "processing"  # "processing" (partially indexed, still growing) | "ready" | "failed"
    total_pages: int = 0
    processed_pages: int = 0
    doc_type: str = "document"  # "document" | "video" -- lets callers (API/frontend/LLM context) know whether total_pages/processed_pages means pages or seconds
    raw_bytes: Optional[bytes] = field(default=None, repr=False)
    mime_type: str = "application/octet-stream"

    @property
    def progress_percent(self) -> int:
        if self.total_pages <= 0:
            return 0
        return min(100, round(self.processed_pages / self.total_pages * 100))


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE_WORDS, overlap: int = CHUNK_OVERLAP_WORDS) -> List[str]:
    words = text.split()
    if not words:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        piece = " ".join(words[start:end]).strip()
        if piece:
            chunks.append(piece)
        if end >= len(words):
            break
        start = end - overlap
    return chunks


class DocumentStore:
    """Holds uploaded documents as embedded chunks for retrieval-augmented answers."""

    def __init__(self, model_name: str = EMBEDDING_MODEL) -> None:
        self._model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self._documents: Dict[str, Document] = {}
        self._chunks: List[DocumentChunk] = []
        self._index: Optional[faiss.IndexFlatIP] = None
        self._query_cache: Dict[str, np.ndarray] = {}
        self._lock = asyncio.Lock()

    def _ensure_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info("Loading embedding model for documents: %s on device: %s", self._model_name, EMBEDDING_DEVICE)
            self._model = SentenceTransformer(self._model_name, device=EMBEDDING_DEVICE)
        return self._model

    @property
    def documents(self) -> List[Document]:
        return list(self._documents.values())

    def get_ready_documents(self) -> List[Document]:
        return [doc for doc in self._documents.values() if doc.status == "ready"]

    def add_document_pending(self, name: str, doc_type: str = "document", raw_bytes: Optional[bytes] = None, mime_type: str = "application/octet-stream") -> Document:
        doc_id = uuid.uuid4().hex[:12]
        document = Document(doc_id=doc_id, name=name, chunk_count=0, status="processing", doc_type=doc_type, raw_bytes=raw_bytes, mime_type=mime_type)
        self._documents[doc_id] = document
        logger.info("Added pending document '%s' (%s, type=%s)", name, doc_id, doc_type)
        return document

    def get_raw_file(self, doc_id: str):
        """Returns (bytes, mime_type) for a document, or (None, None) if not found."""
        doc = self._documents.get(doc_id)
        if doc and doc.raw_bytes:
            return doc.raw_bytes, doc.mime_type
        return None, None

    def set_total_pages(self, doc_id: str, total_pages: int) -> None:
        if doc_id in self._documents:
            self._documents[doc_id].total_pages = total_pages

    async def add_text_batch(self, doc_id: str, text: str, pages_in_batch: int) -> Document:
        """Chunk + embed + index one batch of pages. Call this repeatedly as more
        pages get extracted — chunks become searchable the moment this returns,
        even though the document as a whole isn't 'ready' yet."""
        if doc_id not in self._documents:
            raise ValueError(f"Document {doc_id} not found")
        doc = self._documents[doc_id]

        pieces = _chunk_text(text.strip())
        if pieces:
            async with self._lock:
                next_id = len(self._chunks) + 1
                new_chunks = [
                    DocumentChunk(id=next_id + i, doc_id=doc_id, doc_name=doc.name, text=piece)
                    for i, piece in enumerate(pieces)
                ]
                self._chunks.extend(new_chunks)
                doc.chunk_count += len(pieces)
                await self._add_chunks_to_index(new_chunks)

        doc.processed_pages += pages_in_batch
        return doc

    def mark_ready(self, doc_id: str) -> None:
        if doc_id in self._documents:
            doc = self._documents[doc_id]
            doc.status = "ready" if doc.chunk_count > 0 else "failed"

    def mark_failed(self, doc_id: str) -> None:
        if doc_id in self._documents:
            self._documents[doc_id].status = "failed"

    def get_document_status_summary(self) -> str:
        """Human-readable status of every document, for the LLM's system context."""
        if not self._documents:
            return "No documents have been uploaded."
        lines = []
        for doc in self._documents.values():
            unit = "seconds of video" if doc.doc_type == "video" else "pages"
            if doc.status == "ready":
                suffix = " Cite the [HH:MM:SS] timestamp naturally when answering about it." if doc.doc_type == "video" else ""
                lines.append(f'"{doc.name}" — fully indexed, ask anything about it.{suffix}')
            elif doc.status == "processing":
                if doc.total_pages:
                    lines.append(
                        f'"{doc.name}" — still being scanned ({doc.progress_percent}%, '
                        f'{doc.processed_pages}/{doc.total_pages} {unit} indexed so far). '
                        f'You can answer questions about content already indexed. If the user asks '
                        f'about something that might be in the un-indexed remainder, tell them it is '
                        f'still being scanned and to check back in a bit — do not say the document is unavailable.'
                    )
                else:
                    lines.append(f'"{doc.name}" — upload received, indexing is starting.')
            elif doc.status == "failed":
                lines.append(f'"{doc.name}" — failed to process, not available.')
        return "\n".join(lines)

    def remove_document(self, doc_id: str) -> bool:
        if doc_id not in self._documents:
            return False
        del self._documents[doc_id]
        self._chunks = [c for c in self._chunks if c.doc_id != doc_id]
        self._rebuild_index()
        return True

    def _rebuild_index(self) -> None:
        if not self._chunks:
            self._index = None
            return

        model = self._ensure_model()
        texts = [c.text for c in self._chunks]
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False, batch_size=EMBEDDING_BATCH_SIZE)
        embeddings = np.asarray(embeddings, dtype=np.float32)

        self._index = faiss.IndexFlatIP(embeddings.shape[1])
        self._index.add(embeddings)

    async def _add_chunks_to_index(self, chunks: List[DocumentChunk]) -> None:
        if not chunks:
            return

        model = self._ensure_model()
        texts = [c.text for c in chunks]

        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
                batch_size=EMBEDDING_BATCH_SIZE
            )
        )
        embeddings = np.asarray(embeddings, dtype=np.float32)

        if self._index is None:
            self._index = faiss.IndexFlatIP(embeddings.shape[1])

        self._index.add(embeddings)

    # Words that signal the user is generically referring to "the thing I just
    # uploaded" rather than asking about specific content within it. Pure
    # embedding similarity against a question like "what is in the image" often
    # scores BELOW the match threshold vs. a long descriptive chunk, even though
    # the image is exactly what's being asked about — there just isn't enough
    # lexical/semantic overlap in a short generic question. When we detect this
    # pattern and normal search comes back empty, we fall back to the most
    # recently uploaded document's own content instead of leaving the LLM blind.
    _GENERIC_REFERENCE_TERMS = (
        "image", "photo", "picture", "img", "pic", "screenshot", "snapshot",
        "document", "doc", "file", "upload", "uploaded", "attachment",
        "video", "mp4", "clip",
        "படம்", "படத்தில்", "படத்தை", "படத்துக்கு", "கோப்பு", "ஆவணம்",
        "வீடியோ", "வீடியோவில்", "வீடியோவை",
        "github", "repo", "repos", "repository", "repositories", "project", "projects"
    )

    def _is_generic_reference(self, query: str) -> bool:
        lowered = query.lower()
        return any(term in lowered for term in self._GENERIC_REFERENCE_TERMS)

    def get_context_chunks(
        self,
        query: str,
        top_k: int = TOP_K_CHUNKS,
        threshold: float = MATCH_SCORE_THRESHOLD,
    ) -> List[DocumentChunk]:
        """Preferred entry point for retrieval. Tries normal semantic search
        first; if that finds nothing but the question is a generic reference
        to an upload ("what's in the image", "describe the document", etc.),
        falls back to the most recently uploaded document's own chunks so a
        generically-phrased question doesn't come back empty-handed."""
        chunks = self.search(query, top_k=top_k, threshold=threshold)
        if chunks:
            return chunks

        if not self._is_generic_reference(query):
            return []

        candidates = [d for d in self._documents.values() if d.status in ("processing", "ready")]
        if not candidates:
            return []

        latest = candidates[-1]
        fallback_chunks = [c for c in self._chunks if c.doc_id == latest.doc_id][:top_k]
        if fallback_chunks:
            logger.info(
                "Generic reference query matched no chunks by similarity; "
                "falling back to latest document '%s' (%d chunk(s))",
                latest.name, len(fallback_chunks),
            )
        return fallback_chunks

    def search(
        self,
        query: str,
        top_k: int = TOP_K_CHUNKS,
        threshold: float = MATCH_SCORE_THRESHOLD,
    ) -> List[DocumentChunk]:
        if not query.strip() or self._index is None or self._index.ntotal == 0:
            return []

        model = self._ensure_model()

        from app.services.redis_service import redis_service
        query_key = query.strip().lower()

        redis_cached = redis_service.get_json(f"lyx:query_emb:{query_key}")
        if redis_cached:
            query_embedding = np.asarray(redis_cached, dtype=np.float32)
        elif EMBEDDING_CACHE_QUERIES and query_key in self._query_cache:
            query_embedding = self._query_cache[query_key]
        else:
            query_embedding = model.encode([query], normalize_embeddings=True, show_progress_bar=False)
            query_embedding = np.asarray(query_embedding, dtype=np.float32)
            if EMBEDDING_CACHE_QUERIES:
                self._query_cache[query_key] = query_embedding
            redis_service.set_json(f"lyx:query_emb:{query_key}", query_embedding.tolist(), ttl=3600)

        k = min(top_k, self._index.ntotal)
        scores, indices = self._index.search(query_embedding, k)

        results: List[DocumentChunk] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._chunks):
                continue
            if score < threshold:
                continue
            chunk = self._chunks[idx]
            doc = self._documents.get(chunk.doc_id)
            # Include partially-processed docs too — their indexed chunks are
            # already searchable, only "failed" docs are excluded.
            if doc and doc.status in ("processing", "ready"):
                results.append(chunk)
        return results