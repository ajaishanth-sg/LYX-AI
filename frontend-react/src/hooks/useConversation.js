import { useCallback, useEffect, useRef, useState } from "react";
import { useVAD } from "./useVAD";
import { useLiveTranscript } from "./useLiveTranscript";
import { sendMessage, startConversation, endConversation, API_BASE } from "../services/api";

import { useWakeWord } from "./useWakeWord";

export function useConversation({ activeModelId = null, wakeWordEnabled = true } = {}) {
  const [sessionId, setSessionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionRole, setCaptionRole] = useState(null); // "user" | "assistant" | null

  // Auto-clear error message after 2 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const audioPlayerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const fullResponseWordsRef = useRef([]);
  const liveTranscript = useLiveTranscript();
  const isAiSpeakingRef = useRef(false);

  const handleSpeechCaptured = useCallback(async (audioBlob) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      setErrorMessage("No active session. Please restart the conversation.");
      return;
    }

    liveTranscript.clear();
    setCaptionText("");
    setCaptionRole(null);

    try {
      const data = await sendMessage(currentSessionId, audioBlob, activeModelId);
      setCaptionText(data.transcribed_text);
      setCaptionRole("user");
      await new Promise((resolve) => setTimeout(resolve, 600));

      fullResponseWordsRef.current = data.response_text ? data.response_text.split(" ") : [];
      setCaptionRole("assistant");

      if (data.response_audio_base64 || data.response_audio_url) {
        setCaptionText("");
        isAiSpeakingRef.current = true;
        vad.pauseListening();
        setErrorMessage(null);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = data.response_audio_base64
            ? data.response_audio_base64
            : `${API_BASE}${data.response_audio_url}`;
          audioPlayerRef.current.play().catch((e) => console.warn("Autoplay blocked:", e));
        }
      } else {
        setCaptionText(data.response_text);
        isAiSpeakingRef.current = false;
        setErrorMessage(data.audio_error || null);

        const wordCount = fullResponseWordsRef.current.length;
        const readingDelayMs = Math.max(1500, wordCount * 300);
        setTimeout(() => {
          setCaptionText("");
          setCaptionRole(null);
          vad.resumeListening();
        }, readingDelayMs);
      }
    } catch (err) {
      const isNoSpeech = err.message?.includes("Could not detect speech");
      if (!isNoSpeech) {
        console.error("Message send failed:", err);
        setErrorMessage(err.message || "Something went wrong. Please try again.");
      }
      vad.resumeListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModelId]);

  const vad = useVAD(handleSpeechCaptured);

  useEffect(() => {
    if (vad.status === "speaking" || vad.status === "listening") {
      if (liveTranscript.liveText) {
        setCaptionText(liveTranscript.liveText);
        setCaptionRole("user");
      }
    }
  }, [liveTranscript.liveText, vad.status]);

  useEffect(() => { 
    const player = audioPlayerRef.current;
    if (!player) return;

    const handleEnded = () => {
      setCaptionText("");
      setCaptionRole(null);
      isAiSpeakingRef.current = false;
      vad.resumeListening();
    };
    player.addEventListener("ended", handleEnded);
    return () => player.removeEventListener("ended", handleEnded);
  }, [vad]);

  useEffect(() => {
    const player = audioPlayerRef.current;
    if (!player) return;
  
    const handleTimeUpdate = () => {
      if (captionRole !== "assistant" || !player.duration || fullResponseWordsRef.current.length === 0) return;
      const progress = Math.min(player.currentTime / player.duration, 1);
      const wordCount = Math.max(1, Math.ceil(progress * fullResponseWordsRef.current.length));
      setCaptionText(fullResponseWordsRef.current.slice(0, wordCount).join(" "));
    };
  
    player.addEventListener("timeupdate", handleTimeUpdate);
    return () => player.removeEventListener("timeupdate", handleTimeUpdate);
  }, [captionRole]);

  // Interruption detection: stop AI when user speaks or says stop words
  useEffect(() => {
    if (!isAiSpeakingRef.current || !liveTranscript.liveText) return;

    const interruptionWords = ["stop", "wait", "wait a minute", "hold on", "shut up", "quiet", "pause"];
    const lowerText = liveTranscript.liveText.toLowerCase().trim();
    
    const isExplicitStop = interruptionWords.some(word => lowerText.includes(word));
    const isLongSpeech = lowerText.length > 18 && lowerText.split(" ").length >= 4;
    const isInterruption = isExplicitStop || isLongSpeech;
    
    if (isInterruption && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      isAiSpeakingRef.current = false;
      setCaptionText("");
      setCaptionRole(null);
      vad.resumeListening();
      liveTranscript.clear();
    }
  }, [liveTranscript.liveText, vad]);

  const beginConversation = useCallback(async () => {
    try {
      const data = await startConversation();
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      setIsSessionActive(true);
      setCaptionText("");
      setCaptionRole(null);
      setErrorMessage(null);
      await vad.start();
      liveTranscript.start();
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setErrorMessage("Could not start conversation. Check microphone permissions.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endCurrentConversation = useCallback(async () => {
    vad.stop();
    liveTranscript.stop();
    setIsSessionActive(false);
    setCaptionText("");
    setCaptionRole(null);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.src = "";
    }
    isAiSpeakingRef.current = false;

    if (sessionIdRef.current) {
      try {
        await endConversation(sessionIdRef.current);
      } catch (err) {
        console.error("Failed to end session cleanly:", err);
      }
    }
    sessionIdRef.current = null;
    setSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hands-free Wake Word Detection ("hey kawaii" / "Hey Assistant")
  const wakeWord = useWakeWord({
    enabled: wakeWordEnabled && !isSessionActive,
    phrase: "hey kawaii",
    onWake: beginConversation,
    isSessionActive,
  });

  return {
    sessionId,
    errorMessage,
    isSessionActive,
    vadStatus: vad.status,
    amplitude: vad.amplitude,
    audioPlayerRef,
    captionText,
    captionRole,
    beginConversation,
    endCurrentConversation,
    isWakeListening: wakeWord.isWakeListening,
    wakeState: wakeWord.wakeState,
  };
}