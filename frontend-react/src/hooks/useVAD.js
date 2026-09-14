import { useCallback, useEffect, useRef, useState } from "react";

// Fixed threshold caused the bug where the orb got stuck on "Listening..."
// forever: 0.15 RMS is louder than normal mic speech ever gets once the
// browser's built-in noise suppression/auto-gain kicks in, so isSpeakingRef
// never flipped true and no recording ever started. We now measure the
// room's actual noise floor for a moment at start() and set the threshold
// relative to that instead of guessing a single number for every mic.
const CALIBRATION_DURATION_MS = 400;
const THRESHOLD_MULTIPLIER = 2.5; // how far above ambient noise counts as speech
const MIN_THRESHOLD = 0.015; // floor, for near-silent rooms/mics
const MAX_THRESHOLD = 0.12; // ceiling, so a noisy room doesn't require shouting
const SILENCE_DURATION_MS = 1800; // give a beat of thinking room before cutting off
const MIN_SPEECH_DURATION_MS = 800;
/**
 * Hands-free voice activity detection.
 * Continuously listens to the mic, auto-detects speech start/stop,
 * and calls onSpeechCaptured(audioBlob) when a speech segment ends.
 */
export function useVAD(onSpeechCaptured) {
  const [status, setStatus] = useState("idle"); // idle | listening | speaking | processing
  const [amplitude, setAmplitude] = useState(0);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);

  const speechStartTimeRef = useRef(null);
  const silenceStartTimeRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);
  const isProcessingRef = useRef(false); // flag to prevent new speech detection while agent is speaking
  const speechThresholdRef = useRef(MAX_THRESHOLD); // set for real after calibration

  const stopRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size > 0) {
        setStatus("processing");
        isProcessingRef.current = true; // Mark as processing to prevent new speech detection
        onSpeechCaptured(blob);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [onSpeechCaptured]);

  const monitorLoop = useCallback(() => {
    if (!isActiveRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    // compute RMS amplitude (0 to ~1)
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    setAmplitude(rms);

    const now = Date.now();

    // Skip speech detection if currently processing (agent speaking)
    if (isProcessingRef.current) {
      rafRef.current = requestAnimationFrame(monitorLoop);
      return;
    }

    if (rms > speechThresholdRef.current) {
      // sound detected
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        speechStartTimeRef.current = now;
        setStatus("speaking");
        startRecorder();
      }
      silenceStartTimeRef.current = null;
    } else {
      // silence detected
      if (isSpeakingRef.current) {
        if (silenceStartTimeRef.current === null) {
          silenceStartTimeRef.current = now;
        }
        const silenceDuration = now - silenceStartTimeRef.current;
        const speechDuration = now - speechStartTimeRef.current;

        if (silenceDuration >= SILENCE_DURATION_MS && speechDuration >= MIN_SPEECH_DURATION_MS) {
          isSpeakingRef.current = false;
          silenceStartTimeRef.current = null;
          stopRecorder();
        }
      }
    }

    rafRef.current = requestAnimationFrame(monitorLoop);
  }, [startRecorder, stopRecorder]);

  const calibrateThreshold = useCallback(() => {
    return new Promise((resolve) => {
      const analyser = analyserRef.current;
      if (!analyser) return resolve();

      const data = new Uint8Array(analyser.fftSize);
      const samples = [];
      const calibrationStart = Date.now();

      const sample = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        samples.push(Math.sqrt(sumSquares / data.length));

        if (Date.now() - calibrationStart < CALIBRATION_DURATION_MS) {
          requestAnimationFrame(sample);
        } else {
          const ambient = samples.reduce((a, b) => a + b, 0) / samples.length;
          speechThresholdRef.current = Math.min(
            MAX_THRESHOLD,
            Math.max(MIN_THRESHOLD, ambient * THRESHOLD_MULTIPLIER)
          );
          resolve();
        }
      };
      sample();
    });
  }, []);

  const start = useCallback(async () => {
    if (isActiveRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    isActiveRef.current = true;

    // Brief silent moment (stay quiet) to read the room's actual noise floor
    // before we start deciding what counts as "speech" -- fixes mics/rooms
    // where a fixed threshold was either never triggering or triggering on
    // hiss. Kept under half a second so it's not noticeable as a delay.
    await calibrateThreshold();

    setStatus("listening");
    monitorLoop();
  }, [monitorLoop, calibrateThreshold]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    isSpeakingRef.current = false;
    silenceStartTimeRef.current = null;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopRecorder();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setStatus("idle");
    setAmplitude(0);
  }, [stopRecorder]);

  // resume listening automatically after processing finishes
  const resumeListening = useCallback(() => {
    if (isActiveRef.current) {
      isProcessingRef.current = false; // Clear processing flag to allow new speech detection
      setStatus("listening");
    }
  }, []);

  useEffect(() => {
    return () => stop(); // cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, amplitude, start, stop, resumeListening };
}