import React, { useState, useEffect } from 'react';
import { API_BASE } from '../services/api';
import * as XLSX from 'xlsx';

const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function FilePreviewModal({ doc, onClose }) {
  const [excelData, setExcelData] = useState(null);
  const [excelError, setExcelError] = useState(false);

  useEffect(() => {
    if (!doc) return;
    const isExcel = doc.name.toLowerCase().match(/\.(xls|xlsx|csv)$/i);
    if (isExcel) {
      setExcelData(null);
      setExcelError(false);
      const rawUrl = `${API_BASE}/api/v1/documents/${doc.doc_id}/raw`;
      fetch(rawUrl)
        .then(res => { if (!res.ok) throw new Error("Fetch failed"); return res.arrayBuffer(); })
        .then(buffer => {
          const wb = XLSX.read(buffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          setExcelData(data);
        })
        .catch(err => {
          console.error("Excel parse error", err);
          setExcelError(true);
        });
    }
  }, [doc]);

  if (!doc) return null;

  const rawUrl = `${API_BASE}/api/v1/documents/${doc.doc_id}/raw`;
  const isImage = doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = doc.name.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/i);
  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
  const isExcel = doc.name.toLowerCase().match(/\.(xls|xlsx|csv)$/i);
  const isText = doc.name.toLowerCase().match(/\.(txt|md)$/i);

  return (
    <div className="file-preview-overlay" onClick={onClose}>
      <div className="file-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="file-preview-header">
          <h3 className="file-preview-title">{doc.name}</h3>
          <button className="file-preview-close" onClick={onClose} title="Close">
            <IconX />
          </button>
        </div>
        <div className="file-preview-content">
          {isImage ? (
            <img src={rawUrl} alt={doc.name} className="file-preview-media" />
          ) : isVideo ? (
            <video src={rawUrl} controls autoPlay className="file-preview-media" />
          ) : isPdf || isText ? (
            <iframe src={rawUrl} className="file-preview-iframe" title={doc.name} />
          ) : isExcel ? (
            <div className="file-preview-table-container">
              {excelData ? (
                <table className="file-preview-table">
                  <thead>
                    <tr>
                      {excelData[0]?.map((col, i) => <th key={i}>{col !== undefined && col !== null ? String(col) : ""}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {excelData[0]?.map((_, colIndex) => (
                          <td key={colIndex}>{row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : excelError ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-primary)" }}>
                  Failed to load spreadsheet.
                </div>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading spreadsheet...
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-primary)" }}>
              <p style={{ marginBottom: "16px", fontSize: "16px" }}>Preview is not available for this file type.</p>
              <a 
                href={rawUrl} 
                download={doc.name} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600"
                }}
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
