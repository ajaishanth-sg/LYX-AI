import asyncio
import logging
import math
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Request, UploadFile, Response

from app.config import (
    MAX_VIDEO_DURATION_SECONDS,
    MAX_VIDEO_FILE_SIZE_BYTES,
    VIDEO_CHUNK_WINDOW_SECONDS,
)
from app.models.schemas import (
    ApiResponse,
    DocumentData,
    DocumentDeleteResult,
    DocumentUploadResult,
    ErrorDetail,
)
from app.services import document_parser, video_service
from app.services.document_parser import SUPPORTED_EXTENSIONS, extract_text
from app.services.document_store import DocumentStore
from app.services.stt_service import STTService, UnsupportedLanguageError
from app.services.video_service import VIDEO_EXTENSIONS, VideoProcessingError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

MAX_DOCUMENT_SIZE_BYTES = 32 * 1024 * 1024  # 32 MB
BATCH_PAGE_SIZE = 20  # pages per incremental indexing batch
ALL_UPLOAD_EXTENSIONS = SUPPORTED_EXTENSIONS + VIDEO_EXTENSIONS


def _format_timestamp(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


async def process_document_background(doc_id: str, filename: str, content: bytes, document_store: DocumentStore):
    """Background task: extract + index a document incrementally so it becomes
    partially searchable while large PDFs are still being processed."""
    try:
        if filename.lower().endswith(".pdf"):
            import io
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            total_pages = len(reader.pages)
            document_store.set_total_pages(doc_id, total_pages)

            for start in range(0, total_pages, BATCH_PAGE_SIZE):
                batch = reader.pages[start:start + BATCH_PAGE_SIZE]
                texts = []
                for p in batch:
                    try:
                        texts.append(p.extract_text() or "")
                    except Exception as exc:
                        logger.warning("Doc %s: failed to extract a page: %s", doc_id, exc)
                        texts.append("")
                await document_store.add_text_batch(doc_id, "\n".join(texts), len(batch))
                logger.info(
                    "Doc %s: indexed %d/%d pages",
                    doc_id, min(start + BATCH_PAGE_SIZE, total_pages), total_pages,
                )
        else:
            text = await extract_text(filename, content)
            await document_store.add_text_batch(doc_id, text, 1)

        document_store.mark_ready(doc_id)
        logger.info("Background processing completed for document %s", doc_id)
    except Exception as exc:
        logger.exception("Background processing failed for document %s: %s", doc_id, exc)
        document_store.mark_failed(doc_id)


async def process_video_background(
    doc_id: str,
    filename: str,
    content: bytes,
    document_store: DocumentStore,
    stt_service: Optional[STTService],
):
    """Background task: extract the audio track + sample frames from an
    uploaded video, transcribe/describe each VIDEO_CHUNK_WINDOW_SECONDS window,
    and index incrementally -- the same partial-searchability pattern as
    process_document_background() above, with 'pages' repurposed as 'seconds
    of video processed' so the existing progress bar keeps working unchanged."""
    work_dir = Path(tempfile.mkdtemp(prefix=f"video_{doc_id}_"))
    video_path = work_dir / (filename or "upload.mp4")
    audio_path = work_dir / "audio.wav"
    frames_dir = work_dir / "frames"

    try:
        video_path.write_bytes(content)

        duration = await video_service.probe_duration_seconds_async(video_path)
        if duration > MAX_VIDEO_DURATION_SECONDS:
            raise ValueError(
                f"Video is {duration / 60:.0f} minutes long, which exceeds the "
                f"{MAX_VIDEO_DURATION_SECONDS / 60:.0f}-minute limit."
            )

        document_store.set_total_pages(doc_id, max(1, round(duration)))

        # 1. Audio -- transcribe the whole track once (timestamped segments),
        # then bucket segments into windows below, rather than re-running
        # Whisper once per window.
        segments: List[dict] = []
        try:
            has_audio = await video_service.extract_audio_async(video_path, audio_path)
        except VideoProcessingError as exc:
            logger.warning("Doc %s: audio extraction failed (%s); indexing visuals only.", doc_id, exc)
            has_audio = False

        if has_audio and stt_service is not None:
            try:
                segments = await stt_service.transcribe_with_timestamps_async(audio_path)
            except UnsupportedLanguageError as exc:
                logger.warning("Doc %s: unsupported audio language (%s); indexing visuals only.", doc_id, exc)
            except Exception as exc:
                logger.warning("Doc %s: transcription failed (%s); indexing visuals only.", doc_id, exc)
        elif not has_audio:
            logger.info("Doc %s: video has no audio track; skipping transcription.", doc_id)

        # 2. Sample frames across the whole video up front (scene-change
        # detection preferred, capped/evenly-spaced fallback otherwise) --
        # see video_service.sample_frames for the cap logic.
        try:
            frame_samples = await video_service.sample_frames_async(video_path, frames_dir, duration)
        except VideoProcessingError as exc:
            logger.warning("Doc %s: frame sampling failed (%s); indexing transcript only.", doc_id, exc)
            frame_samples = []

        # 3. Walk the video in fixed windows, merging that window's transcript
        # segments + any sampled frames' OCR/scene text into one timestamped
        # chunk, and index each window as soon as it's built.
        num_windows = max(1, math.ceil(duration / VIDEO_CHUNK_WINDOW_SECONDS)) if duration > 0 else 1

        for i in range(num_windows):
            w_start = i * VIDEO_CHUNK_WINDOW_SECONDS
            w_end = min(w_start + VIDEO_CHUNK_WINDOW_SECONDS, duration) if duration > 0 else VIDEO_CHUNK_WINDOW_SECONDS

            window_transcript = " ".join(
                s["text"] for s in segments if s["start"] < w_end and s["end"] > w_start
            ).strip()

            on_screen_bits: List[str] = []
            scene_bits: List[str] = []
            for frame in [f for f in frame_samples if w_start <= f.timestamp < w_end]:
                try:
                    frame_bytes = frame.path.read_bytes()
                    ocr_text, scene_text = await asyncio.to_thread(
                        document_parser.describe_image_sources, frame_bytes
                    )
                except Exception as exc:
                    logger.warning(
                        "Doc %s: describing frame at %.1fs failed: %s", doc_id, frame.timestamp, exc
                    )
                    continue
                if ocr_text:
                    on_screen_bits.append(ocr_text)
                if scene_text:
                    scene_bits.append(scene_text)

            parts = []
            if window_transcript:
                parts.append(f"Transcript: {window_transcript}")
            if on_screen_bits:
                parts.append("On-screen text: " + " / ".join(on_screen_bits))
            if scene_bits:
                parts.append("Scene: " + " / ".join(scene_bits))

            window_seconds = max(1, round(w_end - w_start))
            if parts:
                chunk_text = (
                    f"[{_format_timestamp(w_start)}\u2013{_format_timestamp(w_end)}] "
                    + " | ".join(parts)
                )
                await document_store.add_text_batch(doc_id, chunk_text, window_seconds)
            else:
                # Nothing to index for this window (silence + no visual
                # change) -- still advance progress so the bar doesn't stall.
                await document_store.add_text_batch(doc_id, "", window_seconds)

            logger.info(
                "Doc %s: indexed video window %s\u2013%s (%d/%d)",
                doc_id, _format_timestamp(w_start), _format_timestamp(w_end), i + 1, num_windows,
            )

        document_store.mark_ready(doc_id)
        logger.info("Background video processing completed for document %s", doc_id)
    except Exception as exc:
        logger.exception("Background video processing failed for document %s: %s", doc_id, exc)
        document_store.mark_failed(doc_id)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


@router.get("", response_model=ApiResponse[List[DocumentData]])
async def list_documents(request: Request) -> ApiResponse[List[DocumentData]]:
    document_store: DocumentStore = request.app.state.document_store
    docs = [
        DocumentData(
            doc_id=d.doc_id,
            name=d.name,
            chunk_count=d.chunk_count,
            status=d.status,
            total_pages=d.total_pages,
            processed_pages=d.processed_pages,
            progress_percent=d.progress_percent,
            doc_type=d.doc_type,
        )
        for d in document_store.documents
    ]
    return ApiResponse(success=True, data=docs)


@router.post("/upload", response_model=ApiResponse[DocumentUploadResult])
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> ApiResponse[DocumentUploadResult]:
    document_store: DocumentStore = request.app.state.document_store

    if not file.filename or not file.filename.lower().endswith(ALL_UPLOAD_EXTENSIONS):
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="INVALID_FILE",
                message="Please upload a PDF, Word, Excel/CSV, text, image, or video file.",
            ),
        )

    is_video = file.filename.lower().endswith(VIDEO_EXTENSIONS)
    if is_video and not getattr(request.app.state, "ffmpeg_available", False):
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="FFMPEG_UNAVAILABLE",
                message="Video processing is unavailable on this server (ffmpeg not found). Contact the administrator.",
            ),
        )

    content = await file.read()

    # Video is capped by duration (checked once the file is on disk and can be
    # probed), not by byte size -- a short 4K clip and a long 480p one cost
    # very differently to process. This is just a coarse sanity limit on the
    # raw upload before that real check happens.
    if is_video:
        if len(content) > MAX_VIDEO_FILE_SIZE_BYTES:
            return ApiResponse(
                success=False,
                error=ErrorDetail(
                    code="FILE_TOO_LARGE",
                    message=f"Video exceeds the {MAX_VIDEO_FILE_SIZE_BYTES // (1024 * 1024)} MB upload limit.",
                ),
            )
    elif len(content) > MAX_DOCUMENT_SIZE_BYTES:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="FILE_TOO_LARGE", message="Document exceeds the 32 MB limit."),
        )

    document = document_store.add_document_pending(
        file.filename, 
        doc_type="video" if is_video else "document",
        raw_bytes=content,
        mime_type=file.content_type or "application/octet-stream"
    )

    if is_video:
        background_tasks.add_task(
            process_video_background,
            document.doc_id,
            file.filename,
            content,
            document_store,
            request.app.state.stt_service,
        )
    else:
        background_tasks.add_task(
            process_document_background,
            document.doc_id,
            file.filename,
            content,
            document_store
        )

    return ApiResponse(
        success=True,
        data=DocumentUploadResult(
            doc_id=document.doc_id,
            name=document.name,
            chunk_count=0,
            status="processing",
            doc_type=document.doc_type,
        ),
    )


@router.delete("/{doc_id}", response_model=ApiResponse[DocumentDeleteResult])
async def delete_document(request: Request, doc_id: str) -> ApiResponse[DocumentDeleteResult]:
    document_store: DocumentStore = request.app.state.document_store
    removed = document_store.remove_document(doc_id)
    if not removed:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="NOT_FOUND", message="Document not found."),
        )
    return ApiResponse(success=True, data=DocumentDeleteResult(deleted=True))

@router.get("/{doc_id}/raw")
async def get_document_raw(request: Request, doc_id: str):
    document_store: DocumentStore = request.app.state.document_store
    raw_bytes, mime_type = document_store.get_raw_file(doc_id)
    if not raw_bytes:
        return Response(content="File not found or no raw content stored.", status_code=404)
    return Response(content=raw_bytes, media_type=mime_type)