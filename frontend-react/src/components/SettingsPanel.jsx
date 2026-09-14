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

const PRESET_PERSONAS = [
  { label: "Default Assistant", prompt: "" },
  { label: "Teacher", prompt: "Act like a patient school teacher. Ask the student questions one at a time and give simple, encouraging feedback." },
  { label: "Interviewer", prompt: "Act like a professional technical interviewer conducting a mock interview. Ask one question at a time and give brief constructive feedback before moving on." },
  { label: "HR Recruiter", prompt: "Act like a friendly HR recruiter screening a candidate. Ask about background, experience, and motivation." },
  { label: "Coding Mentor", prompt: "Act like a supportive coding mentor. Explain concepts using simple, practical examples." },
];

export default function SettingsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "config"
  const [promptText, setPromptText] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [status, setStatus] = useState(""); // "", "saving", "saved", "error"

  // Custom Model State
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("groq");
  const [baseUrl, setBaseUrl] = useState("");
  const [existingModels, setExistingModels] = useState([]);

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
      await setPersona(""); // "" = default assistant, no custom persona
      setPromptText("");
      setSavedPrompt("");
      setStatus("saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      console.error("Failed to reset persona:", err);
      setStatus("error");
    }
  };

  const handleSaveModel = async () => {
    if (!modelName.trim()) {
      alert("Model Name is required.");
      return;
    }
    if (provider !== "ollama" && provider !== "local" && !apiKey.trim()) {
      alert("API Key is required for provider: " + provider);
      return;
    }
    setStatus("saving_model");
    try {
      await createModel(modelName.trim(), apiKey.trim(), provider, baseUrl.trim());
      setStatus("model_saved");
      setModelName("");
      setApiKey("");
      setProvider("groq");
      setBaseUrl("");
      fetchModels();
      window.dispatchEvent(new CustomEvent("models-updated"));
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      console.error("Failed to save model:", err);
      setStatus("model_error");
    }
  };

  const handleDeleteModel = async (e, modelId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved model?")) return;
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
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
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
            <label className="settings-label">Custom LLM Provider</label>
            <p className="settings-hint">
              Add or update a custom LLM provider configuration to use in your chats.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label className="settings-label" style={{ fontSize: "12px", marginBottom: "4px" }}>Model Name</label>
                <input 
                  type="text" 
                  className="settings-textarea" 
                  style={{ height: "40px", padding: "8px" }}
                  placeholder="e.g. llama-3.3-70b-versatile"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>
              <div>
                <label className="settings-label" style={{ fontSize: "12px", marginBottom: "4px" }}>Provider</label>
                <select 
                  className="settings-textarea" 
                  style={{ height: "40px", padding: "8px" }}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="groq">Groq</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="aws">AWS Bedrock</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="ollama">Ollama</option>
                  <option value="local">Local / Custom</option>
                </select>
              </div>
              <div>
                <label className="settings-label" style={{ fontSize: "12px", marginBottom: "4px" }}>API Key</label>
                <input 
                  type="password" 
                  className="settings-textarea" 
                  style={{ height: "40px", padding: "8px" }}
                  placeholder="Your API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className="settings-label" style={{ fontSize: "12px", marginBottom: "4px" }}>Base URL (Optional)</label>
                <input 
                  type="text" 
                  className="settings-textarea" 
                  style={{ height: "40px", padding: "8px" }}
                  placeholder="e.g. https://api.groq.com/openai/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button className="settings-btn-primary" onClick={handleSaveModel} disabled={status === "saving_model"}>
                {status === "saving_model" ? "Saving…" : "Save / Add Model"}
              </button>
            </div>

            {status === "model_saved" && <p className="settings-status settings-status-success">Model saved successfully.</p>}
            {status === "model_error" && <p className="settings-status settings-status-error">Failed to save model.</p>}

            {existingModels.length > 0 && (
              <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <label className="settings-label">Configured Models</label>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {existingModels.map((m) => (
                    <li 
                      key={m.id} 
                      onClick={() => {
                        setModelName(m.name);
                        setProvider(m.provider);
                        setApiKey(m.api_key || "");
                        setBaseUrl(m.base_url || "");
                      }}
                      style={{ 
                        padding: "10px 14px", 
                        background: "var(--bg-secondary, #f3f4f6)", 
                        borderRadius: "8px", 
                        fontSize: "14px", 
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid var(--border, #e5e7eb)"
                      }}
                    >
                      <div>
                        <strong>{m.name}</strong> <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "4px" }}>({m.provider})</span>
                        {m.api_key ? (
                          <span style={{ fontSize: "11px", display: "block", color: "#10b981", marginTop: "2px" }}>✓ Key configured</span>
                        ) : (
                          <span style={{ fontSize: "11px", display: "block", color: "#f59e0b", marginTop: "2px" }}>⚠️ No key set</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteModel(e, m.id)}
                        title="Delete model"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          padding: "6px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconTrash />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}