import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useLiveTranscript() {
  const [liveText, setLiveText] = useState("");
  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }
    if (isActiveRef.current) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Live captions shown while the user is speaking (cosmetic only — the
    // actual transcript used for the answer comes from the backend's
    // faster-whisper STT, which understands both Tamil and English).
    // The browser's native SpeechRecognition API only accepts one language
    // per session, so this is set to Tamil since that's the app's primary
    // language; English speech will still usually show up reasonably.
    recognition.lang = "ta-IN";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        interim += event.results[i][0].transcript;
      }
      setLiveText(interim);
    };

    let hasFatalError = false;

    recognition.onerror = (e) => {
      if (e.error === "network") {
        hasNetworkError = true;
      }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        hasFatalError = true;
        isActiveRef.current = false;
      }
      if (e.error !== "no-speech" && e.error !== "aborted" && e.error !== "network") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // browser auto-stops after a pause; restart if we're still supposed to be listening
      if (isActiveRef.current && !hasFatalError) {
        const delay = hasNetworkError ? 5000 : 800;
        setTimeout(() => {
          if (!isActiveRef.current || hasFatalError) return;
          try {
            recognition.start();
          } catch (err) {
            // ignore race condition
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    isActiveRef.current = true;
    try {
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
    }
  }, []);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setLiveText("");
  }, []);

  const clear = useCallback(() => setLiveText(""), []);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { liveText, start, stop, clear };
}