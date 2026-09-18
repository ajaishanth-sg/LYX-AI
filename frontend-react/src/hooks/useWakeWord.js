import { useEffect, useRef, useState, useCallback } from "react";

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function playWakeChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [
      { f: 587.33, t: 0 },    // D5
      { f: 880, t: 0.12 },    // A5
    ];
    notes.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) {
    /* Audio chime best-effort */
  }
}

export function useWakeWord({
  enabled = true,
  phrase = "hey kawaii",
  onWake = () => {},
  isSessionActive = false,
}) {
  const [isListening, setIsListening] = useState(false);
  const [wakeState, setWakeState] = useState("stopped"); // "stopped" | "listening" | "triggered" | "error"
  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const lastTriggerRef = useRef(0);
  const onWakeRef = useRef(onWake);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  const cleanUp = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor || !enabled || isSessionActive) {
      cleanUp();
      setWakeState(enabled ? "stopped" : "disabled");
      return;
    }

    let isIntended = true;

    const startListening = () => {
      if (!isIntended) return;
      cleanUp();

      try {
        const rec = new SpeechCtor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.maxAlternatives = 3;

        rec.onstart = () => {
          setIsListening(true);
          setWakeState("listening");
        };

        rec.onresult = (e) => {
          const target = phrase.toLowerCase().trim();
          
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (!res) continue;
            for (let j = 0; j < res.length; j++) {
              const transcript = (res[j]?.transcript || "").toLowerCase();
              
              // Check explicit phrase or key word matches (e.g. "hey kawaii", "kawaii", "hey assistant")
              const matched = transcript.includes(target) || 
                              transcript.includes("hey kawaii") ||
                              transcript.includes("hey assistant") ||
                              transcript.includes("hey lix") ||
                              transcript.includes("kawaii");
                              
              if (matched) {
                const now = Date.now();
                if (now - lastTriggerRef.current > 3000) {
                  lastTriggerRef.current = now;
                  playWakeChime();
                  setWakeState("triggered");
                  cleanUp();
                  onWakeRef.current();
                  return;
                }
              }
            }
          }
        };

        let lastError = null;

        rec.onerror = (e) => {
          const err = e?.error;
          lastError = err;
          if (err === "not-allowed" || err === "service-not-allowed") {
            isIntended = false;
            setWakeState("disabled");
            return;
          }
          if (err !== "no-speech" && err !== "aborted" && err !== "network") {
            setWakeState("error");
          }
        };

        rec.onend = () => {
          setIsListening(false);
          if (isIntended && enabled && !isSessionActive) {
            const delay = lastError === "network" ? 5000 : lastError === "no-speech" ? 1200 : 1000;
            restartTimerRef.current = setTimeout(startListening, delay);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn("Wake word recognition start failed:", err);
        setWakeState("error");
        if (isIntended) {
          restartTimerRef.current = setTimeout(startListening, 1500);
        }
      }
    };

    startListening();

    return () => {
      isIntended = false;
      cleanUp();
    };
  }, [enabled, phrase, isSessionActive, cleanUp]);

  return {
    isWakeListening: isListening,
    wakeState,
    isSupported: !!getSpeechRecognitionCtor(),
  };
}
