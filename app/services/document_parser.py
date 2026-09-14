import asyncio
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List

# On Windows, pytesseract sometimes doesn't inherit PATH/TESSDATA_PREFIX the
# way the plain 'tesseract' cmd does (e.g. different process environment,
# venv launched before the env var was set). Pinning the binary path directly
# removes that whole class of "works in cmd, not in Python" mismatch. Safe to
# leave in on Linux/Mac too — pytesseract only uses this if the path exists.
import os as _os
import pytesseract as _pytesseract
_WINDOWS_TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if _os.name == "nt" and _os.path.exists(_WINDOWS_TESSERACT_PATH):
    _pytesseract.pytesseract.tesseract_cmd = _WINDOWS_TESSERACT_PATH

logger = logging.getLogger(__name__)

# Documents
DOCUMENT_EXTENSIONS = (".pdf", ".docx", ".txt", ".md")
# Spreadsheets
SPREADSHEET_EXTENSIONS = (".xlsx", ".xls", ".csv")
# Images (extracted via OCR)
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")
# Video (audio -> STT, sampled frames -> the same OCR+vision hybrid as images).
# Video is intentionally NOT part of SUPPORTED_EXTENSIONS / extract_text() below:
# unlike every other type here, it can't be extracted in one shot -- it needs
# incremental transcription+frame-sampling handled by video_service.py and the
# background task in routes/documents.py, so a long upload becomes partially
# searchable before it's fully processed. See app/services/video_service.py.
VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".mkv", ".webm")

SUPPORTED_EXTENSIONS = DOCUMENT_EXTENSIONS + SPREADSHEET_EXTENSIONS + IMAGE_EXTENSIONS

_executor = ThreadPoolExecutor(max_workers=4)


async def extract_text(filename: str, content: bytes) -> str:
    """Extract plain text from an uploaded source's raw bytes asynchronously.
    Supports documents (PDF/DOCX/TXT/MD), spreadsheets (XLSX/XLS/CSV) and
    images (PNG/JPG/... via OCR)."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return await asyncio.to_thread(_extract_pdf, content)
    if lower.endswith(".docx"):
        return await asyncio.to_thread(_extract_docx, content)
    if lower.endswith((".txt", ".md")):
        return content.decode("utf-8", errors="ignore")
    if lower.endswith(".csv"):
        return await asyncio.to_thread(_extract_csv, content)
    if lower.endswith((".xlsx", ".xls")):
        return await asyncio.to_thread(_extract_excel, content, lower)
    if lower.endswith(IMAGE_EXTENSIONS):
        return await asyncio.to_thread(_extract_image, content)
    if lower.endswith(VIDEO_EXTENSIONS):
        raise ValueError(
            "Video files are processed incrementally (audio + sampled frames), not "
            "via extract_text(). Use the video upload path in routes/documents.py, "
            "which calls video_service.py and STTService directly."
        )

    raise ValueError(
        "Unsupported file type. Please upload a PDF, Word, Excel/CSV, text, image, or video file."
    )


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    from concurrent.futures import ThreadPoolExecutor

    reader = PdfReader(io.BytesIO(content))
    total_pages = len(reader.pages)

    def extract_page_text(args):
        idx, page = args
        try:
            return page.extract_text() or ""
        except Exception as exc:
            # Don't let one bad page kill the whole document.
            logger.warning("Failed to extract text from page %d/%d: %s", idx + 1, total_pages, exc)
            return ""

    with ThreadPoolExecutor(max_workers=4) as executor:
        pages = list(executor.map(extract_page_text, enumerate(reader.pages)))

    text = "\n".join(pages)
    extracted_chars = len(text.strip())
    non_empty_pages = sum(1 for p in pages if p.strip())

    logger.info(
        "PDF extraction: %d/%d pages had text, %d chars total",
        non_empty_pages, total_pages, extracted_chars,
    )

    # If almost nothing came out, this is very likely a scanned/image-only PDF.
    # pypdf can't OCR it — surface a clear reason instead of a silent generic failure.
    if total_pages > 0 and non_empty_pages / total_pages < 0.05:
        raise ValueError(
            f"This PDF appears to be scanned/image-based — only {non_empty_pages} of "
            f"{total_pages} pages had extractable text. It needs OCR before it can be used."
        )

    return text


def _extract_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_csv(content: bytes) -> str:
    import csv

    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    lines = []
    for row in reader:
        if any(cell.strip() for cell in row):
            lines.append(" | ".join(cell.strip() for cell in row))
    if not lines:
        raise ValueError("This CSV file appears to be empty.")
    return "\n".join(lines)


def _extract_excel(content: bytes, lower_filename: str) -> str:
    """Extract text from .xlsx / .xls by reading every sheet, row by row."""
    if lower_filename.endswith(".xls"):
        # Legacy binary Excel format.
        import xlrd

        book = xlrd.open_workbook(file_contents=content)
        lines = []
        for sheet in book.sheets():
            lines.append(f"--- Sheet: {sheet.name} ---")
            for row_idx in range(sheet.nrows):
                row = sheet.row_values(row_idx)
                if any(str(cell).strip() for cell in row):
                    lines.append(" | ".join(str(cell).strip() for cell in row))
        text = "\n".join(lines)
    else:
        from openpyxl import load_workbook

        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        lines = []
        for sheet in wb.worksheets:
            lines.append(f"--- Sheet: {sheet.title} ---")
            for row in sheet.iter_rows(values_only=True):
                cells = [str(c).strip() if c is not None else "" for c in row]
                if any(cells):
                    lines.append(" | ".join(cells))
        text = "\n".join(lines)

    if not text.strip():
        raise ValueError("This spreadsheet appears to be empty.")
    return text


def describe_image_sources(content: bytes):
    """Runs the OCR-first, vision-second hybrid on raw image bytes and returns
    (ocr_text, scene_text) as two separate strings (either may be empty).

    Split out from _extract_image so both standalone image uploads AND the
    video pipeline (per sampled frame, tagged with its own timestamp) can
    reuse the identical extraction logic instead of two implementations
    drifting apart."""
    from PIL import Image

    try:
        image = Image.open(io.BytesIO(content))
        image = image.convert("RGB")
    except Exception as exc:
        raise ValueError(f"Could not read image file: {exc}") from exc

    # 1. OCR first — it can only report characters that are actually on the
    # pixels (even if imperfectly recognized), so it can't invent a location,
    # date, or phone number the way a vision LLM was doing. This is the
    # primary source of truth for any literal text in the image.
    ocr_text = ""
    try:
        ocr_text = _ocr_image_raw(image)
    except Exception as exc:
        logger.warning("OCR extraction failed: %s", exc)

    # 2. Vision model second, to provide a description of the visual scene
    # AND to transcribe any text present in the image. Modern multimodal models
    # are very good at this and can provide text that Tesseract misses.
    vision_text = ""
    try:
        vision_text = _describe_scene_with_groq(image) or ""
    except Exception as exc:
        logger.warning("Groq vision scene description failed: %s", exc)

    return ocr_text.strip(), vision_text.strip()


def _extract_image(content: bytes) -> str:
    """Describe/read an uploaded image using a Groq vision model (handles both
    photos — "what's in this picture" — and text-bearing images/screenshots,
    including Tamil text). Falls back to local Tesseract OCR if no Groq API
    key is configured or the vision call fails, so text-only images still work
    even without an API key."""
    ocr_text, vision_text = describe_image_sources(content)

    image_source_notes: List[str] = []

    if ocr_text:
        image_source_notes.append(
            "Text extracted directly from the image via OCR (verbatim from the "
            "pixels — may have occasional character-recognition mistakes on "
            "stylized fonts, but nothing here is invented):\n" + ocr_text
        )

    if vision_text:
        image_source_notes.append(
            "Visual scene description AND text transcription from a vision model:\n" + vision_text
        )

    if not image_source_notes:
        raise ValueError(
            "Could not extract anything useful from this image. It may not contain "
            "readable text, OCR (Tesseract) may not be installed on the server, and "
            "image description requires GROQ_API_KEY to be set."
        )

    return "\n\n---\n\n".join(image_source_notes)


def _describe_scene_with_groq(image) -> str:
    """Send the image to a Groq vision model for a description of the visual
    scene (colors, layout, objects, people, style) AND to transcribe any
    text present in the image. Modern vision models are capable of reading
    text, including Tamil, which helps provide context that Tesseract
    might miss."""
    import base64

    from groq import Groq

    from app.config import GROQ_API_KEY, GROQ_VISION_MODEL

    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set; cannot use vision model.")

    buf = io.BytesIO()
    image_to_send = image
    max_dim = 1600
    if max(image.size) > max_dim:
        image_to_send = image.copy()
        image_to_send.thumbnail((max_dim, max_dim))
    image_to_send.save(buf, format="JPEG", quality=90)
    b64_image = base64.b64encode(buf.getvalue()).decode("utf-8")

    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Describe the VISUAL scene of this image and carefully transcribe any text you see. "
                            "Include overall layout/composition, colors, objects, people, and graphics. "
                            "Crucially, read and transcribe all text in the image, especially Tamil text, "
                            "titles, dates, times, and other key details. Combine the text and visual description "
                            "into a comprehensive summary. Answer in plain text only, no markdown."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                    },
                ],
            }
        ],
        temperature=0.3,
        max_tokens=400,
    )
    return completion.choices[0].message.content or ""


def _ocr_image_raw(image) -> str:
    """Local OCR via Tesseract. Returns whatever text it finds (possibly
    empty) rather than raising — the caller decides what to do if both OCR
    and vision come back empty."""
    import pytesseract

    try:
        available_langs = pytesseract.get_languages(config="")
    except Exception:
        available_langs = []

    if "tam" not in available_langs:
        logger.warning(
            "Tesseract's Tamil language pack ('tam') is not installed — Tamil words in "
            "images will OCR as garbled nonsense (numbers/English text still come through "
            "fine). Install it with 'apt-get install tesseract-ocr-tam' for accurate Tamil "
            "text extraction."
        )

    try:
        text = pytesseract.image_to_string(image, lang="eng+tam")
    except pytesseract.TesseractNotFoundError:
        logger.warning(
            "Tesseract is not installed on the server; OCR unavailable. Install it "
            "with 'apt-get install tesseract-ocr tesseract-ocr-tam' for reliable text "
            "extraction from images (recommended even when GROQ_API_KEY is set)."
        )
        return ""
    except Exception:
        logger.warning("OCR with 'eng+tam' failed, retrying with 'eng' only")
        try:
            text = pytesseract.image_to_string(image, lang="eng")
        except Exception as exc:
            logger.warning("OCR retry with 'eng' also failed: %s", exc)
            return ""

    return text.strip()