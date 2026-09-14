import { useState, useEffect } from "react";
import { Globe, FileText, RefreshCw, CheckCircle2, Clock, Trash2, ShieldCheck, Layers, Settings2 } from "lucide-react";
import { executeConnector, syncConnector, getDocuments } from "../services/api";

const IconNotion = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.413-.84c.326-.046.28-.28.186-.42L16.892 1.2c-.373-.466-.933-.653-1.82-.606L3.992 1.48c-.653.047-.933.373-.653.84zm.84 3.033v14.467c0 .886.42 1.353 1.306 1.26l12.72-.887c.886-.047 1.12-.653 1.12-1.447V6.026c0-.653-.28-.98-.84-.933L5.865 6.26c-.373.047-.566.327-.566.981zm11.366 1.306c.093.42.047.84-.373.886l-.793.094v10.313c-.606.326-1.166.513-1.68.513-.746 0-1.026-.233-1.633-1.026l-4.433-6.906v6.58c.653.14 1.026.326 1.026.793 0 .42-.326.466-1.073.513l-2.006.14c-.094-.42.093-.84.513-.886l.793-.094V9.827c-.653-.14-.98-.327-.98-.747 0-.42.373-.513 1.12-.56l2.333-.186c.746-.047 1.12.186 1.633.886l4.247 6.673V9.733c-.606-.14-.933-.326-.933-.746 0-.42.373-.466 1.026-.513z"/>
  </svg>
);
const IconConfluence = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.986 21.054a1.765 1.765 0 0 0 1.246.52c.454 0 .907-.174 1.246-.52l6.708-6.709-6.708-6.708a1.762 1.762 0 0 0-2.492 0 1.762 1.762 0 0 0 0 2.492l4.216 4.216-4.216 4.217a1.762 1.762 0 0 0 0 2.492zm20.028-11.417L15.306 2.928a1.762 1.762 0 0 0-2.492 0 1.762 1.762 0 0 0 0 2.492l4.216 4.217-4.216 4.216a1.762 1.762 0 0 0 0 2.492 1.758 1.758 0 0 0 1.246.52c.454 0 .907-.174 1.246-.52l6.708-6.708a1.762 1.762 0 0 0 0-2.493z"/>
  </svg>
);
const IconCoda = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <path fill="#fff" d="M7 8h10v2H7V8zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
  </svg>
);
const IconSharepoint = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <path fill="#fff" d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-3 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"/>
  </svg>
);
const IconGDrive = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm3.44 6L4.58 21h13.13l6.56-11.5H11.15zM12.85 3.5l6.56 11.5h3.44L16.29 3.5h-3.44z"/>
  </svg>
);
const IconBox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7.5v9L12 22l10-5.5v-9L12 2zm0 2.5l7 3.85-7 3.85-7-3.85 7-3.85zm-8 6l7 3.85v7.2L4 15.7v-5.2zm16 5.2l-7 3.85v-7.2l7-3.85v5.2z"/>
  </svg>
);
const IconDropbox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 2l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM0 10l6 4 6-4-6-4-6 4zm24 0l-6-4-6 4 6 4 6-4zM6 18l6 4 6-4-6-3.9-6 3.9z"/>
  </svg>
);
const IconS3 = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IconJira = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.95 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.95 4.35 4.35 4.35h1.78v1.74c0 2.37 1.95 4.32 4.32 4.35V6.35H7.18zm-4.36 4.35c0 2.4 1.95 4.35 4.35 4.35h1.78v1.74c0 2.4 1.95 4.35 4.35 4.35V10.7H2.82z"/>
  </svg>
);
const IconServiceNow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
  </svg>
);
const IconZendesk = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 8v8l10 6 10-6V8L12 2zm-8 7.37L11 5.3v13.4l-7-4.2V9.37zm16 4.13l-7 4.2V5.3l7 4.07v4.13z"/>
  </svg>
);
const IconAsana = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="7" r="4"/><circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/>
  </svg>
);
const IconLinear = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.707 20.293a1 1 0 0 0 1.414 0l15.172-15.172a1 1 0 0 0-1.414-1.414L3.707 18.879a1 1 0 0 0 0 1.414zM3 13h10v2H3v-2zm0-4h18v2H3V9zm0-4h18v2H3V5z"/>
  </svg>
);
const IconSlack = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165c0-1.394 1.129-2.52 2.522-2.52h2.52v2.52zM6.313 15.165c0-1.394 1.129-2.52 2.52-2.52 1.394 0 2.523 1.126 2.523 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.52-2.522v-6.313zM8.833 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.833 0c1.394 0 2.52 1.129 2.52 2.522v2.52H8.833zM8.833 6.313c1.394 0 2.52 1.129 2.52 2.52v1.394c0 1.394-1.126 2.523-2.52 2.523H2.522A2.528 2.528 0 0 1 0 8.833c0-1.394 1.129-2.52 2.522-2.52h6.311zM18.956 8.833a2.528 2.528 0 0 1 2.522-2.52A2.528 2.528 0 0 1 24 8.833c0 1.394-1.129 2.52-2.522 2.52h-2.522v-2.52zM17.688 8.833c0 1.394-1.13 2.52-2.52 2.52-1.394 0-2.523-1.126-2.523-2.52V2.522A2.528 2.528 0 0 1 15.167 0c1.394 0 2.52 1.129 2.52 2.522v6.311zM15.167 18.956a2.528 2.528 0 0 1 2.52 2.52A2.528 2.528 0 0 1 15.167 24c-1.394 0-2.52-1.129-2.52-2.522v-2.52h2.52zm0-1.27c-1.394 0-2.52-1.13-2.52-2.523v-1.394c0-1.394 1.126-2.52 2.52-2.52h6.311A2.528 2.528 0 0 1 24 15.165c0 1.394-1.129 2.52-2.522 2.52h-6.311z"/>
  </svg>
);
const IconTeams = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 7.5A2.25 2.25 0 1 0 19.5 3a2.25 2.25 0 0 0 0 4.5zm-5 1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 1h-2.25a3.25 3.25 0 0 1-.69.07 3.24 3.24 0 0 0 2.44 2.43c.9.23 1.5.9 1.5 1.83V16.5a.75.75 0 0 1-1.5 0V14.33c0-.32-.23-.6-.54-.68a4.74 4.74 0 0 1-2.96-2.15H17.5zM14.5 10.5h-5A3.5 3.5 0 0 0 6 14v4.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V14a3.5 3.5 0 0 0-3.5-3.5z"/>
  </svg>
);
const IconGmail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
);
const IconDiscord = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);
const IconGitHub = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);
const IconGitLab = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.6 12.457l-2.073-6.38a.956.956 0 0 0-1.815 0L17.64 12.457H6.36L4.288 6.077a.956.956 0 0 0-1.815 0L.4 12.457a1.442 1.442 0 0 0 .524 1.615l10.55 7.666a.957.957 0 0 0 1.124 0l10.55-7.666a1.442 1.442 0 0 0 .452-1.615z"/>
  </svg>
);

const CONNECTOR_CATEGORIES = [
  {
    id: "wiki",
    name: "Knowledge Base & Wikis",
    plugins: [
      { id: "notion", name: "Notion", color: "#000000", icon: <IconNotion /> },
      { id: "confluence", name: "Confluence", color: "#0052CC", icon: <IconConfluence /> },
      { id: "coda", name: "Coda", color: "#F04A4C", icon: <IconCoda /> },
      { id: "sharepoint", name: "Sharepoint", color: "#03787C", icon: <IconSharepoint /> },
    ]
  },
  {
    id: "storage",
    name: "Cloud Storage",
    plugins: [
      { id: "gdrive", name: "Google Drive", color: "#4285F4", icon: <IconGDrive /> },
      { id: "box", name: "Box", color: "#0061D5", icon: <IconBox /> },
      { id: "dropbox", name: "Dropbox", color: "#0061FF", icon: <IconDropbox /> },
      { id: "s3", name: "S3", color: "#E38914", icon: <IconS3 /> },
    ]
  },
  {
    id: "ticketing",
    name: "Ticketing & Task Management",
    plugins: [
      { id: "jira", name: "Jira", color: "#0052CC", icon: <IconJira /> },
      { id: "servicenow", name: "ServiceNow", color: "#81B5A1", icon: <IconServiceNow /> },
      { id: "zendesk", name: "Zendesk", color: "#03363D", icon: <IconZendesk /> },
      { id: "asana", name: "Asana", color: "#F06A6A", icon: <IconAsana /> },
      { id: "linear", name: "Linear", color: "#5E6AD2", icon: <IconLinear /> },
    ]
  },
  {
    id: "messaging",
    name: "Messaging",
    plugins: [
      { id: "slack", name: "Slack", color: "#4A154B", icon: <IconSlack /> },
      { id: "teams", name: "Teams", color: "#6264A7", icon: <IconTeams /> },
      { id: "gmail", name: "Gmail", color: "#EA4335", icon: <IconGmail /> },
      { id: "discord", name: "Discord", color: "#5865F2", icon: <IconDiscord /> },
    ]
  },
  {
    id: "code",
    name: "Code Repository",
    plugins: [
      { id: "github", name: "Github", color: "#24292E", icon: <IconGitHub /> },
      { id: "gitlab", name: "Gitlab", color: "#FCA121", icon: <IconGitLab /> },
    ]
  },
  {
    id: "other",
    name: "Others",
    plugins: [
      { id: "web", name: "Web", color: "#000000", icon: <Globe /> },
      { id: "file", name: "File", color: "#6B7280", icon: <FileText /> },
    ]
  }
];


const AUTO_SYNC_OPTIONS = [
  { value: "manual", label: "Manual Sync Only", ms: 0 },
  { value: "15m", label: "Every 15 minutes", ms: 15 * 60 * 1000 },
  { value: "1h", label: "Every 1 hour", ms: 60 * 60 * 1000 },
  { value: "6h", label: "Every 6 hours", ms: 6 * 60 * 60 * 1000 },
  { value: "24h", label: "Every 24 hours", ms: 24 * 60 * 60 * 1000 },
];

export default function ConnectorsView() {
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [autoSyncInterval, setAutoSyncInterval] = useState("1h");
  const [status, setStatus] = useState("");
  const [docs, setDocs] = useState([]);
  const [connectedConfigs, setConnectedConfigs] = useState({});
  const [syncingMap, setSyncingMap] = useState({});
  const [showCredentialsEdit, setShowCredentialsEdit] = useState(false);

  // Load connected configs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lyx_connected_connectors");
      if (saved) {
        setConnectedConfigs(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved connector configs", e);
    }
  }, []);

  // Save connected configs to localStorage
  const saveConfigs = (newConfigs) => {
    setConnectedConfigs(newConfigs);
    try {
      localStorage.setItem("lyx_connected_connectors", JSON.stringify(newConfigs));
    } catch (e) {
      console.error("Failed to save connector configs", e);
    }
  };

  // Poll indexed documents status from backend
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await getDocuments();
        setDocs(data || []);
      } catch (err) {
        console.error("Failed to fetch documents for connectors view", err);
      }
    };
    fetchDocs();
    const interval = setInterval(fetchDocs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync schedule checker loop
  useEffect(() => {
    const checkAutoSync = async () => {
      const now = Date.now();
      let updatedConfigs = { ...connectedConfigs };
      let changed = false;

      for (const [pluginId, config] of Object.entries(connectedConfigs)) {
        if (!config || !config.credentials || config.autoSyncInterval === "manual") continue;
        
        const option = AUTO_SYNC_OPTIONS.find(o => o.value === config.autoSyncInterval);
        if (!option || !option.ms) continue;

        const lastSynced = config.lastSyncedAt || 0;
        if (now - lastSynced >= option.ms) {
          console.log(`[AutoSync] Triggering scheduled sync for ${pluginId}`);
          setSyncingMap(prev => ({ ...prev, [pluginId]: true }));
          try {
            await syncConnector(pluginId, config.credentials);
            updatedConfigs[pluginId] = {
              ...config,
              lastSyncedAt: now,
            };
            changed = true;
          } catch (err) {
            console.error(`[AutoSync] Error syncing ${pluginId}:`, err);
          } finally {
            setTimeout(() => {
              setSyncingMap(prev => ({ ...prev, [pluginId]: false }));
            }, 2500);
          }
        }
      }

      if (changed) {
        saveConfigs(updatedConfigs);
      }
    };

    const autoSyncIntervalTimer = setInterval(checkAutoSync, 15000);
    return () => clearInterval(autoSyncIntervalTimer);
  }, [connectedConfigs]);

  const handleConnectOrUpdate = async () => {
    if (!selectedPlugin) return;
    setStatus("connecting");
    
    try {
      await syncConnector(selectedPlugin.id, credentials);
      const now = Date.now();
      const updated = {
        ...connectedConfigs,
        [selectedPlugin.id]: {
          credentials,
          autoSyncInterval,
          connectedAt: connectedConfigs[selectedPlugin.id]?.connectedAt || now,
          lastSyncedAt: now,
        }
      };
      saveConfigs(updated);
      setStatus("success");
      
      setTimeout(() => {
        setStatus("");
        setSelectedPlugin(null);
        setCredentials({});
        setShowCredentialsEdit(false);
      }, 2000);
    } catch (err) {
      setStatus("error");
      alert(err.message);
    }
  };

  const handleTriggerManualSync = async (pluginId, e) => {
    if (e) e.stopPropagation();
    const config = connectedConfigs[pluginId];
    if (!config) return;

    setSyncingMap(prev => ({ ...prev, [pluginId]: true }));
    try {
      await syncConnector(pluginId, config.credentials);
      const now = Date.now();
      saveConfigs({
        ...connectedConfigs,
        [pluginId]: {
          ...config,
          lastSyncedAt: now,
        }
      });
    } catch (err) {
      alert("Sync failed: " + err.message);
    } finally {
      setTimeout(() => {
        setSyncingMap(prev => ({ ...prev, [pluginId]: false }));
      }, 2500);
    }
  };

  const handleDisconnect = (pluginId) => {
    if (confirm(`Are you sure you want to disconnect ${pluginId}?`)) {
      const updated = { ...connectedConfigs };
      delete updated[pluginId];
      saveConfigs(updated);
      setSelectedPlugin(null);
      setCredentials({});
      setShowCredentialsEdit(false);
    }
  };

  const handleSelectPlugin = (plugin) => {
    setSelectedPlugin(plugin);
    const existing = connectedConfigs[plugin.id];
    if (existing) {
      setCredentials(existing.credentials || {});
      setAutoSyncInterval(existing.autoSyncInterval || "1h");
      setShowCredentialsEdit(false);
    } else {
      setCredentials({});
      setAutoSyncInterval("1h");
      setShowCredentialsEdit(true);
    }
  };

  const ALL_PLUGINS = CONNECTOR_CATEGORIES.flatMap(c => c.plugins);

  const formatLastSynced = (timestamp) => {
    if (!timestamp) return "Never";
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour(s) ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="connectors-workspace-view" style={{ padding: "28px 40px", width: "100%", height: "100%", boxSizing: "border-box" }}>
      <div className="connectors-header" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "28px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
          {selectedPlugin ? selectedPlugin.name : "Integrations & Connectors"}
        </h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Connect remote data sources. Indexed connector content is automatically synthesized into responses.
        </p>
      </div>

      {!selectedPlugin ? (
        <div className="connectors-layout">
          <div className="connectors-content" style={{ paddingLeft: 0, display: "flex", flexDirection: "column", gap: "32px" }}>
            {CONNECTOR_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {category.name}
                </h3>
                <div className="connectors-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "16px" }}>
                  {category.plugins.map((plugin) => {
                    const config = connectedConfigs[plugin.id];
                    const isConnected = !!config;
                    const isSyncing = syncingMap[plugin.id];

                    const syncDocName = plugin.id === "github" ? "GitHub Sync" : plugin.id === "web" ? "Web Scrape" : null;
                    const doc = syncDocName ? docs.find(d => d.name.startsWith(syncDocName)) : null;

                    return (
                      <div
                        key={plugin.id}
                        onClick={() => handleSelectPlugin(plugin)}
                        className="connector-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          padding: "16px 18px",
                          borderRadius: "14px",
                          background: "var(--bg-surface, #ffffff)",
                          border: isConnected ? "1.5px solid #10b981" : "1px solid var(--border, #e2e8f0)",
                          boxShadow: isConnected ? "0 2px 8px rgba(16, 185, 129, 0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                          <div className="connector-icon" style={{ color: plugin.color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {plugin.icon ? plugin.icon : (plugin.iconUrl ? <img src={plugin.iconUrl} alt={plugin.name} style={{ width: 26, height: 26, objectFit: "contain" }} /> : <Layers size={22} />)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>{plugin.name}</span>
                              {isConnected && (
                                <CheckCircle2 size={15} color="#10b981" title="Connected & Active" />
                              )}
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
                              {isConnected ? `Synced ${formatLastSynced(config.lastSyncedAt)}` : "Not connected"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--border, #f1f5f9)" }}>
                          <div>
                            {isConnected ? (
                              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                                {doc ? (doc.status === "ready" ? `Ready (${doc.total_pages} items)` : `Syncing ${doc.progress_percent}%`) : "Connected"}
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", background: "#f1f5f9", color: "#64748b", fontWeight: 500 }}>
                                Click to configure
                              </span>
                            )}
                          </div>

                          {isConnected && (
                            <button
                              onClick={(e) => handleTriggerManualSync(plugin.id, e)}
                              title="Sync Now & Fetch Latest Data"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                color: isSyncing ? "#10b981" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                fontWeight: 500
                              }}
                            >
                              <RefreshCw size={14} className={isSyncing ? "spin-icon" : ""} />
                              <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Detailed Connector Modal / Config View */
        <div className="connector-setup" style={{ background: "var(--bg-surface, #ffffff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border, #e2e8f0)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div className="connector-icon-large" style={{ width: 44, height: 44, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: `${selectedPlugin.color}15`, color: selectedPlugin.color }}>
                {selectedPlugin.icon ? selectedPlugin.icon : (selectedPlugin.iconUrl ? <img src={selectedPlugin.iconUrl} alt={selectedPlugin.name} style={{ width: 28, height: 28, objectFit: "contain" }} /> : <Layers size={24} />)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{selectedPlugin.name}</h3>
                <span style={{ fontSize: "13px", color: connectedConfigs[selectedPlugin.id] ? "#10b981" : "#64748b", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                  {connectedConfigs[selectedPlugin.id] ? <><CheckCircle2 size={14} /> Connected & Active</> : "Configure Integration"}
                </span>
              </div>
            </div>

            <button className="connector-btn-secondary" onClick={() => setSelectedPlugin(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "#f8fafc", cursor: "pointer" }}>
              ← Back to All Connectors
            </button>
          </div>

          {/* If already connected, show Connected Overview & Manage panel */}
          {connectedConfigs[selectedPlugin.id] && !showCredentialsEdit ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                {/* Sync Status Card */}
                <div style={{ padding: "16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Indexed Status</div>
                  {(() => {
                    const syncDocName = selectedPlugin.id === "github" ? "GitHub Sync" : selectedPlugin.id === "web" ? "Web Scrape" : null;
                    const doc = syncDocName ? docs.find(d => d.name.startsWith(syncDocName)) : null;
                    return (
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>
                        {doc ? (doc.status === "ready" ? `Ready (${doc.total_pages} items indexed)` : `Syncing (${doc.progress_percent}%)`) : "Ready & Active"}
                      </div>
                    );
                  })()}
                </div>

                {/* Last Synced Card */}
                <div style={{ padding: "16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Last Synced</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {formatLastSynced(connectedConfigs[selectedPlugin.id].lastSyncedAt)}
                  </div>
                </div>

                {/* Connection Date Card */}
                <div style={{ padding: "16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Auto Refresh Schedule</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {AUTO_SYNC_OPTIONS.find(o => o.value === (connectedConfigs[selectedPlugin.id].autoSyncInterval || "1h"))?.label}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Sync Now & Schedule Selector */}
              <div style={{ padding: "20px", borderRadius: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#166534" }}>Fetch & Refresh Connector Data</h4>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#15803d" }}>
                      Manually trigger a full refresh to fetch the latest repositories, files, or documents into your AI context.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerManualSync(selectedPlugin.id)}
                    disabled={syncingMap[selectedPlugin.id]}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
                    }}
                  >
                    <RefreshCw size={16} className={syncingMap[selectedPlugin.id] ? "spin-icon" : ""} />
                    <span>{syncingMap[selectedPlugin.id] ? "Fetching latest data..." : "Sync Now"}</span>
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #dcfce7", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={16} color="#15803d" />
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#166534" }}>Automatic Sync Timing:</span>
                  </div>

                  <select
                    value={connectedConfigs[selectedPlugin.id].autoSyncInterval || "1h"}
                    onChange={(e) => {
                      const newInterval = e.target.value;
                      const updated = {
                        ...connectedConfigs,
                        [selectedPlugin.id]: {
                          ...connectedConfigs[selectedPlugin.id],
                          autoSyncInterval: newInterval,
                        }
                      };
                      saveConfigs(updated);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid #86efac",
                      background: "#ffffff",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      color: "#166534",
                      cursor: "pointer"
                    }}
                  >
                    {AUTO_SYNC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Indexed Documents Details List */}
              <div style={{ marginTop: "10px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={16} /> Indexed Data Collections
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {docs.filter(d => d.name.includes(selectedPlugin.name) || (selectedPlugin.id === "github" && d.name.includes("GitHub")) || (selectedPlugin.id === "web" && d.name.includes("Web"))).map(doc => (
                    <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--border)" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{doc.name}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginLeft: "10px" }}>{doc.chunk_count} chunks indexed</span>
                      </div>
                      <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "12px", background: doc.status === "ready" ? "#dcfce7" : "#fef9c3", color: doc.status === "ready" ? "#166534" : "#854d0e", fontWeight: 600 }}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                  {docs.filter(d => d.name.includes(selectedPlugin.name) || (selectedPlugin.id === "github" && d.name.includes("GitHub")) || (selectedPlugin.id === "web" && d.name.includes("Web"))).length === 0 && (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13.5px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed var(--border)" }}>
                      Indexed data ready. Use chat to query information from this connector.
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Connection / Disconnect Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "10px" }}>
                <button
                  onClick={() => setShowCredentialsEdit(true)}
                  style={{ background: "none", border: "none", color: "var(--accent-primary, #10a37f)", cursor: "pointer", fontWeight: 600, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Settings2 size={15} /> Edit Token / Credentials
                </button>

                <button
                  onClick={() => handleDisconnect(selectedPlugin.id)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Trash2 size={15} /> Disconnect Service
                </button>
              </div>
            </div>
          ) : (
            /* Setup / Edit Form */
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Enter your credentials for <b>{selectedPlugin.name}</b> and choose how frequently you want Lyx to automatically fetch newly added content.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                {selectedPlugin.id === "jira" ? (
                  <>
                    <div>
                      <label className="connector-label">Atlassian Domain</label>
                      <input
                        type="text"
                        className="connector-input"
                        value={credentials.domain || ""}
                        onChange={(e) => setCredentials({ ...credentials, domain: e.target.value })}
                        placeholder="e.g. your-company.atlassian.net"
                      />
                    </div>
                    <div>
                      <label className="connector-label">Email</label>
                      <input
                        type="email"
                        className="connector-input"
                        value={credentials.email || ""}
                        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                        placeholder="Your Atlassian account email"
                      />
                    </div>
                    <div>
                      <label className="connector-label">API Token</label>
                      <input
                        type="password"
                        className="connector-input"
                        value={credentials.token || ""}
                        onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                        placeholder="Your Jira API token"
                      />
                    </div>
                  </>
                ) : selectedPlugin.id === "servicenow" ? (
                  <>
                    <div>
                      <label className="connector-label">Instance URL</label>
                      <input
                        type="text"
                        className="connector-input"
                        value={credentials.instance || ""}
                        onChange={(e) => setCredentials({ ...credentials, instance: e.target.value })}
                        placeholder="e.g. dev12345.service-now.com"
                      />
                    </div>
                    <div>
                      <label className="connector-label">Username</label>
                      <input
                        type="text"
                        className="connector-input"
                        value={credentials.username || ""}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        placeholder="ServiceNow username"
                      />
                    </div>
                    <div>
                      <label className="connector-label">Password</label>
                      <input
                        type="password"
                        className="connector-input"
                        value={credentials.password || ""}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="ServiceNow password"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="connector-label">
                      {selectedPlugin.id === "web" ? "Target URL" : "API Token / Access Credential"}
                    </label>
                    <input
                      type={selectedPlugin.id === "web" ? "text" : "password"}
                      className="connector-input"
                      value={credentials.token || ""}
                      onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                      placeholder={selectedPlugin.id === "web" ? "https://example.com" : `Paste your ${selectedPlugin.name} token here`}
                    />
                  </div>
                )}

                <div>
                  <label className="connector-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={15} /> Automatic Sync Timing (Auto-fetch schedule)
                  </label>
                  <select
                    className="connector-input"
                    value={autoSyncInterval}
                    onChange={(e) => setAutoSyncInterval(e.target.value)}
                    style={{ background: "var(--bg-surface, #ffffff)", cursor: "pointer" }}
                  >
                    {AUTO_SYNC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="connector-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                {connectedConfigs[selectedPlugin.id] && (
                  <button className="connector-btn-secondary" onClick={() => setShowCredentialsEdit(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid var(--border)", background: "#f8fafc", cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
                <button
                  className="connector-btn-primary"
                  onClick={handleConnectOrUpdate}
                  disabled={status === "connecting" || Object.keys(credentials).length === 0}
                  style={{ background: selectedPlugin.color, padding: "10px 22px", borderRadius: "8px", border: "none", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
                >
                  {status === "connecting" ? "Connecting & Syncing..." : connectedConfigs[selectedPlugin.id] ? "Save Credentials & Sync" : "Connect Service"}
                </button>
              </div>

              {status === "success" && <p className="connector-status-success" style={{ marginTop: "16px", padding: "12px", background: "#dcfce7", color: "#166534", borderRadius: "8px", textAlign: "center" }}>Connected! Syncing data into your workspace...</p>}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spinSlow 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
