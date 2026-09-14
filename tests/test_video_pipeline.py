"""
Unit tests for the parts of the video-ingestion feature that don't require
ffmpeg, a real video file, or the faster-whisper/Groq models to be installed:
frame-sampling math, timestamp formatting, and window-bucketing. The ffmpeg/
ffprobe-calling functions (probe_duration_seconds, extract_audio,
sample_frames) are integration-tested manually against a real file per the
README, since mocking subprocess for them adds more risk of masking a real
bug than it removes.

Run with: pytest tests/test_video_pipeline.py -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.video_service import _fixed_interval_timestamps
from app.routes.documents import _format_timestamp


class TestFixedIntervalTimestamps:
    def test_respects_max_frames_cap(self):
        # A long video sampled at the default interval would blow way past
        # the cap; the cap must always win.
        timestamps = _fixed_interval_timestamps(duration=7200, max_frames=30)
        assert len(timestamps) <= 30

    def test_short_video_still_gets_at_least_one_frame(self):
        timestamps = _fixed_interval_timestamps(duration=3, max_frames=30)
        assert timestamps == [0.0]

    def test_zero_duration_returns_single_frame(self):
        assert _fixed_interval_timestamps(duration=0, max_frames=30) == [0.0]

    def test_timestamps_are_within_duration(self):
        duration = 600
        timestamps = _fixed_interval_timestamps(duration=duration, max_frames=30)
        assert all(0 <= t < duration for t in timestamps)

    def test_timestamps_are_evenly_spaced(self):
        timestamps = _fixed_interval_timestamps(duration=300, max_frames=10)
        gaps = [b - a for a, b in zip(timestamps, timestamps[1:])]
        # All gaps should be (approximately) equal -- even spacing, not front-loaded.
        assert max(gaps) - min(gaps) < 1e-6


class TestFormatTimestamp:
    def test_zero(self):
        assert _format_timestamp(0) == "00:00:00"

    def test_seconds_only(self):
        assert _format_timestamp(45) == "00:00:45"

    def test_minutes_and_seconds(self):
        assert _format_timestamp(135) == "00:02:15"

    def test_hours(self):
        assert _format_timestamp(3661) == "01:01:01"

    def test_negative_clamped_to_zero(self):
        assert _format_timestamp(-5) == "00:00:00"

    def test_rounds_fractional_seconds(self):
        assert _format_timestamp(59.6) == "00:01:00"


class TestWindowBucketing:
    """Mirrors the segment-to-window bucketing logic inside
    process_video_background() -- a segment belongs to a window if it
    overlaps that window's [start, end) range at all."""

    @staticmethod
    def _bucket(segments, w_start, w_end):
        return " ".join(
            s["text"] for s in segments if s["start"] < w_end and s["end"] > w_start
        ).strip()

    def test_segment_fully_inside_window(self):
        segments = [{"start": 5.0, "end": 10.0, "text": "hello"}]
        assert self._bucket(segments, 0, 30) == "hello"

    def test_segment_spanning_window_boundary_appears_in_both(self):
        # A segment that starts before a window ends and ends after the next
        # window starts should show up in both -- better to duplicate a few
        # words at a boundary than to silently drop them from every window.
        segments = [{"start": 28.0, "end": 33.0, "text": "boundary word"}]
        assert self._bucket(segments, 0, 30) == "boundary word"
        assert self._bucket(segments, 30, 60) == "boundary word"

    def test_segment_outside_window_excluded(self):
        segments = [{"start": 100.0, "end": 105.0, "text": "later"}]
        assert self._bucket(segments, 0, 30) == ""

    def test_multiple_segments_join_in_order(self):
        segments = [
            {"start": 1.0, "end": 2.0, "text": "one"},
            {"start": 3.0, "end": 4.0, "text": "two"},
        ]
        assert self._bucket(segments, 0, 30) == "one two"
