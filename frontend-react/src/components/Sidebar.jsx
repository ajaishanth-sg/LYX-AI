import React, { useState, useEffect } from "react";
import { getModels, getConversationHistory } from "../services/api";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconHome = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconExplore = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconSidebar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);
const IconFolder = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconGift = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
    <line x1="12" y1="22" x2="12" y2="7"/>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function Sidebar({
  onNewConversation, onOpenSettings, onNavigateConnectors, onOpenProjects, onOpenAppearance,
  chatMessages, activeModelId, onSelectModel, onSelectHistory
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [models, setModels] = useState([]);
  const [pastHistory, setPastHistory] = useState([]);

  useEffect(() => { 
    refreshModels();
  }, []);
  
  // Refresh history when the chat clears (e.g. after clicking "New Chat") or on mount
  useEffect(() => {
    if (chatMessages.length === 0) {
      refreshHistory();
    }
  }, [chatMessages.length]);

  const refreshHistory = async () => {
    try {
      const data = await getConversationHistory();
      setPastHistory(data.conversations || []);
    } catch (e) { console.error("Failed to load history:", e); }
  };

  const refreshModels = async () => {
    try { setModels((await getModels()) || []); } catch (e) { console.error(e); }
  };

  // Merge real chat messages into history
  const liveHistoryItem = chatMessages.length > 0
    ? [{ id: "live", title: chatMessages[0].content.slice(0, 35) + (chatMessages[0].content.length > 35 ? "…" : ""), time: "Now", active: true }]
    : [];
    
  const pastHistoryItems = pastHistory.map(conv => {
    const firstMsg = conv.messages.find(m => m.role === "user")?.content || "Empty chat";
    return {
      id: conv.session_id,
      title: firstMsg.slice(0, 35) + (firstMsg.length > 35 ? "…" : ""),
      time: new Date(conv.started_at).toLocaleDateString(),
      active: false
    };
  });
  
  const allHistory = [...liveHistoryItem, ...pastHistoryItems];

  return (
    <aside className={`synapse-sidebar ${collapsed ? "synapse-sidebar--collapsed" : ""}`}>
      {/* ── TOP BAR ── */}
      <div className="synapse-sidebar__topbar">
        {!collapsed && (
          <div className="synapse-sidebar__brand">
            <div className="synapse-brand-icon">
              <img src="/logo.png" alt="Kawaii AI" />
            </div>
            <span className="synapse-brand-name">Kawaii AI</span>
          </div>
        )}
        <div className="synapse-sidebar__topbar-actions">
          <button className="synapse-icon-btn" onClick={onNewConversation} title="New Chat">
            <IconEdit />
          </button>
          <button className="synapse-icon-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand" : "Collapse"}>
            <IconSidebar />
          </button>
        </div>
      </div>

      {collapsed ? (
        /* Collapsed state — only icon buttons */
        <div className="synapse-sidebar__collapsed-nav">
          <button className="synapse-icon-btn synapse-icon-btn--lg" onClick={onNewConversation} title="New Chat"><IconEdit /></button>
          <button className="synapse-icon-btn synapse-icon-btn--lg" title="Home"><IconHome /></button>
          <button className="synapse-icon-btn synapse-icon-btn--lg" onClick={onNavigateConnectors} title="Plugins"><IconExplore /></button>
          <button className="synapse-icon-btn synapse-icon-btn--lg" onClick={onOpenSettings} title="Settings"><IconSettings /></button>
        </div>
      ) : (
        /* Expanded state */
        <>
          {/* Primary Nav */}
          <div className="synapse-sidebar__section">
            <button className="synapse-nav-item" onClick={onNewConversation}>
              <span className="synapse-nav-icon"><IconHome /></span>
              <span>Home</span>
            </button>
            <button className="synapse-nav-item" onClick={onNavigateConnectors}>
              <span className="synapse-nav-icon"><IconExplore /></span>
              <span>Plugins</span>
            </button>
          </div>



          {/* Models (Hidden as they are now in Chat dropdown) */}

          {/* History */}
          <div className="synapse-sidebar__section synapse-sidebar__history">
            <div className="synapse-section-header">
              <span className="synapse-section-label">History</span>
            </div>
            <div className="synapse-history-list">
              {allHistory.map(item => (
                <button key={item.id} className={`synapse-history-item ${item.active ? "synapse-history-item--active" : ""}`} onClick={() => onSelectHistory && onSelectHistory(item.id)}>
                  <span className="synapse-history-title">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload error */}
        </>
      )}

      {/* ── FOOTER ── */}
      <div className="synapse-sidebar__footer">

        <button className="synapse-user-row" onClick={onOpenSettings}>
          <div className="synapse-user-avatar">
            <span>MI</span>
          </div>
          {!collapsed && (
            <>
              <div className="synapse-user-info">
                <span className="synapse-user-name">Kawaii User</span>
                <span className="synapse-user-plan">Free Plan</span>
              </div>
              <IconChevron />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
