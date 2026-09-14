import logging

from typing import Optional

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    ApiResponse,
    ConversationDeleteData,
    ConversationEndData,
    ConversationHistoryData,
    ConversationMessage,
    ConversationMessageData,
    ConversationStartData,
    ConversationSummary,
    ConversationTextMessageRequest,
    ErrorDetail,
)
from app.services.conversation_manager import ConversationManager
from app.services.document_store import DocumentStore
from app.services.llm_service import LLMService
from app.services.stt_service import STTService, UnsupportedLanguageError
from app.services.tts_service import TTSService, TTSSynthesisError

from app.services.system_agent import system_agent

def _check_and_execute_system_action(user_text: str) -> Optional[str]:
    text_lower = user_text.lower()
    res = None
    if "light" in text_lower and ("off" in text_lower or "close" in text_lower):
        res = system_agent.control_smart_light("off")
    elif "light" in text_lower and ("on" in text_lower or "turn" in text_lower or "light" in text_lower):
        res = system_agent.control_smart_light("on")
    elif "notepad" in text_lower and ("open" in text_lower or "launch" in text_lower or "start" in text_lower):
        res = system_agent.open_app("notepad")
    elif "calc" in text_lower and ("open" in text_lower or "launch" in text_lower or "start" in text_lower):
        res = system_agent.open_app("calc")

    if res:
        out = res.get("output", "")
        file_p = res.get("file_path", "")
        msg = f"System Action Executed: {out}"
        if file_p:
            msg += f" | Script location: {file_p}"
        return msg
    return None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/conversation", tags=["conversation"])


@router.post("/start", response_model=ApiResponse[ConversationStartData])
async def start_conversation(request: Request) -> ApiResponse[ConversationStartData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    session = conversation_manager.start_session()
    return ApiResponse(success=True, data=ConversationStartData(session_id=session.session_id))


@router.post("/message", response_model=ApiResponse[ConversationMessageData])
async def send_message(
    request: Request,
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    model_id: Optional[str] = Form(None),
) -> ApiResponse[ConversationMessageData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    stt_service: STTService = request.app.state.stt_service
    llm_service: LLMService = request.app.state.llm_service
    tts_service: TTSService = request.app.state.tts_service

    session = conversation_manager.get_session(session_id)
    if session is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="SESSION_NOT_FOUND", message="Invalid or expired session_id."),
        )

    content = await audio.read()
    if not content:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="INVALID_AUDIO", message="Uploaded audio file is empty."),
        )

    suffix = ".webm"
    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[-1].lower()

    try:
        transcribed = await stt_service.transcribe_bytes_async(content, suffix=suffix)
    except UnsupportedLanguageError as exc:
        logger.info("Rejected unsupported-language speech: %s", exc)
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="UNSUPPORTED_LANGUAGE",
                message="மன்னிக்கவும், தமிழிலோ ஆங்கிலத்திலோ மட்டும் பேசுங்கள்.",
            ),
        )
    except Exception as exc:
        logger.exception("STT failed")
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="STT_FAILED", message=f"Speech-to-text failed: {exc}"),
        )

    if not transcribed.strip():
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="NO_SPEECH", message="Could not detect speech. Please try again."),
        )

    history = conversation_manager.get_history(session_id)

    document_store: DocumentStore = request.app.state.document_store
    relevant_chunks = document_store.get_context_chunks(transcribed)
    document_context = "\n\n---\n\n".join(
        f'From "{chunk.doc_name}":\n{chunk.text}' for chunk in relevant_chunks
    )

    # Add document status and system control result to system context
    system_context = f"Document status:\n{document_store.get_document_status_summary()}"
    sys_res = _check_and_execute_system_action(transcribed)
    if sys_res:
        system_context += f"\n\n[REAL-TIME SYSTEM CONTROL AGENT EXECUTION]:\n{sys_res}\nConfirm to the user that the Python script / command has been executed live on their system."

    try:
        # Always use the current global persona, not the one frozen at session start,
        # so changing/resetting it in Settings takes effect on the active conversation too.
        # document_context is only non-empty when the question is actually relevant to an
        # uploaded document, so normal conversation is unaffected when nothing matches.
        reply_text = await llm_service.generate_reply_async(
            persona_prompt=conversation_manager.get_persona(),
            history=history,
            user_message=transcribed,
            document_context=document_context,
            system_context=system_context,
            model_id=model_id,
        )
    except TimeoutError as exc:
        logger.warning("LLM generation timed out")
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="LLM_TIMEOUT", message=str(exc)),
        )
    except Exception as exc:
        logger.exception("LLM generation failed")
        matcher_service = getattr(request.app.state, "matcher_service", None)
        reply_text = None
        if matcher_service:
            match_result = matcher_service.find_best_match(transcribed)
            if match_result and match_result.confidence >= 0.45:
                reply_text = match_result.qa_pair.answer

        if not reply_text:
            reply_text = "மன்னிக்கவும், AI மாதிரியை தொடர்புகொள்ள இயலவில்லை. அமைப்புகளில் உங்கள் Groq/LLM API சாவியைப் புதுப்பிக்கவும்."

        try:
            audio_path = await tts_service.synthesize(reply_text, filename_prefix="reply")
            response_audio_base64 = await tts_service.audio_base64(audio_path)
            audio_url = tts_service.audio_url(audio_path)
        except Exception:
            audio_url = None
            response_audio_base64 = None

        conversation_manager.append_exchange(session_id, transcribed, reply_text)
        return ApiResponse(
            success=True,
            data=ConversationMessageData(
                transcribed_text=transcribed,
                response_text=reply_text,
                response_audio_url=audio_url,
                response_audio_base64=response_audio_base64,
                session_id=session_id,
            ),
        )

    try:
        audio_path = await tts_service.synthesize(reply_text, filename_prefix="reply")
    except TTSSynthesisError as exc:
        # The text reply already succeeded — don't throw it away just because
        # voice playback failed. Return it normally, with no audio and a
        # short, user-safe note (never the raw exception/URL) instead.
        logger.warning("TTS failed for session %s, returning text-only reply", session_id)
        conversation_manager.append_exchange(session_id, transcribed, reply_text)
        return ApiResponse(
            success=True,
            data=ConversationMessageData(
                transcribed_text=transcribed,
                response_text=reply_text,
                response_audio_url=None,
                audio_error=exc.user_message,
                session_id=session_id,
            ),
        )

    conversation_manager.append_exchange(session_id, transcribed, reply_text)

    response_audio_base64 = await tts_service.audio_base64(audio_path)

    return ApiResponse(
        success=True,
        data=ConversationMessageData(
            transcribed_text=transcribed,
            response_text=reply_text,
            response_audio_url=tts_service.audio_url(audio_path),
            response_audio_base64=response_audio_base64,
            session_id=session_id,
        ),
    )

@router.post("/message-text", response_model=ApiResponse[ConversationMessageData])
async def send_text_message(
    request: Request,
    payload: ConversationTextMessageRequest,
) -> ApiResponse[ConversationMessageData]:
    """Chatbot-mode counterpart to /message. Same session, persona, and
    document-aware pipeline as the voice flow, minus STT/TTS — the request
    and reply are plain text end-to-end."""
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    llm_service: LLMService = request.app.state.llm_service
    document_store: DocumentStore = request.app.state.document_store

    session = conversation_manager.get_session(payload.session_id)
    if session is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="SESSION_NOT_FOUND", message="Invalid or expired session_id."),
        )

    message = (payload.message or "").strip()
    if not message:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="EMPTY_MESSAGE", message="Message cannot be empty."),
        )

    history = conversation_manager.get_history(payload.session_id)

    relevant_chunks = document_store.get_context_chunks(message)
    document_context = "\n\n---\n\n".join(
        f'From "{chunk.doc_name}":\n{chunk.text}' for chunk in relevant_chunks
    )
    system_context = f"Document status:\n{document_store.get_document_status_summary()}"
    sys_res = _check_and_execute_system_action(message)
    if sys_res:
        system_context += f"\n\n[REAL-TIME SYSTEM CONTROL AGENT EXECUTION]:\n{sys_res}\nConfirm to the user that the Python script / command has been executed live on their system."

    try:
        # Same persona lookup as voice mode: always the current global
        # persona, so Settings changes apply live to chatbot mode too.
        reply_text = await llm_service.generate_reply_async(
            persona_prompt=conversation_manager.get_persona(),
            history=history,
            user_message=message,
            document_context=document_context,
            system_context=system_context,
            model_id=payload.model_id,
        )
    except TimeoutError as exc:
        logger.warning("LLM generation timed out")
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="LLM_TIMEOUT", message=str(exc)),
        )
    except Exception as exc:
        logger.exception("LLM generation failed")
        matcher_service = getattr(request.app.state, "matcher_service", None)
        reply_text = None
        if matcher_service:
            match_result = matcher_service.match(message)
            if match_result and match_result.matched and match_result.pair:
                reply_text = match_result.pair.answer

        if not reply_text:
            reply_text = "⚠️ **API Key Required**: The Groq LLM API key is missing, invalid, or expired. Please enter a valid API key in **Settings → Models** or `.env` (`GROQ_API_KEY`)."

        conversation_manager.append_exchange(payload.session_id, message, reply_text)
        return ApiResponse(
            success=True,
            data=ConversationMessageData(
                transcribed_text=message,
                response_text=reply_text,
                response_audio_url=None,
                response_audio_base64=None,
                session_id=payload.session_id,
            ),
        )

    conversation_manager.append_exchange(payload.session_id, message, reply_text)

    return ApiResponse(
        success=True,
        data=ConversationMessageData(
            transcribed_text=message,
            response_text=reply_text,
            response_audio_url=None,
            response_audio_base64=None,
            session_id=payload.session_id,
        ),
    )

@router.post("/message-text-stream")
async def send_text_message_stream(
    request: Request,
    payload: ConversationTextMessageRequest,
):
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    llm_service: LLMService = request.app.state.llm_service
    document_store: DocumentStore = request.app.state.document_store

    session = conversation_manager.get_session(payload.session_id)
    if session is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="SESSION_NOT_FOUND", message="Invalid or expired session_id."),
        )

    message = (payload.message or "").strip()
    if not message:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="EMPTY_MESSAGE", message="Message cannot be empty."),
        )

    history = conversation_manager.get_history(payload.session_id)

    relevant_chunks = document_store.get_context_chunks(message)
    document_context = "\n\n---\n\n".join(
        f'From "{chunk.doc_name}":\n{chunk.text}' for chunk in relevant_chunks
    )
    system_context = f"Document status:\n{document_store.get_document_status_summary()}"

    async def event_generator():
        full_reply = ""
        try:
            async for chunk in llm_service.generate_stream(
                persona_prompt=conversation_manager.get_persona(),
                history=history,
                user_message=message,
                document_context=document_context,
                system_context=system_context,
                model_id=payload.model_id,
            ):
                full_reply += chunk
                yield chunk
            
            # Save the fully generated message to history after streaming completes
            conversation_manager.append_exchange(payload.session_id, message, full_reply)
        except Exception as e:
            logger.exception("LLM generation stream failed")
            matcher_service = getattr(request.app.state, "matcher_service", None)
            fallback_answer = None
            if matcher_service:
                match_result = matcher_service.match(message)
                if match_result and match_result.matched and match_result.pair:
                    fallback_answer = match_result.pair.answer

            if fallback_answer:
                conversation_manager.append_exchange(payload.session_id, message, fallback_answer)
                yield fallback_answer
            else:
                err_str = str(e)
                if "invalid_api_key" in err_str.lower() or "invalid api key" in err_str.lower() or "403" in err_str:
                    user_msg = "⚠️ **API Key Required**: The current Groq LLM API key is invalid or expired. Please update your API key in **Settings → Models** or set `GROQ_API_KEY` in your `.env` file."
                elif "model_not_found" in err_str.lower() or "does not exist" in err_str.lower():
                    user_msg = "⚠️ **Model Not Found**: The selected model is unavailable or the API key lacks access. Please select a valid model or update your API key in **Settings → Models**."
                else:
                    user_msg = f"⚠️ **Response Error**: {err_str}"
                yield user_msg

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.get("/history", response_model=ApiResponse[ConversationHistoryData])
async def get_conversation_history(request: Request) -> ApiResponse[ConversationHistoryData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    sessions = conversation_manager.get_all_conversations()
    conversations = [
        ConversationSummary(
            session_id=s.session_id,
            started_at=s.started_at.isoformat(),
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
            messages=[ConversationMessage(role=m["role"], content=m["content"]) for m in s.history],
        )
        for s in sessions
    ]
    return ApiResponse(success=True, data=ConversationHistoryData(conversations=conversations))

@router.delete("/history/{session_id}", response_model=ApiResponse[ConversationDeleteData])
async def delete_conversation_history(request: Request, session_id: str) -> ApiResponse[ConversationDeleteData]:
    """Delete one archived (ended) conversation from the history popup. This
    only removes it from the past-conversations archive — it never touches
    an active/live session (use DELETE /{session_id} for that)."""
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    deleted = conversation_manager.delete_conversation(session_id)
    if not deleted:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="CONVERSATION_NOT_FOUND", message="Conversation not found."),
        )
    return ApiResponse(success=True, data=ConversationDeleteData(deleted=True))

@router.delete("/{session_id}", response_model=ApiResponse[ConversationEndData])
async def end_conversation(request: Request, session_id: str) -> ApiResponse[ConversationEndData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    ended = conversation_manager.end_session(session_id)
    return ApiResponse(success=True, data=ConversationEndData(ended=ended))