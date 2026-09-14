import React, { useState, useEffect } from "react";
import { Cpu, X, Play, Terminal, Lightbulb, AppWindow, CheckCircle, AlertCircle, RefreshCw, FileCode } from "lucide-react";
import { executeSystemAction, getSystemStatus } from "../services/api";

export default function SystemAgentModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("python"); // "python" | "command"
  const [pythonCode, setPythonCode] = useState(
`# Real-time System Agent - Python Automation
import time
import json

def run_automation():
    print("Executing system automation routine...")
    time.sleep(0.3)
    status = {
        "agent": "Lyx System Control",
        "action": "Smart Light & Hardware Control",
        "state": "ACTIVE 💡",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    print("Execution output:")
    print(json.dumps(status, indent=2))
    print("SUCCESS: Task completed on local machine.")

if __name__ == "__main__":
    run_automation()
`
  );
  const [customFilename, setCustomFilename] = useState("auto_task.py");
  const [shellCommand, setShellCommand] = useState("dir");
  const [outputLog, setOutputLog] = useState("");
  const [status, setStatus] = useState("idle"); // "idle" | "running" | "success" | "error"
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSystemStatus();
    }
  }, [isOpen]);

  const loadSystemStatus = async () => {
    try {
      const info = await getSystemStatus();
      setSystemInfo(info);
    } catch (err) {
      console.warn("Could not fetch system status", err);
    }
  };

  if (!isOpen) return null;

  const handleAction = async (actionType, params = {}) => {
    setStatus("running");
    setOutputLog(`[AGENT ACTION: ${actionType.toUpperCase()}] Initiating real-time system call...\n`);
    try {
      const res = await executeSystemAction(actionType, params);
      setStatus(res.success ? "success" : "error");
      
      let formattedLog = `>>> EXECUTION RESULT (Return Code: ${res.return_code ?? 0})\n`;
      if (res.file_path) {
        formattedLog += `📁 Generated Script: ${res.file_path}\n`;
      }
      formattedLog += `----------------------------------------\n${res.output || "Completed with no output."}\n`;
      setOutputLog((prev) => prev + formattedLog);
    } catch (err) {
      setStatus("error");
      setOutputLog((prev) => prev + `❌ Execution Error: ${err.message || "Failed to execute"}\n`);
    }
  };

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
          maxWidth: "700px",
          maxHeight: "88vh",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
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
                background: "#0f172a", 
                color: "#38bdf8", 
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                System Agent Control & Code Execution
              </h3>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                Real-Time Local Automation & Hardware Control
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

        {/* System Info Banner */}
        <div style={{ padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#475569" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "#059669" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              Agent Ready
            </span>
            <span>OS: <strong>{systemInfo?.os || "Windows"} {systemInfo?.release || ""}</strong></span>
            <span>Python: <strong>{systemInfo?.python_version || "3.x"}</strong></span>
          </div>
          <button onClick={loadSystemStatus} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
            <RefreshCw size={12} /> Refresh Status
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Quick Actions Grid */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569", display: "block", marginBottom: "8px", letterSpacing: "0.05em" }}>
              ⚡ Quick System & Hardware Controls
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              <button 
                onClick={() => handleAction("light_on")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Lightbulb size={18} style={{ color: "#d97706" }} />
                <span>Turn Light ON</span>
              </button>

              <button 
                onClick={() => handleAction("light_off")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Lightbulb size={18} style={{ color: "#64748b" }} />
                <span>Turn Light OFF</span>
              </button>

              <button 
                onClick={() => handleAction("open_app", { appName: "notepad" })}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  border: "1px solid #bae6fd",
                  color: "#0369a1",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <AppWindow size={18} style={{ color: "#0284c7" }} />
                <span>Open Notepad</span>
              </button>

              <button 
                onClick={() => handleAction("open_app", { appName: "calc" })}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#f3e8ff",
                  border: "1px solid #e9d5ff",
                  color: "#6b21a8",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Terminal size={18} style={{ color: "#9333ea" }} />
                <span>Open Calculator</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            <button 
              onClick={() => setActiveTab("python")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderBottom: activeTab === "python" ? "2px solid #0284c7" : "2px solid transparent",
                background: "transparent",
                color: activeTab === "python" ? "#0284c7" : "#64748b",
                fontWeight: activeTab === "python" ? "700" : "500",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FileCode size={15} /> Write & Execute Python Script
            </button>

            <button 
              onClick={() => setActiveTab("command")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderBottom: activeTab === "command" ? "2px solid #0284c7" : "2px solid transparent",
                background: "transparent",
                color: activeTab === "command" ? "#0284c7" : "#64748b",
                fontWeight: activeTab === "command" ? "700" : "500",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Terminal size={15} /> Run System Shell Command
            </button>
          </div>

          {/* Execution Form */}
          {activeTab === "python" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>Script Name</label>
                <input 
                  type="text" 
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    width: "180px",
                  }}
                />
              </div>
              <textarea 
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                rows={7}
                style={{
                  fontFamily: "'Fira Code', 'Courier New', monospace",
                  fontSize: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#0f172a",
                  color: "#f8fafc",
                  lineHeight: "1.4",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <button 
                onClick={() => handleAction("script", { code: pythonCode, filename: customFilename })}
                disabled={status === "running" || !pythonCode.trim()}
                style={{
                  alignSelf: "flex-end",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#0284c7",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
                }}
              >
                <Play size={14} /> {status === "running" ? "Running Script..." : "Run Script Live"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>Command Line Input</label>
              <input 
                type="text"
                value={shellCommand}
                onChange={(e) => setShellCommand(e.target.value)}
                placeholder="e.g. dir, python --version"
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "'Fira Code', monospace",
                  outline: "none",
                }}
              />
              <button 
                onClick={() => handleAction("command", { command: shellCommand })}
                disabled={status === "running" || !shellCommand.trim()}
                style={{
                  alignSelf: "flex-end",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#0284c7",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Play size={14} /> {status === "running" ? "Executing..." : "Execute Command"}
              </button>
            </div>
          )}

          {/* Real-time Execution Output Terminal */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                <Terminal size={13} /> Real-Time Agent Execution Console
              </label>
              {status === "success" && (
                <span style={{ fontSize: "11px", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                  <CheckCircle size={12} /> Execution Complete
                </span>
              )}
              {status === "error" && (
                <span style={{ fontSize: "11px", color: "#dc2626", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                  <AlertCircle size={12} /> Execution Failed
                </span>
              )}
            </div>
            <pre 
              style={{
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: "12px",
                padding: "14px",
                borderRadius: "8px",
                background: "#090d16",
                color: "#38bdf8",
                minHeight: "130px",
                maxHeight: "220px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                border: "1px solid #1e293b",
                margin: 0,
              }}
            >
              {outputLog || "// Console log output will appear here after triggering an action..."}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
          <span>Agent Mode: <strong>Subprocess Isolation</strong></span>
          <button onClick={onClose} style={{ padding: "6px 16px", borderRadius: "6px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", fontWeight: "600", cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
