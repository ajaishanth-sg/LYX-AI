import { useEffect, useState } from "react";
import { getPersona, setPersona, createModel, getModels, deleteModel } from "../services/api";

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const IconArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const PRESET_PERSONAS = [
  { label: "Default Assistant", prompt: "" },
  { label: "Teacher", prompt: "Act like a patient school teacher. Ask the student questions one at a time and give simple, encouraging feedback." },
  { label: "Interviewer", prompt: "Act like a professional technical interviewer conducting a mock interview. Ask one question at a time and give brief constructive feedback before moving on." },
  { label: "HR Recruiter", prompt: "Act like a friendly HR recruiter screening a candidate. Ask about background, experience, and motivation." },
  { label: "Coding Mentor", prompt: "Act like a supportive coding mentor. Explain concepts using simple, practical examples." },
];

const PROVIDER_OPTIONS = [
  { id: "groq", name: "Groq", company: "Groq", icon: "G" },
  { id: "gemini", name: "Google Gemini", company: "Google", icon: "✦" },
  { id: "aws", name: "AWS Bedrock", company: "Amazon", icon: "☁" },
  { id: "openai", name: "OpenAI", company: "OpenAI", icon: "O" },
  { id: "ollama", name: "Ollama", company: "Ollama", icon: "🦙" },
  { id: "local", name: "Custom / Local", company: "Other", icon: "⚙" },
];

export default function SettingsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "config"
  const [promptText, setPromptText] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [status, setStatus] = useState(""); // "", "saving", "saved", "error"

  // Custom Model State
  const [existingModels, setExistingModels] = useState([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [modalProviderId, setModalProviderId] = useState("groq");
  
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [monthlyQuota, setMonthlyQuota] = useState(1000000);
  const [quotaType, setQuotaType] = useState("monthly");
  const [providerModels, setProviderModels] = useState([]);
  const [ollamaMode, setOllamaMode] = useState("local"); // "local" | "cloud"

  useEffect(() => {
    if (!isOpen) return;
    getPersona()
      .then((data) => {
        setPromptText(data.persona_prompt || "");
        setSavedPrompt(data.persona_prompt || "");
      })
      .catch((err) => console.error("Failed to load persona:", err));
      
    fetchModels();
  }, [isOpen]);

  const fetchModels = () => {
    getModels()
      .then((data) => setExistingModels(data || []))
      .catch((err) => console.error("Failed to load models:", err));
  };

  useEffect(() => {
    if (!isModalOpen) return;

    if (apiKey.length > 5 || (modalProviderId === "ollama" && (ollamaMode === "local" || baseUrl))) {
      fetch(`http://127.0.0.1:8000/api/v1/settings/fetch-live-models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: modalProviderId, api_key: apiKey, base_url: baseUrl })
      })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setProviderModels(res.data);
          // Auto-select first model if none selected
          if (!modelName && modalMode === "add") {
            setModelName(res.data[0].id);
          }
        } else {
          setProviderModels([]);
        }
      })
      .catch(err => console.error("Failed to fetch live models:", err));
    } else {
      fetch(`http://127.0.0.1:8000/api/v1/settings/provider-models/${modalProviderId}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setProviderModels(res.data);
            if (res.data.length > 0 && !modelName && modalMode === "add") {
              setModelName(res.data[0].id);
            }
          }
        })
        .catch((err) => console.error("Failed to load provider models:", err));
    }
  }, [isModalOpen, modalProviderId, apiKey, baseUrl, ollamaMode]);

  const handleSavePersona = async () => {
    setStatus("saving");
    try {
      await setPersona(promptText);
      setSavedPrompt(promptText);
      setStatus("saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      console.error("Failed to save persona:", err);
      setStatus("error");
    }
  };

  const handleResetPersona = async () => {
    setStatus("saving");
    try {
      await setPersona("");
      setPromptText("");
      setSavedPrompt("");
      setStatus("saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      console.error("Failed to reset persona:", err);
      setStatus("error");
    }
  };

  const handleOpenAddModal = (providerId) => {
    setModalMode("add");
    setModalProviderId(providerId);
    setModelName("");
    setApiKey("");
    setMonthlyQuota(1000000);
    setQuotaType("monthly");
    setOllamaMode("local");
    setBaseUrl(providerId === "ollama" ? "http://localhost:11434" : "");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (model) => {
    setModalMode("edit");
    setModalProviderId(model.provider || "groq");
    setModelName(model.name);
    setApiKey(model.api_key || "");
    setBaseUrl(model.base_url || "");
    setMonthlyQuota(model.monthly_quota ?? 1000000);
    setQuotaType(model.quota_type || "monthly");
    setIsModalOpen(true);
  };

  const handleSaveModel = async () => {
    if (!modelName.trim()) {
      alert("Model Name is required.");
      return;
    }
    if (modalProviderId !== "ollama" && modalProviderId !== "local" && !apiKey.trim()) {
      alert("API Key is required for provider: " + modalProviderId);
      return;
    }
    if (modalProviderId === "ollama" && ollamaMode === "cloud" && !apiKey.trim()) {
      alert("API Key is required for Cloud Ollama.");
      return;
    }
    setStatus("saving_model");
    try {
      await createModel(modelName.trim(), apiKey.trim(), modalProviderId, baseUrl.trim(), monthlyQuota, quotaType);
      setStatus("model_saved");
      fetchModels();
      window.dispatchEvent(new CustomEvent("models-updated"));
      setTimeout(() => {
        setStatus("");
        setIsModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to save model:", err);
      setStatus("model_error");
    }
  };

  const handleDeleteModel = async (e, modelId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this configured model?")) return;
    try {
      await deleteModel(modelId);
      fetchModels();
      window.dispatchEvent(new CustomEvent("models-updated"));
    } catch (err) {
      console.error("Failed to delete model:", err);
      alert("Failed to delete model.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90vw' }}>
          <div className="settings-header">
            <h2>Settings</h2>
            <button className="settings-close" onClick={onClose} aria-label="Close settings">
              ✕
            </button>
          </div>

          <div className="settings-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
            <button 
              style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: activeTab === "profile" ? "2px solid var(--primary)" : "none", fontWeight: activeTab === "profile" ? 600 : 400, cursor: "pointer" }}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button 
              style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: activeTab === "config" ? "2px solid var(--primary)" : "none", fontWeight: activeTab === "config" ? 600 : 400, cursor: "pointer" }}
              onClick={() => setActiveTab("config")}
            >
              Configuration
            </button>
          </div>

          <div style={{ padding: "0 4px 20px" }}>
            {activeTab === "profile" && (
              <div>
                <label className="settings-label">Persona Prompt</label>
                <p className="settings-hint">
                  Describe how the assistant should behave. This applies to new conversations.
                </p>

                <div className="settings-presets">
                  {PRESET_PERSONAS.map((preset) => (
                    <button
                      key={preset.label}
                      className="preset-chip"
                      onClick={() => setPromptText(preset.prompt)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  className="settings-textarea"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Act like a technical interviewer conducting a mock interview."
                  rows={6}
                />

                <div className="settings-actions">
                  <button className="settings-btn-secondary" onClick={handleResetPersona}>
                    Reset
                  </button>
                  <button className="settings-btn-primary" onClick={handleSavePersona} disabled={status === "saving"}>
                    {status === "saving" ? "Saving…" : "Save"}
                  </button>
                </div>

                {status === "saved" && <p className="settings-status settings-status-success">Saved successfully.</p>}
                {status === "error" && <p className="settings-status settings-status-error">Failed to save. Try again.</p>}
              </div>
            )}

            {activeTab === "config" && (
              <div>
                {existingModels.length > 0 && (
                  <div style={{ marginBottom: "32px" }}>
                    <div className="onyx-section-title" style={{ marginTop: 0 }}>Available Providers</div>
                    <div className="onyx-grid">
                      {existingModels.map((m) => {
                        const opt = PROVIDER_OPTIONS.find(o => o.id === m.provider) || PROVIDER_OPTIONS.find(o => o.id === "local");
                        return (
                          <div key={m.id} className="onyx-card onyx-card-hoverable" onClick={() => handleOpenEditModal(m)}>
                            <div className="onyx-card-header">
                              <div className="onyx-provider-icon">{opt.icon}</div>
                              <div className="onyx-provider-info">
                                <div className="onyx-provider-name">{m.name}</div>
                                <div className="onyx-provider-company">{opt.company}</div>
                              </div>
                              {m.api_key && m.api_key !== "dummy-key" ? (
                                <span className="onyx-badge">Configured</span>
                              ) : (
                                <span className="onyx-badge" style={{ background: '#fef3c7', color: '#b45309' }}>No Key</span>
                              )}
                            </div>
                            {/* Usage Progress Bar */}
                            <div style={{ marginTop: '12px', padding: '0 4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <span>{(m.tokens_used || 0).toLocaleString()} used / {Math.max(0, (m.monthly_quota || 1000000) - (m.tokens_used || 0)).toLocaleString()} remaining ({m.quota_type === 'daily' ? 'Today' : m.quota_type === 'total' ? 'Lifetime' : 'This Month'})</span>
                                <span>{((m.tokens_used || 0) / (m.monthly_quota || 1000000) * 100).toFixed(1)}%</span>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: 'var(--border-light, #e5e5e5)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ 
                                  height: '100%', 
                                  width: `${Math.min(100, ((m.tokens_used || 0) / (m.monthly_quota || 1000000) * 100))}%`, 
                                  background: ((m.tokens_used || 0) / (m.monthly_quota || 1000000)) > 0.9 ? '#ef4444' : ((m.tokens_used || 0) / (m.monthly_quota || 1000000)) > 0.7 ? '#eab308' : '#10b981',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignSelf: 'flex-end' }}>
                              <button className="onyx-btn-secondary" onClick={(e) => handleDeleteModel(e, m.id)} style={{ padding: '6px' }} title="Delete provider">
                                <IconTrash />
                              </button>
                              <button className="onyx-btn-secondary" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m); }} style={{ padding: '6px' }} title="Edit provider">
                                <IconSettings />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="onyx-section-title">Add Provider</div>
                  <p className="settings-hint" style={{ marginBottom: '16px' }}>Configure a new LLM provider by selecting from the options below.</p>
                  
                  <div className="onyx-grid">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <div key={opt.id} className="onyx-card onyx-card-hoverable" onClick={() => handleOpenAddModal(opt.id)}>
                        <div className="onyx-card-header">
                          <div className="onyx-provider-icon">{opt.icon}</div>
                          <div className="onyx-provider-info">
                            <div className="onyx-provider-name">{opt.name}</div>
                            <div className="onyx-provider-company">{opt.company}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', marginTop: '16px', alignSelf: 'flex-end' }}>
                          <button className="onyx-btn-secondary" onClick={(e) => { e.stopPropagation(); handleOpenAddModal(opt.id); }}>
                            {opt.isCustom ? "Set Up" : "Connect"} <IconArrowRight />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="onyx-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="onyx-modal" onClick={e => e.stopPropagation()}>
            <div className="onyx-modal-header">
              <div className="onyx-modal-title">
                {modalMode === "add" ? "Connect Provider" : "Edit Provider"}
              </div>
              <button className="onyx-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className="onyx-modal-body">
              <div>
                <label className="settings-label" style={{ fontSize: "13px", marginBottom: "6px" }}>Model Name</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select 
                    className="settings-textarea" 
                    style={{ height: "40px", padding: "8px 12px" }}
                    value={providerModels.some(m => m.id === modelName) ? modelName : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setModelName("");
                      } else {
                        setModelName(e.target.value);
                      }
                    }}
                  >
                    {providerModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    <option value="custom">Custom (Type below)</option>
                  </select>
                  
                  {!providerModels.some(m => m.id === modelName) && (
                    <input 
                      type="text" 
                      className="settings-textarea" 
                      style={{ height: "40px", padding: "8px 12px" }}
                      placeholder="Enter model ID (e.g., my-local-model)"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {modalProviderId === "ollama" && (
                <div style={{ marginBottom: "16px" }}>
                  <label className="settings-label" style={{ fontSize: "13px", marginBottom: "8px", display: "block" }}>Ollama Mode</label>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="radio" 
                        name="ollamaMode" 
                        value="local" 
                        checked={ollamaMode === "local"} 
                        onChange={() => {
                          setOllamaMode("local");
                          setBaseUrl("http://localhost:11434");
                          setApiKey("");
                        }} 
                      />
                      Local
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="radio" 
                        name="ollamaMode" 
                        value="cloud" 
                        checked={ollamaMode === "cloud"} 
                        onChange={() => {
                          setOllamaMode("cloud");
                          setBaseUrl("https://ollama.com/v1");
                        }} 
                      />
                      Cloud
                    </label>
                  </div>
                </div>
              )}

              {(modalProviderId !== "ollama" || ollamaMode === "cloud") && (
                <div>
                  <label className="settings-label" style={{ fontSize: "13px", marginBottom: "6px" }}>API Key</label>
                  <input 
                    type="text" 
                    className="settings-textarea" 
                    style={{ height: "40px", padding: "8px 12px" }}
                    placeholder="Your API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Required for most external providers. Leave blank for local models.</p>
                </div>
              )}

              {(modalProviderId === "local" || modalProviderId === "ollama") && (
                <div>
                  <label className="settings-label" style={{ fontSize: "13px", marginBottom: "6px" }}>Base URL {ollamaMode === "local" ? "" : "(Optional)"}</label>
                  <input 
                    type="text" 
                    className="settings-textarea" 
                    placeholder={modalProviderId === "ollama" && ollamaMode === "local" ? "http://localhost:11434" : "e.g. https://api.mycloud.com/v1"}
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    disabled={modalProviderId === "ollama" && ollamaMode === "local"}
                    style={modalProviderId === "ollama" && ollamaMode === "local" ? { backgroundColor: "var(--bg-secondary)", opacity: 0.7, height: "40px", padding: "8px 12px" } : { height: "40px", padding: "8px 12px" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label className="settings-label" style={{ fontSize: "13px", marginBottom: "6px" }}>Usage Quota Limit</label>
                  <input 
                    type="number" 
                    className="settings-textarea" 
                    style={{ height: "40px", padding: "8px 12px" }}
                    placeholder="e.g. 1000000"
                    value={monthlyQuota}
                    onChange={(e) => setMonthlyQuota(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="settings-label" style={{ fontSize: "13px", marginBottom: "6px" }}>Reset Period</label>
                  <select 
                    className="settings-textarea" 
                    style={{ height: "40px", padding: "8px 12px" }}
                    value={quotaType}
                    onChange={(e) => setQuotaType(e.target.value)}
                  >
                    <option value="daily">Daily Usage</option>
                    <option value="monthly">Monthly Usage</option>
                    <option value="total">Total Lifetime</option>
                  </select>
                </div>
              </div>

              {status === "model_saved" && <p className="settings-status settings-status-success" style={{ margin: 0, marginTop: "16px" }}>Model saved successfully.</p>}
              {status === "model_error" && <p className="settings-status settings-status-error" style={{ margin: 0, marginTop: "16px" }}>Failed to save model.</p>}
            </div>

            <div className="onyx-modal-footer">
              <button className="onyx-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="settings-btn-primary" onClick={handleSaveModel} disabled={status === "saving_model"}>
                {status === "saving_model" ? "Saving…" : "Save Model"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}