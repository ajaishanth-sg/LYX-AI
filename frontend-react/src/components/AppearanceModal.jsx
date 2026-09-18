import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { Sun, Moon, Laptop, X } from "lucide-react";

export default function AppearanceModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState(theme);

  useEffect(() => {
    if (isOpen) setDraft(theme);
  }, [isOpen, theme]);

  if (!isOpen) return null;

  const isLight = draft.mode === "light";
  const textColor = isLight ? "#111111" : "#fafafa";
  const mutedColor = isLight ? "#555555" : "#a3a3a3";
  const surfaceColor = isLight ? "#ffffff" : "#181818";
  const borderColor = isLight ? "#d4d4d4" : "#404040";
  const selectedBorderColor = "var(--text-primary)";

  const themeOptions = [
    {
      mode: "system",
      icon: Laptop,
      label: "System preference",
      preview: "linear-gradient(90deg, #ffffff 50%, #111111 50%)",
    },
    {
      mode: "light",
      icon: Sun,
      label: "Light",
      preview: "#ffffff",
    },
    {
      mode: "dark",
      icon: Moon,
      label: "Dark",
      preview: "#111111",
    },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isLight ? "rgba(0, 0, 0, 0.28)" : "rgba(0, 0, 0, 0.72)",
      }}
    >
      <div
        className="appearance-modal-container"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "440px",
          maxHeight: "88vh",
          overflowY: "auto",
          background: surfaceColor,
          color: textColor,
          borderRadius: "14px",
          padding: "24px",
          border: `1px solid ${borderColor}`,
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
          <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>Appearance</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>Interface theme</h3>
          <p style={{ fontSize: "12.5px", color: mutedColor, margin: "0 0 14px", lineHeight: 1.5 }}>
            Use the operating system preference or choose a black-and-white theme.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {themeOptions.map(({ mode, icon: Icon, label, preview }) => {
              const selected = draft.mode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setDraft((current) => ({ ...current, mode }))}
                  type="button"
                  style={{
                    minHeight: "112px",
                    borderRadius: "10px",
                    border: selected ? `2px solid ${selectedBorderColor}` : `1px solid ${borderColor}`,
                    background: surfaceColor,
                    color: textColor,
                    padding: "10px 8px",
                    cursor: "pointer",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ width: "100%", height: "48px", borderRadius: "6px", background: preview, border: `1px solid ${borderColor}` }} />
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
                    <Icon size={14} /> {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: "16px" }}>
          <p style={{ fontSize: "12px", color: mutedColor, margin: "0 0 14px", lineHeight: 1.5 }}>
            Background images and colored overlays are disabled for a clean monochrome interface.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              onClick={onClose}
              type="button"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: `1px solid ${borderColor}`,
                background: "transparent",
                color: textColor,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setTheme(draft);
                onClose();
              }}
              type="button"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background: "var(--text-primary)",
                color: "var(--background, #ffffff)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
