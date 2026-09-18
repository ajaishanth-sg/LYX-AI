from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None


class QAPair(BaseModel):
    question: str
    answer: str


class QAPairWithId(QAPair):
    id: int


class QABankUploadResult(BaseModel):
    loaded_count: int


class AskResponseData(BaseModel):
    transcribed_question: str
    matched_question: Optional[str]
    answer_text: str
    confidence_score: float
    answer_audio_url: Optional[str] = None
    answer_audio_base64: Optional[str] = None
    audio_error: Optional[str] = None


class HealthData(BaseModel):
    status: str = "ok"
    qa_count: int = 0
    video_upload_available: bool = False
class PersonaSettingsRequest(BaseModel):
    persona_prompt: str


class PersonaSettingsData(BaseModel):
    saved: bool
    persona_prompt: str
class ConversationStartData(BaseModel):
    session_id: str


class ConversationTextMessageRequest(BaseModel):
    session_id: str
    message: str
    model_id: Optional[str] = None


class SourceChunk(BaseModel):
    doc_name: str
    text: str

class ConversationMessageData(BaseModel):
    transcribed_text: str
    response_text: str
    response_audio_url: Optional[str] = None
    response_audio_base64: Optional[str] = None
    audio_error: Optional[str] = None
    session_id: str
    sources: Optional[List[SourceChunk]] = None


class ConversationEndData(BaseModel):
    ended: bool


class ConversationDeleteData(BaseModel):
    deleted: bool


class ConversationMessage(BaseModel):
    role: str
    content: str


class ConversationSummary(BaseModel):
    session_id: str
    started_at: str
    ended_at: Optional[str] = None
    messages: List[ConversationMessage]


class ConversationHistoryData(BaseModel):
    conversations: List[ConversationSummary]

class DocumentData(BaseModel):
    doc_id: str
    name: str
    chunk_count: int
    status: str = "processing"  # "processing" (partially indexed) | "ready" | "failed"
    total_pages: int = 0
    processed_pages: int = 0
    progress_percent: int = 0
    doc_type: str = "document"  # "document" | "video" -- total_pages/processed_pages are seconds for video


class DocumentUploadResult(BaseModel):
    doc_id: str
    name: str
    chunk_count: int = 0  # 0 until processing completes
    status: str = "processing"
    doc_type: str = "document"


class DocumentDeleteResult(BaseModel):
    deleted: bool

class CustomModel(BaseModel):
    id: str
    name: str
    display_name: Optional[str] = None
    api_key: Optional[str] = ""
    provider: str = "groq"
    base_url: Optional[str] = ""
    is_visible: bool = True
    is_default: bool = False
    max_input_tokens: Optional[int] = 128000
    supports_image_input: bool = False
    supports_reasoning: bool = False

class CustomModelRequest(BaseModel):
    name: str
    display_name: Optional[str] = None
    api_key: Optional[str] = ""
    provider: str = "groq"
    base_url: Optional[str] = ""
    is_visible: bool = True
    is_default: bool = False
    max_input_tokens: Optional[int] = 128000
    supports_image_input: bool = False
    supports_reasoning: bool = False