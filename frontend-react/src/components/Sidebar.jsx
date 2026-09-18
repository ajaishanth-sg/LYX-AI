import { useState, useRef, useEffect } from "react";
import { deleteDocument, getDocuments, uploadDocument, getModels } from "../services/api";

const UPLOAD_STATUS_MESSAGES = [
  "Reading document…", "Collecting key details…",
  "Understanding content…", "Splitting into chunks…",
  "Indexing…", "Almost done…",
];
const UPLOAD_STATUS_INTERVAL_MS = 1800;

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
  chatMessages, activeModelId, onSelectModel
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [models, setModels] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMessageIndex, setUploadMessageIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => { 
    refreshDocuments(); 
    refreshModels();
  }, []);
  useEffect(() => {
    if (documents.some((d) => d.status === "processing")) pollDocumentStatus();
  }, [documents.length]);
  useEffect(() => {
    if (uploadStatus !== "uploading") return;
    setUploadMessageIndex(0);
    const id = setInterval(() => setUploadMessageIndex((i) => (i + 1) % UPLOAD_STATUS_MESSAGES.length), UPLOAD_STATUS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [uploadStatus]);

  const refreshDocuments = async () => {
    try { setDocuments((await getDocuments()) || []); } catch (e) { console.error(e); }
  };
  const refreshModels = async () => {
    try { setModels((await getModels()) || []); } catch (e) { console.error(e); }
  };
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setUploadStatus("uploading"); setUploadError("");
    try {
      const r = await uploadDocument(file);
      setDocuments(prev => [...prev, { doc_id: r.doc_id, name: r.name, chunk_count: 0, status: "processing", doc_type: r.doc_type }]);
      setUploadStatus(""); pollDocumentStatus();
    } catch (err) { setUploadStatus("error"); setUploadError(err.message || "Upload failed."); }
  };
  const pollDocumentStatus = async () => {
    const id = setInterval(async () => {
      try {
        const docs = await getDocuments(); setDocuments(docs || []);
        if (docs?.every(d => d.status === "ready" || d.status === "failed")) clearInterval(id);
      } catch (e) { console.error(e); }
    }, 2000);
    setTimeout(() => clearInterval(id), 300000);
  };
  const handleRemoveDocument = async (docId) => {
    try { await deleteDocument(docId); setDocuments(prev => prev.filter(d => d.doc_id !== docId)); } catch (e) { console.error(e); }
  };

  // Merge real chat messages into history
  const liveHistoryItem = chatMessages.length > 0
    ? [{ id: "live", title: chatMessages[0].content.slice(0, 35) + (chatMessages[0].content.length > 35 ? "…" : ""), time: "Now", active: true }]
    : [];
  const allHistory = [...liveHistoryItem];

  return (
    <aside className={`synapse-sidebar ${collapsed ? "synapse-sidebar--collapsed" : ""}`}>
      {/* ── TOP BAR ── */}
      <div className="synapse-sidebar__topbar">
        {!collapsed && (
          <div className="synapse-sidebar__brand">
            <div className="synapse-brand-icon">
              <img src="/logo_transparent.png" alt="Kawaii AI" style={{ width: 24, height: 24, objectFit: "contain" }} />
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

          {/* Folders */}
          <div className="synapse-sidebar__section">
            <div className="synapse-section-header">
              <span className="synapse-section-label">Folder</span>
              <button className="synapse-icon-btn synapse-icon-btn--sm" onClick={onOpenProjects} title="Add folder"><IconPlus /></button>
            </div>

            {(() => {
              const userDocs = documents.filter(d => 
                !d.name.includes("GitHub Sync") && 
                !d.name.includes("Web Scrape") && 
                !d.name.toLowerCase().includes("sync") &&
                !d.name.toLowerCase().includes("scrape")
              );
              return userDocs.map(doc => (
                <div key={doc.doc_id} className="synapse-nav-item synapse-doc-item"
                  onMouseEnter={e => e.currentTarget.classList.add('synapse-nav-item--hovered')}
                  onMouseLeave={e => e.currentTarget.classList.remove('synapse-nav-item--hovered')}
                >
                  <span className="synapse-nav-icon"><IconFolder /></span>
                  <span className="synapse-doc-name">{doc.name}</span>
                  {doc.status === "processing" && <span className="synapse-doc-processing">…</span>}
                  <button className="synapse-doc-remove" onClick={e => { e.stopPropagation(); handleRemoveDocument(doc.doc_id); }}>
                    <IconX />
                  </button>
                </div>
              ));
            })()}
          </div>

          {/* Models (Hidden as they are now in Chat dropdown) */}

          {/* History */}
          <div className="synapse-sidebar__section synapse-sidebar__history">
            <div className="synapse-section-header">
              <span className="synapse-section-label">History</span>
            </div>
            <div className="synapse-history-list">
              {allHistory.map(item => (
                <button key={item.id} className={`synapse-history-item ${item.active ? "synapse-history-item--active" : ""}`}>
                  <span className="synapse-history-title">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload error */}
          {uploadError && <p className="synapse-upload-error">{uploadError}</p>}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.xlsx,.csv,.png,.jpg,.mp4,.mov,.avi,.mkv,.webm" hidden onChange={handleFileSelected} id="global-file-upload" />
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
