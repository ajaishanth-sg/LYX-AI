import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional

from faster_whisper import WhisperModel

from app.config import STT_COMPUTE_TYPE, STT_DEVICE, STT_MODEL_SIZE

logger = logging.getLogger(__name__)

# Both English and Tamil speech are accepted as input. Whisper first guesses
# the spoken language, then decodes the ENTIRE audio using that language's
# vocabulary/script. Since we no longer force a single language, we let
# Whisper auto-detect between (in practice) English and Tamil and decode
# natively in whichever script that is -- this is exactly Whisper's normal
# behaviour, so no forced-decode trick is needed here.
#
# We still guard against a wrong language-ID guess on short/noisy clips
# (e.g. audio getting mis-detected as some third language and decoded into
# garbage script) by rejecting confident non-English/non-Tamil detections.
ALLOWED_LANGUAGES = {"en", "ta"}
LANGUAGE_CONFIDENCE_THRESHOLD = 0.5


class UnsupportedLanguageError(Exception):
    """Raised when confident, non-empty speech is detected in a language
    other than English or Tamil."""

    def __init__(self, language: str, probability: float) -> None:
        self.language = language
        self.probability = probability
        super().__init__(
            f"Detected unsupported speech language={language}, confidence={probability:.2f}"
        )


class STTService:
    """Speech-to-text using faster-whisper. Accepts English and Tamil input."""

    def __init__(
        self,
        model_size: str = STT_MODEL_SIZE,
        device: str = STT_DEVICE,
        compute_type: str = STT_COMPUTE_TYPE,
    ) -> None:
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._model: Optional[WhisperModel] = None

    def _ensure_model(self) -> WhisperModel:
        if self._model is None:
            logger.info(
                "Loading Whisper model '%s' on %s (%s)",
                self._model_size,
                self._device,
                self._compute_type,
            )
            self._model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=self._compute_type,
            )
        return self._model

    def _run_segments(self, audio_path: Path):
        # language=None -> Whisper auto-detects the spoken language, then
        # decodes the whole clip using that language's script/vocabulary.
        model = self._ensure_model()
        segments, info = model.transcribe(
            str(audio_path),
            beam_size=5,
            language=None,
            # condition_on_previous_text=True (the default) feeds each
            # segment's own output back in as context for the next one.
            # On short clips with silence/noise this is what produces
            # confident-looking but wrong text (e.g. "how are you" decoded
            # as "I love you") -- the model latches onto a common phrase
            # from its training data instead of admitting uncertainty.
            # Turning it off makes every segment independent.
            condition_on_previous_text=False,
            # Widen the tuning so faint/short speech (a few words) doesn't
            # get chopped or misread as noise, without being so loose that
            # background sound gets treated as speech.
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500, "speech_pad_ms": 300},
            # Disable temperature fallback to prevent huge CPU spikes and delays on confused audio
            temperature=0.0,
            # Prime the model to expect code-switching between Tamil and English
            initial_prompt="This is a conversation in Tamil and English.",
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
        )
        kept = [
            {"start": s.start, "end": s.end, "text": s.text.strip()}
            for s in segments
            if s.no_speech_prob < 0.6 and s.text.strip()
        ]
        return kept, info

    def _run(self, audio_path: Path):
        segments, info = self._run_segments(audio_path)
        text = " ".join(s["text"] for s in segments).strip()
        return text, info

    def _decide(self, text: str, info) -> str:
        logger.info(
            "Transcript: %r | detected language=%s (confidence=%.2f)",
            text,
            info.language,
            info.language_probability,
        )

        if (
            text
            and info.language not in ALLOWED_LANGUAGES
            and info.language_probability >= LANGUAGE_CONFIDENCE_THRESHOLD
        ):
            raise UnsupportedLanguageError(info.language, info.language_probability)

        return text

    def transcribe(self, audio_path: Path) -> str:
        text, info = self._run(audio_path)
        return self._decide(text, info)

    async def transcribe_async(self, audio_path: Path) -> str:
        loop = asyncio.get_event_loop()
        text, info = await loop.run_in_executor(None, self._run, audio_path)
        return self._decide(text, info)

    def transcribe_with_timestamps(self, audio_path: Path) -> list:
        """Like transcribe(), but returns a list of {"start", "end", "text"}
        segments instead of one flat string -- lets a caller (e.g. the video
        pipeline) know 'at 00:02:15 the narrator said X' instead of just
        having the words with no place to anchor them. Same language guard
        as transcribe(): raises UnsupportedLanguageError on confident
        non-English/non-Tamil speech."""
        segments, info = self._run_segments(audio_path)
        full_text = " ".join(s["text"] for s in segments)
        self._decide(full_text, info)
        return segments

    async def transcribe_with_timestamps_async(self, audio_path: Path) -> list:
        loop = asyncio.get_event_loop()
        segments, info = await loop.run_in_executor(None, self._run_segments, audio_path)
        full_text = " ".join(s["text"] for s in segments)
        self._decide(full_text, info)
        return segments

    def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".webm") -> str:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)
        try:
            return self.transcribe(tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

    async def transcribe_bytes_async(self, audio_bytes: bytes, suffix: str = ".webm") -> str:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)
        try:
            return await self.transcribe_async(tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)
