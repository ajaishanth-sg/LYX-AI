import asyncio
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from app.config import (
    FFMPEG_CMD,
    FFPROBE_CMD,
    MAX_VIDEO_FRAMES,
    VIDEO_FRAME_INTERVAL_SECONDS,
)

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".mkv", ".webm")


class VideoProcessingError(Exception):
    """Raised when ffmpeg/ffprobe fail, are missing, or return something
    unusable. Caught by the background task in routes/documents.py the same
    way a bad PDF/image is -- it marks the document failed rather than
    crashing the whole background-task loop."""


@dataclass
class FrameSample:
    timestamp: float  # seconds into the video
    path: Path


def _run(cmd: List[str], timeout: int = 30) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, check=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise VideoProcessingError(
            f"'{cmd[0]}' was not found on this server. Install ffmpeg (which "
            f"includes ffprobe), or set the FFMPEG_CMD/FFPROBE_CMD env vars to "
            f"the full binary path -- same PATH-setup gotcha as pinning "
            f"Tesseract's path on Windows."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise VideoProcessingError(f"{cmd[0]} timed out after {timeout}s (possibly a corrupt file)") from exc
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore") if exc.stderr else ""
        raise VideoProcessingError(f"{cmd[0]} failed: {stderr[-500:].strip()}") from exc


def probe_duration_seconds(video_path: Path) -> float:
    """Returns the video's duration in seconds via ffprobe. Used to decide
    whether the upload exceeds MAX_VIDEO_DURATION_SECONDS and to size the
    incremental-indexing progress bar (processed_pages/total_pages, repurposed
    as processed/total seconds)."""
    result = _run(
        [
            FFPROBE_CMD, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ]
    )
    output = result.stdout.decode("utf-8", errors="ignore").strip()
    try:
        return float(output)
    except ValueError as exc:
        raise VideoProcessingError(
            f"Could not read video duration from ffprobe output: {output!r}"
        ) from exc


def extract_audio(video_path: Path, out_wav_path: Path, timeout: int = 1800) -> bool:
    """Extracts the audio track as mono 16kHz PCM WAV (the format faster-whisper
    wants). Returns False -- rather than raising -- if the video simply has no
    audio stream at all (e.g. a silent screen recording), so callers can skip
    transcription gracefully instead of treating it as an error, mirroring how
    the PDF extractor already handles scanned/image-only PDFs. `timeout` is a
    hard ceiling (default 30 min) so a corrupt/hostile file can't hang the
    background task forever."""
    try:
        result = subprocess.run(
            [
                FFMPEG_CMD, "-y", "-i", str(video_path),
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                str(out_wav_path),
            ],
            capture_output=True,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise VideoProcessingError(f"'{FFMPEG_CMD}' was not found on this server.") from exc
    except subprocess.TimeoutExpired as exc:
        raise VideoProcessingError(f"Audio extraction timed out after {timeout}s") from exc

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="ignore")
        if "does not contain any stream" in stderr or "Output file #0 does not contain any stream" in stderr:
            logger.info("Video %s has no audio track; skipping transcription.", video_path.name)
            return False
        raise VideoProcessingError(f"ffmpeg audio extraction failed: {stderr[-500:].strip()}")
    return out_wav_path.exists() and out_wav_path.stat().st_size > 0


def _scene_change_timestamps(video_path: Path, max_frames: int) -> Optional[List[float]]:
    """Uses PySceneDetect's content-based detector to find timestamps where the
    visual content actually changes, so sampling doesn't waste vision-model
    calls on dozens of near-identical frames of someone talking. Returns None
    (never raises) if PySceneDetect isn't installed or detection finds
    nothing usable, so the caller can fall back to fixed-interval sampling
    instead of failing the whole upload over an optional dependency."""
    try:
        from scenedetect import SceneManager, open_video
        from scenedetect.detectors import ContentDetector
    except ImportError:
        logger.info("PySceneDetect not installed; falling back to fixed-interval frame sampling.")
        return None

    try:
        video = open_video(str(video_path))
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector())
        scene_manager.detect_scenes(video)
        scene_list = scene_manager.get_scene_list()
    except Exception as exc:
        logger.warning("Scene-change detection failed (%s); falling back to fixed-interval sampling.", exc)
        return None

    if not scene_list:
        return None

    timestamps = [start.get_seconds() for start, _end in scene_list]

    if len(timestamps) > max_frames:
        # Too many scene changes (fast-cut footage) -- space evenly across the
        # detected scenes rather than the raw timeline, so we still capture
        # meaningfully distinct moments instead of just the first max_frames cuts.
        step = len(timestamps) / max_frames
        timestamps = [timestamps[int(i * step)] for i in range(max_frames)]

    return timestamps


def _fixed_interval_timestamps(duration: float, max_frames: int) -> List[float]:
    """Evenly spaced timestamps, capped at max_frames regardless of length --
    a 3-hour video still only gets `max_frames` samples, spread across it,
    rather than one every VIDEO_FRAME_INTERVAL_SECONDS blowing past the cap."""
    if duration <= 0:
        return [0.0]
    interval = max(VIDEO_FRAME_INTERVAL_SECONDS, duration / max_frames)
    timestamps = []
    t = 0.0
    while t < duration and len(timestamps) < max_frames:
        timestamps.append(t)
        t += interval
    return timestamps or [0.0]


def sample_frames(
    video_path: Path,
    output_dir: Path,
    duration: float,
    max_frames: int = MAX_VIDEO_FRAMES,
) -> List[FrameSample]:
    """Picks up to `max_frames` timestamps (scene-change detection preferred,
    even spacing as a fallback) and extracts one JPEG per timestamp via ffmpeg."""
    timestamps = _scene_change_timestamps(video_path, max_frames)
    if timestamps is None:
        timestamps = _fixed_interval_timestamps(duration, max_frames)

    output_dir.mkdir(parents=True, exist_ok=True)
    samples: List[FrameSample] = []
    for i, ts in enumerate(timestamps):
        frame_path = output_dir / f"frame_{i:04d}.jpg"
        try:
            result = subprocess.run(
                [
                    FFMPEG_CMD, "-y", "-ss", f"{ts:.3f}", "-i", str(video_path),
                    "-frames:v", "1", "-q:v", "2", str(frame_path),
                ],
                capture_output=True,
                timeout=30,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            logger.warning("Failed to extract frame at %.2fs from %s: %s", ts, video_path.name, exc)
            continue
        if result.returncode == 0 and frame_path.exists() and frame_path.stat().st_size > 0:
            samples.append(FrameSample(timestamp=ts, path=frame_path))
        else:
            logger.warning("Failed to extract frame at %.2fs from %s", ts, video_path.name)
    return samples


async def probe_duration_seconds_async(video_path: Path) -> float:
    return await asyncio.to_thread(probe_duration_seconds, video_path)


async def extract_audio_async(video_path: Path, out_wav_path: Path) -> bool:
    return await asyncio.to_thread(extract_audio, video_path, out_wav_path)


async def sample_frames_async(
    video_path: Path,
    output_dir: Path,
    duration: float,
    max_frames: int = MAX_VIDEO_FRAMES,
) -> List[FrameSample]:
    return await asyncio.to_thread(sample_frames, video_path, output_dir, duration, max_frames)


def check_ffmpeg_available() -> bool:
    """Cheap startup check: are ffmpeg and ffprobe actually runnable with the
    configured FFMPEG_CMD/FFPROBE_CMD? Doesn't touch any video file -- just
    confirms the binaries exist, the same spirit as preloading the Whisper/
    embedding models at startup instead of discovering a missing dependency
    on someone's first upload."""
    for cmd in (FFMPEG_CMD, FFPROBE_CMD):
        try:
            subprocess.run([cmd, "-version"], capture_output=True, timeout=10, check=True)
        except Exception:
            return False
    return True


async def check_ffmpeg_available_async() -> bool:
    return await asyncio.to_thread(check_ffmpeg_available)
