import { useState } from "react";
import Sidebar from "./components/Sidebar";
import AudioWaveform from "./components/AudioWaveform";
import LiveCaption from "./components/LiveCaption";
import SettingsPanel from "./components/SettingsPanel";
import AppearanceModal from "./components/AppearanceModal";
import ChatMode from "./components/ChatMode";
import ConnectorsView from "./components/ConnectorsView";
import ProjectsModal from "./components/ProjectsModal";
import { MemoryDashboard } from "./components/MemoryDashboard";
import SystemAgentModal from "./components/SystemAgentModal";
import { useConversation } from "./hooks/useConversation";
import { useTextChat } from "./hooks/useTextChat";
import { Cpu, Brain, Compass, Settings as SettingsIcon, X, Sparkles } from "lucide-react";

const STATUS_TEXT = {
  idle: "Click \"Start Conversation\" to start",
  listening: "Listening… speak naturally",
  speaking: "Recording your voice…",
  processing: "Thinking…",
};

const IconShare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconBookmark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconPalette = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

export default function App() {
  const [mode, setMode] = useState("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [systemAgentOpen, setSystemAgentOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeModelId, setActiveModelId] = useState(() => {
    return localStorage.getItem("lyx_active_model_id") || null;
  });

  const handleSelectModel = (modelId) => {
    setActiveModelId(modelId);
    if (modelId) {
      localStorage.setItem("lyx_active_model_id", modelId);
    }
  };

  const {
    errorMessage, isSessionActive, vadStatus, amplitude,
    audioPlayerRef, captionText, captionRole,
    beginConversation, endCurrentConversation,
    isWakeListening, wakeState,
  } = useConversation({ activeModelId, wakeWordEnabled: mode === "voice" });

  const {
    messages: chatMessages, isSending: isChatSending,
    errorMessage: chatErrorMessage, sendChatMessage, newChatConversation,
  } = useTextChat(activeModelId);

  const handleConnectorData = (data) => {
    const { source, text } = data;
    sendChatMessage(`[SYSTEM NOTE: The following context was scraped from ${source} for you to reference.]\n\n${text}`);
  };

  const handleNewConversation = async () => {
    if (mode === "voice" && isSessionActive) {
      await endCurrentConversation();
    }
    setMode("chat");
    await newChatConversation();
  };

  const handleModeChange = async (nextMode) => {
    if (nextMode === mode) return;
    if (mode === "voice" && isSessionActive) await endCurrentConversation();
    setMode(nextMode);
    if (nextMode === "voice") {
      setTimeout(() => beginConversation(), 100);
    }
  };
  const pageTitle = chatMessages.length > 0
    ? chatMessages[0].content.slice(0, 40) + (chatMessages[0].content.length > 40 ? "…" : "")
    : mode === "voice" ? "Voice Mode" : mode === "connectors" ? "Plugins" : "";

  return (
    <div className="app-shell">
      <Sidebar 
        onNewConversation={handleNewConversation}
        onOpenProjects={() => setProjectsOpen(true)}
        onNavigateConnectors={() => handleModeChange("connectors")}
        onOpenAppearance={() => setAppearanceOpen(true)}
        isSessionActive={mode === "voice" ? isSessionActive : chatMessages.length > 0}
        mode={mode}
        onModeChange={handleModeChange}
        chatMessages={chatMessages}
        activeModelId={activeModelId}
        onSelectModel={handleSelectModel}
      />

      {/* Main content */}
      <main className="app-main">
        {/* Top Header */}
        <header className="app-topbar">
          <div className="app-topbar-left">
            {pageTitle && <span className="topbar-title">{pageTitle}</span>}
          </div>

          <div className="app-topbar-right">
            <button className="topbar-appearance-btn" onClick={() => setAppearanceOpen(true)}>
              <IconPalette />
              <span>Appearance</span>
            </button>
            <button className="topbar-icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}><IconSettings /></button>
            <button className="topbar-icon-btn" title="Share"><IconShare /></button>
          </div>
        </header>

        {/* Content */}
        {mode === "voice" ? (
          <div className="voice-stage-wrapper" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "24px", minHeight: "calc(100vh - 60px)" }}>
            
            {/* RIGHT SIDE FLOATING FEATURE ACTION TOOLBAR */}
            <aside 
              style={{
                position: "absolute",
                right: "24px",
                top: "30%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                zIndex: 100,
              }}
            >
              {/* 1. System Agent Control & Live Execution Icon */}
              <button 
                onClick={() => setSystemAgentOpen(true)}
                title="System Agent Control & Real-time Execution"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: systemAgentOpen ? "rgba(2, 132, 199, 0.25)" : "var(--bg-secondary, rgba(255,255,255,0.08))",
                  border: systemAgentOpen ? "1px solid rgba(2, 132, 199, 0.6)" : "1px solid var(--border, rgba(255,255,255,0.12))",
                  color: systemAgentOpen ? "#38bdf8" : "var(--text-primary, #ffffff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  boxShadow: systemAgentOpen ? "0 0 15px rgba(56, 189, 248, 0.4)" : "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                }}
              >
                <Cpu size={20} />
              </button>

              {/* 2. Memory & Recollections Core Icon */}
              <button 
                onClick={() => setMemoryOpen(true)}
                title="Memory Core & Recollections"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary, rgba(255,255,255,0.08))",
                  border: "1px solid var(--border, rgba(255,255,255,0.12))",
                  color: "var(--text-primary, #ffffff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                }}
              >
                <Brain size={20} />
              </button>

              {/* 3. Topics & Voice Prompt Suggestions Icon */}
              <button 
                onClick={() => setGuideOpen(!guideOpen)}
                title="Voice Prompts & Topics Guide"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: guideOpen ? "rgba(168, 85, 247, 0.25)" : "var(--bg-secondary, rgba(255,255,255,0.08))",
                  border: guideOpen ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid var(--border, rgba(255,255,255,0.12))",
                  color: guideOpen ? "#c084fc" : "var(--text-primary, #ffffff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                }}
              >
                <Compass size={20} />
              </button>

              {/* 4. Settings Icon */}
              <button 
                onClick={() => setSettingsOpen(true)}
                title="Voice & Model Configuration"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary, rgba(255,255,255,0.08))",
                  border: "1px solid var(--border, rgba(255,255,255,0.12))",
                  color: "var(--text-primary, #ffffff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                }}
              >
                <SettingsIcon size={20} />
              </button>
            </aside>



            {/* TOPICS & VOICE PROMPT SUGGESTIONS POPUP CARD */}
            {guideOpen && (
              <div 
                style={{
                  position: "absolute",
                  right: "80px",
                  top: "30%",
                  transform: "translateY(-50%)",
                  width: "300px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "var(--bg-secondary, #1e293b)",
                  border: "1px solid var(--border, rgba(255,255,255,0.15))",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                  zIndex: 101,
                  backdropFilter: "blur(16px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifySpace: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#c084fc", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Compass size={14} /> Voice Prompts & Topics
                  </span>
                  <button onClick={() => setGuideOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={14} /></button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#e2e8f0" }}>
                  <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    ⚡ &ldquo;Summarize my active connectors data&rdquo;
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    ⚡ &ldquo;Explain quantum computing in simple terms&rdquo;
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    ⚡ &ldquo;Act like a mock coding interviewer&rdquo;
                  </div>
                </div>
              </div>
            )}

            {/* STAGE HEADER */}
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <h1 className="voice-stage-title" style={{ fontSize: "24px", fontWeight: "600", letterSpacing: "0.05em" }}>Kawaii — Hands-Free Voice Agent</h1>
              {!isSessionActive && isWakeListening && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "8px 0", padding: "4px 12px", borderRadius: "999px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: "12px", fontWeight: "500" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                  <span>Hands-free active — Say &ldquo;Hey Kawaii&rdquo; to start</span>
                </div>
              )}
            </div>

            {/* WAVEFORM */}
            <AudioWaveform status={isSessionActive ? vadStatus : "idle"} amplitude={amplitude} />

            {/* CONTROLS */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              {errorMessage && <p className="voice-stage-error" style={{ color: "#ef4444", fontSize: "13px" }}>{errorMessage}</p>}
              
              {isSessionActive ? (
                <button 
                  className="voice-start-btn" 
                  style={{ background: "#ef4444", boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)", cursor: "pointer" }}
                  onClick={() => endCurrentConversation()}
                >
                  End Conversation
                </button>
              ) : (
                <button 
                  className="voice-start-btn" 
                  style={{ cursor: "pointer" }}
                  onClick={() => beginConversation()}
                >
                  Start Conversation
                </button>
              )}

              <LiveCaption text={captionText} role={captionRole} />
            </div>

            <audio ref={audioPlayerRef} hidden />
          </div>
        ) : mode === "connectors" ? (
          <ConnectorsView onConnectorData={handleConnectorData} />
        ) : (
          <ChatMode
            messages={chatMessages}
            isSending={isChatSending}
            errorMessage={chatErrorMessage}
            onSend={sendChatMessage}
            onVoiceMode={() => handleModeChange("voice")}
            activeModelId={activeModelId}
            onSelectModel={handleSelectModel}
          />
        )}
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AppearanceModal isOpen={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <ProjectsModal isOpen={projectsOpen} onClose={() => setProjectsOpen(false)} />
      <MemoryDashboard isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <SystemAgentModal isOpen={systemAgentOpen} onClose={() => setSystemAgentOpen(false)} />
    </div>
  );
}
