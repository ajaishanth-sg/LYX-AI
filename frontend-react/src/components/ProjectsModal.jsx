import { useState } from "react";

export default function ProjectsModal({ isOpen, onClose }) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(""); // "", "creating", "success", "error"

  if (!isOpen) return null;

  const handleCreate = () => {
    setStatus("creating");
    // Mock creation
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setStatus("");
        setProjectName("");
        setDescription("");
        onClose();
      }, 1500);
    }, 1000);
  };

  const handleClose = () => {
    setProjectName("");
    setDescription("");
    setStatus("");
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <div className="settings-header">
          <h2>Create New Project</h2>
          <button className="settings-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="settings-hint" style={{ marginBottom: 24 }}>
          Organize your documents, chats, and configurations under a specific project workspace.
        </p>

        <label className="settings-label">Project Name</label>
        <input
          type="text"
          className="settings-textarea"
          style={{ height: "40px", resize: "none", marginBottom: "16px", padding: "10px 12px", fontFamily: "inherit" }}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Legal Documents Review"
        />

        <label className="settings-label">Description (Optional)</label>
        <textarea
          className="settings-textarea"
          style={{ marginBottom: "24px", fontFamily: "inherit" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe the purpose of this project..."
          rows={3}
        />

        <div className="settings-actions">
          <button className="settings-btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button 
            className="settings-btn-primary" 
            onClick={handleCreate} 
            disabled={status === "creating" || !projectName.trim()}
          >
            {status === "creating" ? "Creating..." : "Create Project"}
          </button>
        </div>

        {status === "success" && <p className="settings-status settings-status-success" style={{ marginTop: "16px" }}>Project created successfully!</p>}
      </div>
    </div>
  );
}
