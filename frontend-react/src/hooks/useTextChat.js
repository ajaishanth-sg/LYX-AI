import { useCallback, useEffect, useRef, useState } from "react";
import { startConversation, endConversation, sendTextMessageStream, getSessionMessages } from "../services/api";

// Text-mode counterpart to useConversation. Uses the same session lifecycle
// endpoints (start/end) as voice mode — a session is just a persona +
// history container on the backend, agnostic to whether the messages came
// in as audio or text — so Settings (persona) and uploaded documents are
// shared automatically between both modes.
export function useTextChat(activeModelId) {
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", content }]
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Initialize sessionId from localStorage to persist across refreshes
  const initialSessionId = typeof window !== "undefined" ? localStorage.getItem("lyx_active_session_id") : null;
  const [sessionId, setSessionId] = useState(initialSessionId);
  const sessionIdRef = useRef(initialSessionId);

  // Auto-clear error message after 2 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Restore messages on initial load if session exists
  useEffect(() => {
    if (initialSessionId) {
      getSessionMessages(initialSessionId)
        .then((data) => {
          if (data && data.messages) {
            setMessages(data.messages);
          } else {
            // Session not found on backend (maybe deleted)
            localStorage.removeItem("lyx_active_session_id");
            setSessionId(null);
            sessionIdRef.current = null;
          }
        })
        .catch((err) => console.error("Failed to restore session history:", err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const data = await startConversation();
    sessionIdRef.current = data.session_id;
    setSessionId(data.session_id);
    localStorage.setItem("lyx_active_session_id", data.session_id);
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
      let accumulatedText = "";
      let messageSources = null;
      let messageMapData = null;
      let renderScheduled = false;

      const scheduleStateUpdate = () => {
        if (renderScheduled) return;
        renderScheduled = true;
        requestAnimationFrame(() => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            const lastMessage = newMessages[lastIndex];
            if (lastMessage && lastMessage.role === "assistant") {
              newMessages[lastIndex] = { 
                ...lastMessage, 
                content: accumulatedText, 
                sources: messageSources,
                mapData: messageMapData
              };
            }
            return newMessages;
          });
          renderScheduled = false;
        });
      };

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let eventEnd = buffer.indexOf("\n\n");
          while (eventEnd !== -1) {
            const eventBlock = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);
            eventEnd = buffer.indexOf("\n\n");
            
            const lines = eventBlock.split("\n");
            let currentEvent = null;
            let currentData = null;
            
            for (const line of lines) {
              if (line.startsWith("event: ")) currentEvent = line.substring(7);
              else if (line.startsWith("data: ")) currentData = line.substring(6);
            }
            
            if (currentEvent === "sources" && currentData) {
              try { messageSources = JSON.parse(currentData); } catch (e) {}
              scheduleStateUpdate();
            } else if (currentEvent === "map" && currentData) {
              try { messageMapData = JSON.parse(currentData); } catch (e) {}
              scheduleStateUpdate();
            } else if (currentEvent === "content" && currentData) {
              try { accumulatedText += JSON.parse(currentData); } catch (e) {}
              scheduleStateUpdate();
            } else if (currentEvent === "error" && currentData) {
              try { setErrorMessage(JSON.parse(currentData)); } catch (e) {}
            }
          }
        }
        if (done) break;
      }

      // Final state sync flush
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        const lastMessage = newMessages[lastIndex];
        if (lastMessage && lastMessage.role === "assistant") {
          newMessages[lastIndex] = { 
            ...lastMessage, 
            content: accumulatedText, 
            sources: messageSources,
            mapData: messageMapData 
          };
        }
        return newMessages;
      });
      setIsSending(false);
    } catch (err) {
      console.error("Chat message failed:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureSession, isSending, activeModelId]);

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
    localStorage.removeItem("lyx_active_session_id");
  }, []);

  const loadSession = useCallback(async (newSessionId) => {
    if (!newSessionId || newSessionId === "live") return;
    try {
      const data = await getSessionMessages(newSessionId);
      if (data && data.messages) {
        setMessages(data.messages);
        setSessionId(newSessionId);
        sessionIdRef.current = newSessionId;
        localStorage.setItem("lyx_active_session_id", newSessionId);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  return {
    messages,
    isSending,
    errorMessage,
    sessionId,
    sendChatMessage,
    newChatConversation,
    loadSession,
  };
}
