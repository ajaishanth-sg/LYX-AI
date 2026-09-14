import { useCallback, useEffect, useRef, useState } from "react";
import { startConversation, endConversation, sendTextMessageStream } from "../services/api";

// Text-mode counterpart to useConversation. Uses the same session lifecycle
// endpoints (start/end) as voice mode — a session is just a persona +
// history container on the backend, agnostic to whether the messages came
// in as audio or text — so Settings (persona) and uploaded documents are
// shared automatically between both modes.
export function useTextChat(activeModelId) {
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", content }]
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);

  // Auto-clear error message after 2 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const data = await startConversation();
    sessionIdRef.current = data.session_id;
    setSessionId(data.session_id);
    return data.session_id;
  }, []);

  const sendChatMessage = useCallback(async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || isSending) return;

    setErrorMessage(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsSending(true);

    try {
      const sid = await ensureSession();
      const stream = await sendTextMessageStream(sid, trimmed, activeModelId);
      
      // Append an empty assistant message first
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            const lastMessage = newMessages[lastIndex];
            if (lastMessage && lastMessage.role === "assistant") {
              newMessages[lastIndex] = { ...lastMessage, content: lastMessage.content + chunkText };
            }
            return newMessages;
          });
        }
      }
      setIsSending(false);
    } catch (err) {
      console.error("Chat message failed:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureSession, isSending]);

  const newChatConversation = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        await endConversation(sessionIdRef.current);
      } catch (err) {
        console.error("Failed to end chat session cleanly:", err);
      }
    }
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setErrorMessage(null);
  }, []);

  return {
    messages,
    isSending,
    errorMessage,
    sessionId,
    sendChatMessage,
    newChatConversation,
  };
}
