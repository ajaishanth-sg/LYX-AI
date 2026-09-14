import { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { Palette, Sun, Moon, Laptop, RotateCw, ImagePlus, Check, X } from "lucide-react";

const PRESET_LANDSCAPES = [
  { id: "mountain", title: "Dolomite Mountains", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80" },
  { id: "desert", title: "Mojave Dunes", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80" },
  { id: "snow", title: "Snowy Peak", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80" },
  { id: "sunset", title: "Sunset Ridge", url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80" },
];

const PRESET_ABSTRACTS = [
  { id: "blue_wave", title: "Blue Fluid", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" },
  { id: "orange_curve", title: "Orange Curves", url: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=80" },
  { id: "purple_flow", title: "Purple Silk", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80" },
  { id: "neon_mesh", title: "Neon Mesh", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80" },
];

const OVERLAY_COLORS = [
  { id: "none", color: "transparent", label: "None" },
  { id: "purple", color: "rgba(139, 92, 246, 0.25)", dotColor: "#8b5cf6" },
  { id: "blue", color: "rgba(59, 130, 246, 0.25)", dotColor: "#3b82f6" },
  { id: "cyan", color: "rgba(6, 182, 212, 0.25)", dotColor: "#06b6d4" },
  { id: "pink", color: "rgba(236, 72, 153, 0.25)", dotColor: "#ec4899" },
  { id: "red", color: "rgba(244, 63, 94, 0.25)", dotColor: "#f43f5e" },
  { id: "green", color: "rgba(16, 185, 129, 0.25)", dotColor: "#10b981" },
  { id: "gray", color: "rgba(100, 116, 139, 0.25)", dotColor: "#64748b" },
];

export default function AppearanceModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef(null);

  // Draft local state to edit before clicking Save Changes
  const [draft, setDraft] = useState({ ...theme });

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...theme });
    }
  }, [isOpen, theme]);

  if (!isOpen) return null;

  const handleSave = () => {
    setTheme(draft);
    onClose();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDraft(prev => ({ ...prev, bgImage: event.target.result, bgEnabled: true }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomGenerate = () => {
    const allPresets = [...PRESET_LANDSCAPES, ...PRESET_ABSTRACTS];
    const randomImg = allPresets[Math.floor(Math.random() * allPresets.length)];
    setDraft(prev => ({ ...prev, bgImage: randomImg.url, bgEnabled: true }));
  };

  const isLight = draft.mode === "light";

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
      <div 
        className="appearance-modal-container" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: "640px", 
          maxHeight: "88vh", 
          overflowY: "auto", 
          background: isLight ? "#ffffff" : "#1f1f23", 
          color: isLight ? "#0f172a" : "#f8fafc",
          borderRadius: "20px", 
          padding: "24px 28px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
          border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Palette size={20} color={isLight ? "#0f172a" : "#ffffff"} />
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>Appearance</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7 }}>
            <X size={20} />
          </button>
        </div>

        {/* Section 1: Interface Theme */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, margin: "0 0 2px" }}>Interface Theme</h3>
          <p style={{ fontSize: "12.5px", color: isLight ? "#64748b" : "#94a3b8", margin: "0 0 12px" }}>
            Select or customize your UI theme
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {/* System Preference */}
            <div 
              onClick={() => setDraft(prev => ({ ...prev, mode: "system" }))}
              style={{
                borderRadius: "12px",
                border: draft.mode === "system" ? "2px solid #6366f1" : isLight ? "1px solid #e2e8f0" : "1px solid rgba(148, 163, 184, 0.2)",
                background: isLight ? "#f8fafc" : "#18181b",
                padding: "10px",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div style={{ height: "64px", borderRadius: "8px", background: "linear-gradient(90deg, #ffffff 50%, #1e1e24 50%)", border: "1px solid rgba(0,0,0,0.1)", marginBottom: "8px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                <Laptop size={14} /> System preference
              </div>
            </div>

            {/* Light Mode */}
            <div 
              onClick={() => setDraft(prev => ({ ...prev, mode: "light" }))}
              style={{
                borderRadius: "12px",
                border: draft.mode === "light" ? "2px solid #6366f1" : isLight ? "1px solid #e2e8f0" : "1px solid rgba(148, 163, 184, 0.2)",
                background: isLight ? "#f8fafc" : "#18181b",
                padding: "10px",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div style={{ height: "64px", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", marginBottom: "8px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                <Sun size={14} /> Light mode
              </div>
            </div>

            {/* Dark */}
            <div 
              onClick={() => setDraft(prev => ({ ...prev, mode: "dark" }))}
              style={{
                borderRadius: "12px",
                border: draft.mode === "dark" ? "2px solid #6366f1" : isLight ? "1px solid #e2e8f0" : "1px solid rgba(148, 163, 184, 0.2)",
                background: isLight ? "#f8fafc" : "#18181b",
                padding: "10px",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div style={{ height: "64px", borderRadius: "8px", background: "#111827", border: "1px solid #374151", marginBottom: "8px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                <Moon size={14} /> Dark
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Background */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div>
              <h3 style={{ fontSize: "14.5px", fontWeight: 700, margin: 0 }}>Background</h3>
              <p style={{ fontSize: "12.5px", color: isLight ? "#64748b" : "#94a3b8", margin: "2px 0 0" }}>Customize your background</p>
            </div>
            <ToggleSwitch 
              checked={draft.bgEnabled} 
              onChange={(val) => setDraft(prev => ({ ...prev, bgEnabled: val }))} 
            />
          </div>

          {draft.bgEnabled && (
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Preview + Options Row */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px" }}>
                {/* Left Preview Box */}
                <div>
                  <div 
                    style={{ 
                      height: "110px", 
                      borderRadius: "10px", 
                      backgroundImage: `url(${draft.bgImage || PRESET_LANDSCAPES[1].url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.2)"
                    }} 
                  />
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: "none" }} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      padding: "8px",
                      borderRadius: "8px",
                      border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(148,163,184,0.3)",
                      background: "transparent",
                      color: "inherit",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <ImagePlus size={14} /> Add image
                  </button>
                </div>

                {/* Right Options Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Auto generate background</span>
                    <button 
                      onClick={handleRandomGenerate}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(148,163,184,0.3)",
                        background: "transparent",
                        color: "inherit",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <RotateCw size={13} /> Generate
                    </button>
                  </div>

                  {/* Overlay Color Bar */}
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Overlay</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {OVERLAY_COLORS.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setDraft(prev => ({ ...prev, overlayColor: item.color }))}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: draft.overlayColor === item.color ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.2)",
                            background: item.id === "none" ? "#334155" : item.dotColor,
                            color: "#ffffff",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {item.id === "none" ? "−" : draft.overlayColor === item.color ? <Check size={12} /> : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blur Toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Blur</span>
                    <ToggleSwitch 
                      checked={draft.bgBlur} 
                      onChange={(val) => setDraft(prev => ({ ...prev, bgBlur: val }))} 
                    />
                  </div>

                  {/* Apply to All */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Apply to all</span>
                    <ToggleSwitch 
                      checked={draft.applyToAll} 
                      onChange={(val) => setDraft(prev => ({ ...prev, applyToAll: val }))} 
                    />
                  </div>
                </div>
              </div>

              {/* Landscape Category */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>Landscape</span>
                  <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, cursor: "pointer" }}>View All ›</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                  {PRESET_LANDSCAPES.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setDraft(prev => ({ ...prev, bgImage: item.url, bgEnabled: true }))}
                      style={{
                        height: "70px",
                        borderRadius: "8px",
                        backgroundImage: `url(${item.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        cursor: "pointer",
                        border: draft.bgImage === item.url ? "2.5px solid #6366f1" : "1px solid rgba(255,255,255,0.1)"
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Abstract Category */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>Abstract</span>
                  <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, cursor: "pointer" }}>View All ›</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                  {PRESET_ABSTRACTS.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setDraft(prev => ({ ...prev, bgImage: item.url, bgEnabled: true }))}
                      style={{
                        height: "70px",
                        borderRadius: "8px",
                        backgroundImage: `url(${item.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        cursor: "pointer",
                        border: draft.bgImage === item.url ? "2.5px solid #6366f1" : "1px solid rgba(255,255,255,0.1)"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Chat Color */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "14.5px", fontWeight: 700, margin: 0 }}>Chat Color</h3>
              <p style={{ fontSize: "12.5px", color: isLight ? "#64748b" : "#94a3b8", margin: "2px 0 0" }}>Customize your chat</p>
            </div>
            <ToggleSwitch 
              checked={draft.chatColorEnabled} 
              onChange={(val) => setDraft(prev => ({ ...prev, chatColorEnabled: val }))} 
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(148,163,184,0.15)", paddingTop: "16px" }}>
          <button 
            onClick={onClose} 
            style={{
              padding: "9px 20px",
              borderRadius: "10px",
              border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(148,163,184,0.3)",
              background: "transparent",
              color: "inherit",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>

          <button 
            onClick={handleSave} 
            style={{
              padding: "9px 22px",
              borderRadius: "10px",
              border: "none",
              background: isLight ? "#0f172a" : "#ffffff",
              color: isLight ? "#ffffff" : "#0f172a",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: "42px",
        height: "24px",
        borderRadius: "12px",
        background: checked ? "#3b82f6" : "#475569",
        padding: "2px",
        cursor: "pointer",
        transition: "background 0.2s ease"
      }}
    >
      <div 
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#ffffff",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.2s ease"
        }}
      />
    </div>
  );
}
