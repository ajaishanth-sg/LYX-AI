import React, { useState, useEffect } from "react";
import { Brain, X, Trash2, Plus, Sparkles, User, Heart, Target, Briefcase, Users, Flame } from "lucide-react";

export function MemoryDashboard({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("all");
  const [memories, setMemories] = useState(() => {
    try {
      const saved = localStorage.getItem("lyx_memories");
      return saved ? JSON.parse(saved) : [
        { id: "1", category: "identity", text: "User prefers concise, practical explanations in English and Tamil.", createdAt: new Date().toISOString() },
        { id: "2", category: "project", text: "Active development on Kawaii AI Assistant platform.", createdAt: new Date().toISOString() },
      ];
    } catch {
      return [];
    }
  });

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("identity");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("lyx_memories", JSON.stringify(memories));
    } catch (e) {}
  }, [memories]);

  if (!isOpen) return null;

  const categoryConfig = {
    identity: { label: "Identity", icon: User, color: "#d97706", bg: "#fef3c7" },
    preference: { label: "Preferences", icon: Heart, color: "#db2777", bg: "#fce7f3" },
    goal: { label: "Goals", icon: Target, color: "#059669", bg: "#d1fae5" },
    project: { label: "Projects", icon: Briefcase, color: "#0284c7", bg: "#e0f2fe" },
    relationship: { label: "Relationships", icon: Users, color: "#9333ea", bg: "#f3e8ff" },
    emotional: { label: "Milestones", icon: Flame, color: "#dc2626", bg: "#fee2e2" },
  };

  const handleAddMemory = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      category: newCategory,
      text: newText.trim(),
      createdAt: new Date().toISOString(),
    };
    setMemories([newItem, ...memories]);
    setNewText("");
    setIsAdding(false);
  };

  const handleDeleteMemory = (id) => {
    setMemories(memories.filter((m) => m.id !== id));
  };

  const filteredMemories = activeTab === "all" ? memories : memories.filter((m) => m.category === activeTab);

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "85vh",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{ 
            padding: "20px 24px", 
            borderBottom: "1px solid #e2e8f0", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            background: "#ffffff" 
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{ 
                padding: "10px", 
                borderRadius: "12px", 
                background: "#e0f2fe", 
                color: "#0284c7", 
                border: "1px solid #bae6fd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Brain size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                Memory Core & Recollections <Sparkles size={15} style={{ color: "#0284c7" }} />
              </h3>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                Persistent Context Seeds ({memories.length})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: "#f1f5f9", 
              border: "1px solid #e2e8f0", 
              color: "#64748b", 
              borderRadius: "8px",
              cursor: "pointer", 
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Header */}
        <div 
          style={{ 
            padding: "12px 24px", 
            background: "#f8fafc", 
            borderBottom: "1px solid #e2e8f0", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between" 
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
            💡 AI retains these memories to personalize voice agent responses
          </span>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "5px", 
                padding: "6px 14px", 
                borderRadius: "8px", 
                background: "#0284c7", 
                border: "none", 
                color: "#ffffff", 
                fontSize: "12px", 
                fontWeight: "600", 
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)"
              }}
            >
              <Plus size={14} /> Add Memory Seed
            </button>
          )}
        </div>

        {/* Add Memory Form Drawer */}
        {isAdding && (
          <form 
            onSubmit={handleAddMemory} 
            style={{ 
              padding: "18px 24px", 
              borderBottom: "1px solid #e2e8f0", 
              background: "#f1f5f9", 
              display: "flex", 
              flexDirection: "column", 
              gap: "14px" 
            }}
          >
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>Category</label>
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "9px 12px", 
                  borderRadius: "8px", 
                  background: "#ffffff", 
                  border: "1px solid #cbd5e1", 
                  color: "#0f172a", 
                  fontSize: "13px",
                  fontWeight: "500",
                  outline: "none"
                }}
              >
                {Object.keys(categoryConfig).map((cat) => (
                  <option key={cat} value={cat}>{categoryConfig[cat].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>Recollection Statement</label>
              <textarea 
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. User prefers concise answers with bullet points."
                rows={3}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px 12px", 
                  borderRadius: "8px", 
                  background: "#ffffff", 
                  border: "1px solid #cbd5e1", 
                  color: "#0f172a", 
                  fontSize: "13px", 
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.4"
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                style={{ padding: "7px 14px", borderRadius: "6px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ padding: "7px 16px", borderRadius: "6px", background: "#0284c7", border: "none", color: "#ffffff", fontWeight: "600", fontSize: "12px", cursor: "pointer", boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)" }}
              >
                Save Memory
              </button>
            </div>
          </form>
        )}

        {/* Category Filters */}
        <div style={{ padding: "12px 24px", display: "flex", gap: "6px", overflowX: "auto", borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
          <button 
            onClick={() => setActiveTab("all")}
            style={{ 
              padding: "6px 16px", 
              borderRadius: "999px", 
              fontSize: "12px", 
              fontWeight: activeTab === "all" ? "700" : "500", 
              background: activeTab === "all" ? "#0f172a" : "#f1f5f9", 
              color: activeTab === "all" ? "#ffffff" : "#475569", 
              border: "none", 
              cursor: "pointer", 
              whitespace: "nowrap",
              transition: "all 0.15s ease" 
            }}
          >
            All Memories
          </button>
          {Object.keys(categoryConfig).map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{ 
                padding: "6px 16px", 
                borderRadius: "999px", 
                fontSize: "12px", 
                fontWeight: activeTab === cat ? "700" : "500", 
                background: activeTab === cat ? "#0f172a" : "#f1f5f9", 
                color: activeTab === cat ? "#ffffff" : "#475569", 
                border: "none", 
                cursor: "pointer", 
                whitespace: "nowrap",
                transition: "all 0.15s ease" 
              }}
            >
              {categoryConfig[cat].label}
            </button>
          ))}
        </div>

        {/* Memories Card List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc" }}>
          {filteredMemories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8" }}>
              <Brain size={36} style={{ opacity: 0.35, margin: "0 auto 12px auto" }} />
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}>No recollections recorded yet.</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Click &quot;+ Add Memory Seed&quot; to save a memory context.</p>
            </div>
          ) : (
            filteredMemories.map((m) => {
              const cfg = categoryConfig[m.category] || categoryConfig.identity;
              const Icon = cfg.icon;
              return (
                <div 
                  key={m.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div 
                      style={{ 
                        padding: "8px", 
                        borderRadius: "8px", 
                        background: cfg.bg, 
                        color: cfg.color, 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "2px",
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "700", color: cfg.color, letterSpacing: "0.04em" }}>
                        {cfg.label}
                      </span>
                      <p style={{ fontSize: "13px", marginTop: "4px", lineHeight: "1.5", color: "#1e293b", fontWeight: "500" }}>
                        {m.text}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteMemory(m.id)}
                    title="Delete memory"
                    style={{ 
                      background: "transparent", 
                      border: "none", 
                      color: "#94a3b8", 
                      cursor: "pointer", 
                      padding: "4px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <span>Memory Context Active</span>
          </span>
          <span>Durable Local Sync</span>
        </div>
      </div>
    </div>
  );
}
