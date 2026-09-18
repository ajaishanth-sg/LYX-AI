import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../index.css";
import { BrainCircuit, Cpu } from "lucide-react";
import { useWeather } from "../hooks/useWeather";

// ── Icons ──────────────────────────────────────────────────────────
const IconGlobe = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconPaperclip = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconVoiceWave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="1" y="8" width="2" height="8" rx="1"/>
    <rect x="5" y="5" width="2" height="14" rx="1"/>
    <rect x="9" y="3" width="2" height="18" rx="1"/>
    <rect x="13" y="5" width="2" height="14" rx="1"/>
    <rect x="17" y="8" width="2" height="8" rx="1"/>
    <rect x="21" y="10" width="2" height="4" rx="1"/>
  </svg>
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconArrowDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconChat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-1.35"/>
  </svg>
);
const IconThumbsUp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);
const IconThumbsDown = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
  </svg>
);

const IconList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconImage = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconPlan = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IconText = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconWrite = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IconIdea = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.53.64 2.88 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
  </svg>
);

// Quick-action chips data
const QUICK_ACTIONS = [
  { icon: <IconImage />, label: "Create image" },
  { icon: <IconPlan />, label: "Make a plan" },
  { icon: <IconText />, label: "Summarize text" },
  { icon: <IconWrite />, label: "Help me write" },
  { icon: <IconIdea />, label: "Brainstorm" },
];

// Recent chats (sample — shown on home screen)
const RECENT_CHATS = [
  { id: 1, title: "Poem of the past", ago: "23 hours ago" },
  { id: 2, title: "Assistance request", ago: "2 days ago" },
  { id: 3, title: "Analytica Ideas", ago: "3 weeks ago" },
];

// Weather icon based on wttr.in code
function WeatherIcon({ code, size = 36 }) {
  const s = size;
  // Sunny / Clear
  if ([113].includes(code))
    return (
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="14" fill="#FCD34D"/>
        {[0,45,90,135,180,225,270,315].map((deg, i) => (
          <line key={i}
            x1={32 + 18*Math.cos(deg*Math.PI/180)}
            y1={32 + 18*Math.sin(deg*Math.PI/180)}
            x2={32 + 24*Math.cos(deg*Math.PI/180)}
            y2={32 + 24*Math.sin(deg*Math.PI/180)}
            stroke="#FCD34D" strokeWidth="3" strokeLinecap="round"/>
        ))}
      </svg>
    );
  // Partly cloudy
  if ([116,119].includes(code))
    return (
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
        <circle cx="26" cy="28" r="10" fill="#FCD34D"/>
        <ellipse cx="36" cy="38" rx="16" ry="10" fill="#E2E8F0"/>
        <ellipse cx="24" cy="40" rx="12" ry="8" fill="#F1F5F9"/>
      </svg>
    );
  // Rain
  if ([176,185,263,266,281,284,293,296,299,302,305,308,311,314,317,320,353,356,359].includes(code))
    return (
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="26" rx="20" ry="12" fill="#94A3B8"/>
        {[20,32,44].map((x,i) => (
          <line key={i} x1={x} y1="42" x2={x-4} y2="52" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round"/>
        ))}
      </svg>
    );
  // Default cloud
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="32" rx="22" ry="14" fill="#CBD5E1"/>
    </svg>
  );
}

// ── Strawhat Icon ──────────────────────────────────────────────────
function StrawhatIcon({ size = 24, spinning = false }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ 
        animation: spinning ? "strawhat-roll 2s linear infinite" : "none",
        color: "var(--accent-primary, #10a37f)"
      }}
    >
      <path d="M3 15c0 2.2 4 4 9 4s9-1.8 9-4" />
      <path d="M3 15c0-1.5 2.5-2.8 6-3.5" />
      <path d="M21 15c0-1.5-2.5-2.8-6-3.5" />
      <path d="M6 11.5a7 7 0 0 1 12 0" />
      <path d="M6 11.5c2 1 5 1.5 6 1.5s4-.5 6-1.5" />
      <path d="M9 7l2 2m0-2l-2 2" />
      <path d="M14 7l2 2m0-2l-2 2" />
      <path d="M5 14l2 2m0-2l-2 2" />
      <path d="M18 14l2 2m0-2l-2 2" />
    </svg>
  );
}

// Greeting based on time of day
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

// ── Weather Widget ─────────────────────────────────────────────────
function WeatherWidget({ weather, loading }) {
  if (loading) return (
    <div className="weather-card weather-card--loading">
      <div className="weather-skeleton" />
    </div>
  );
  if (!weather) return null;

  return (
    <div className="weather-card">
      <div className="weather-top">
        <div>
          <div className="weather-city">
            {weather.city}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:4,opacity:0.6}}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div className="weather-temp">{weather.tempC}°C</div>
        </div>
        <div className="weather-right">
          <WeatherIcon code={weather.code} size={44} />
          <div className="weather-desc">{weather.desc}</div>
          <div className="weather-hl">H:{weather.highC}° L:{weather.lowC}°</div>
        </div>
      </div>
    </div>
  );
}

// ── Model Dropdown ─────────────────────────────────────────────────
function ModelDropdown({ open, onToggle, dropdownRef, models, activeModelId, onSelectModel, homeStyle }) {
  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  const displayName = activeModel ? activeModel.name : "Select a model";

  return (
    <div className="home-model-selector" ref={dropdownRef}>
      <button className="home-model-btn" onClick={onToggle}>
        <span>{displayName}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
          <IconChevronDown />
        </span>
      </button>
      {open && (
        <div className={`home-model-dropdown ${!homeStyle ? "home-model-dropdown-up" : ""}`}>
          {models.map(m => (
            <div 
              key={m.id} 
              className={`chat-model-option ${m.id === activeModelId ? "chat-model-option--active" : ""}`}
              onClick={() => {
                onSelectModel(m.id);
                onToggle();
              }}
            >
              <div className="chat-model-option-name">
                <BrainCircuit size={15} />
                <span>{m.name}</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>({m.provider})</span>
              </div>
              {m.id === activeModelId && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10a37f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          ))}
          {models.length === 0 && (
            <div className="chat-model-option" style={{ color: "var(--text-muted)" }}>
              <div className="chat-model-option-name">
                <span>No models found. Add one in Settings.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Input box (shared between home + chat state) ──────────────
const InputBox = ({ 
  homeStyle = false,
  errorMessage,
  textareaRef,
  inputValue,
  handleInput,
  handleKeyDown,
  handleSend,
  isSending,
  modelDropdownOpen,
  setModelDropdownOpen,
  dropdownRef,
  onVoiceMode,
  models,
  activeModelId,
  onSelectModel
}) => (
  <div className={homeStyle ? "home-input-wrap" : "chat-input-wrap"}>
    {errorMessage && <p className="chat-error-msg">{errorMessage}</p>}

    <div className={homeStyle ? "home-input-box" : "chat-input-box"}>
      {/* Top: textarea */}
      <div className="home-input-top">
        <textarea
          ref={textareaRef}
          className={homeStyle ? "home-textarea" : "chat-textarea"}
          placeholder="Ask Kawaii AI…"
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
        />
      </div>

      {/* Bottom row: model left | icons right */}
      <div className="home-input-bottom-row">
        <ModelDropdown
          open={modelDropdownOpen}
          onToggle={() => setModelDropdownOpen(o => !o)}
          dropdownRef={dropdownRef}
          models={models}
          activeModelId={activeModelId}
          onSelectModel={onSelectModel}
          homeStyle={homeStyle}
        />
        <div className="home-input-icons">
          <button
            className="chat-input-icon-btn"
            onClick={() => document.getElementById("global-file-upload")?.click()}
            title="Attach file"
          >
            <IconPaperclip />
          </button>
          <button className="chat-input-icon-btn" title="Browse web">
            <IconGlobe />
          </button>
          <button
            className="home-voice-btn"
            title="Switch to voice mode"
            onClick={onVoiceMode}
          >
            <IconVoiceWave />
          </button>
          <button
            className={`home-send-arrow ${inputValue.trim() ? "home-send-arrow--active" : ""}`}
            style={{ marginLeft: 8 }}
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isSending}
            title="Send"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>

    {homeStyle && (
      <p className="chat-disclaimer">Kawaii can make mistakes. Check important information.</p>
    )}
  </div>
);

// Fix Leaflet default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map View Component
const MapPreview = ({ data }) => {
  if (!data || !data.center) return null;
  const { center, places } = data;
  
  return (
    <div className="map-preview-container">
      <div className="map-preview-header">
        <span className="map-preview-title">Map Locations Found</span>
      </div>
      <div className="map-wrapper">
        <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "300px", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles-dark"
          />
          {places && places.map((place, i) => (
            <Marker key={i} position={[place.lat, place.lon]}>
              <Popup>
                <strong>{place.name}</strong><br/>
                {place.display_name}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="map-cards-row">
        {places && places.map((place, i) => (
          <div key={i} className="map-place-card">
            <div className="map-place-card-title">{place.name}</div>
            <div className="map-place-card-type">{place.type || 'Location'}</div>
            <div className="map-place-card-rating">★ 4.5</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function ChatMode({ messages, isSending, errorMessage, onSend, onVoiceMode, activeModelId, onSelectModel }) {
  const [inputValue, setInputValue] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [featureCardVisible, setFeatureCardVisible] = useState(true);
  const [models, setModels] = useState([]);
  const [activeSources, setActiveSources] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef  = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  const { weather, loading: weatherLoading } = useWeather();

  useEffect(() => {
    const load = () => {
      import("../services/api").then(({ getModels }) => {
        getModels().then(data => {
          if (data) setModels(data);
          if (data && data.length > 0 && !activeModelId) {
            onSelectModel(data[0].id);
          }
        }).catch(console.error);
      });
    };
    load();
    window.addEventListener("models-updated", load);
    return () => window.removeEventListener("models-updated", load);
  }, [activeModelId, onSelectModel]);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setModelDropdownOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const handleSend = (text) => {
    const trimmed = (text ?? inputValue).trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const [feedback, setFeedback] = useState({});
  
  const handleRegenerate = (idx) => {
    let userMsg = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMsg = messages[i].content;
        break;
      }
    }
    if (userMsg && !isSending) {
      onSend(userMsg);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (idx, type) => {
    setFeedback(prev => ({ ...prev, [idx]: type }));
  };

  // ── HOME / EMPTY STATE ────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="home-shell">
        {/* Greeting */}
        <div className="home-greeting-block">
          <h1 className="home-greeting-title">{getGreeting()}, User</h1>
          <p className="home-greeting-sub">How can I help you?</p>
        </div>

        {/* Input */}
        <InputBox 
          homeStyle={true} 
          errorMessage={errorMessage}
          textareaRef={textareaRef}
          inputValue={inputValue}
          handleInput={handleInput}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          isSending={isSending}
          modelDropdownOpen={modelDropdownOpen}
          setModelDropdownOpen={setModelDropdownOpen}
          dropdownRef={dropdownRef}
          onVoiceMode={onVoiceMode}
          models={models}
          activeModelId={activeModelId}
          onSelectModel={onSelectModel}
        />

        {/* Quick actions */}
        <div className="home-quick-actions">
          {QUICK_ACTIONS.map(qa => (
            <button
              key={qa.label}
              className="home-quick-chip"
              onClick={() => handleSend(qa.label)}
            >
              <span>{qa.icon}</span>
              <span>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Weather + Feature card row */}
        <div className="home-cards-row">
          <WeatherWidget weather={weather} loading={weatherLoading} />

          {featureCardVisible && (
            <div className="home-feature-card">
              <button className="home-feature-close" onClick={() => setFeatureCardVisible(false)}>
                <IconX />
              </button>
              <div className="home-feature-badge">✦ New</div>
              <div className="home-feature-title">Context-Aware Chat</div>
              <p className="home-feature-desc">
                Your AI remembers past interactions to provide more relevant and personalized responses.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }



  // ── CHAT STATE ────────────────────────────────────────────────
  return (
    <div className="chat-with-sources">
      <div className="chat-shell">
      <div ref={scrollRef} className="chat-messages-scroll">
        <div className="chat-messages-inner">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message-row ${msg.role === "user" ? "chat-message-row--user" : "chat-message-row--assistant"}`}
            >
              {msg.role === "assistant" && (
                <div className="chat-avatar" style={{ background: "transparent", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <StrawhatIcon size={20} spinning={isSending && idx === messages.length - 1} />
                </div>
              )}
              {msg.role === "user" ? (
                <div className="chat-bubble chat-bubble--user">
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                </div>
              ) : (
                <div className="chat-assistant-wrapper">
                  <div className="chat-bubble chat-bubble--assistant">
                    {msg.mapData && <MapPreview data={msg.mapData} />}
                    {msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="markdown-table-wrapper">
                              <table className="markdown-table" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => <thead className="markdown-thead" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="markdown-tbody" {...props} />,
                          tr: ({node, ...props}) => <tr className="markdown-tr" {...props} />,
                          th: ({node, ...props}) => <th className="markdown-th" {...props} />,
                          td: ({node, ...props}) => <td className="markdown-td" {...props} />,
                          a: ({node, ...props}) => {
                            if (props.href && props.href.startsWith("citation:")) {
                              const parts = props.href.split(":");
                              const source = parts[1];
                              const url = props.href.substring(props.href.indexOf(":", 9) + 1);
                              
                              let logoUrl = "";
                              if (source === "github") logoUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
                              else if (source === "notion") logoUrl = "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png";
                              else if (source === "jira") logoUrl = "https://cdn.iconscout.com/icon/free/png-256/free-jira-3628779-3030141.png";
                              
                              return (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="citation-badge">
                                  {logoUrl && <img src={logoUrl} alt={source} className="citation-logo" />}
                                  {props.children}
                                </a>
                              );
                            }
                            
                            // Check for YouTube links
                            const ytMatch = props.href && props.href.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            if (ytMatch) {
                              const videoId = ytMatch[1];
                              return (
                                <span className="youtube-embed-wrapper" style={{ display: "block", marginTop: "16px", marginBottom: "16px", maxWidth: "480px" }}>
                                  <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", border: "1px solid var(--border)", display: "block" }}
                                  ></iframe>
                                  <span style={{ display: "block", marginTop: "8px", fontSize: "13px" }}>
                                    <a href={props.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                      Watch on YouTube 
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                      </svg>
                                    </a>
                                  </span>
                                </span>
                              );
                            }

                            return <a {...props} className="markdown-link" target="_blank" rel="noopener noreferrer" />;
                          },
                          strong: ({node, ...props}) => <strong className="markdown-bold" {...props} />,
                          em: ({node, ...props}) => <em className="markdown-italic" {...props} />,
                          h1: ({node, ...props}) => <h1 className="markdown-h1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="markdown-h2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="markdown-h3" {...props} />,
                          p: ({node, ...props}) => <p className="markdown-p" {...props} />,
                          ul: ({node, ...props}) => <ul className="markdown-ul" {...props} />,
                          ol: ({node, ...props}) => <ol className="markdown-ol" {...props} />,
                          li: ({node, ...props}) => <li className="markdown-li" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="markdown-blockquote" {...props} />,
                          pre: ({node, ...props}) => <pre className="markdown-code-block" {...props} />,
                          code: ({node, className, ...props}) => (
                            <code className={className || "markdown-code-inline"} {...props} />
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="chat-typing" style={{ padding: "8px 0" }}>
                        {[0, 150, 300].map((d, i) => (
                          <div key={i} className="chat-typing-dot" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-message-sources">
                      <button 
                        className="sources-toggle-btn"
                        onClick={() => {
                          setActiveSources(msg.sources);
                          setSidebarOpen(true);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}>
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        All Sources
                      </button>
                    </div>
                  )}
                  {msg.content && (
                    <div className="chat-message-actions">
                      <button className="chat-action-btn" title="Copy" onClick={() => handleCopy(msg.content)}><IconCopy /></button>
                      <button className="chat-action-btn" title="Regenerate" onClick={() => handleRegenerate(idx)} disabled={isSending}><IconRefresh /></button>
                      <button className={`chat-action-btn ${feedback[idx] === 'up' ? 'active-feedback' : ''}`} title="Good response" onClick={() => handleFeedback(idx, 'up')} style={{ color: feedback[idx] === 'up' ? 'var(--accent-primary, #10a37f)' : '' }}><IconThumbsUp /></button>
                      <button className={`chat-action-btn ${feedback[idx] === 'down' ? 'active-feedback' : ''}`} title="Bad response" onClick={() => handleFeedback(idx, 'down')} style={{ color: feedback[idx] === 'down' ? '#ef4444' : '' }}><IconThumbsDown /></button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      </div>


      {/* Pinned input */}
      <div className="chat-input-pinned">
        <InputBox 
          homeStyle={false} 
          errorMessage={errorMessage}
          textareaRef={textareaRef}
          inputValue={inputValue}
          handleInput={handleInput}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          isSending={isSending}
          modelDropdownOpen={modelDropdownOpen}
          setModelDropdownOpen={setModelDropdownOpen}
          dropdownRef={dropdownRef}
          onVoiceMode={onVoiceMode}
          models={models}
          activeModelId={activeModelId}
          onSelectModel={onSelectModel}
        />
      </div>

      <style>{`
        @keyframes chatTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes strawhat-roll {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>

    {/* Sources Sidebar Panel */}
    {sidebarOpen && activeSources && (
      <div className="sources-sidebar">
        <div className="sources-sidebar-header">
          <div className="sources-sidebar-title">
            <IconList />
            <span>All Sources</span>
          </div>
          <button
            className="sources-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            title="Close"
          >
            <IconX />
          </button>
        </div>
        <div className="sources-sidebar-list">
          {activeSources.map((src, i) => {
            const isWebSource = !!src.url;
            let domain = "";
            let faviconUrl = "";
            if (isWebSource) {
              try {
                const u = new URL(src.url);
                domain = u.hostname.replace("www.", "");
                faviconUrl = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
              } catch (_) {}
            }

            const inner = (
              <>
                <div className="sources-sidebar-item-icon">
                  {isWebSource && faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt={domain}
                      width="20"
                      height="20"
                      style={{ borderRadius: 4, objectFit: "contain" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  )}
                </div>
                <div className="sources-sidebar-item-content">
                  <div className="sources-sidebar-item-title">
                    {src.doc_name || `Source ${i + 1}`}
                  </div>
                  {isWebSource && (
                    <div className="sources-sidebar-item-domain">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0}}>
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      {domain}
                      <span className="sources-verified-badge">✓ Verified</span>
                    </div>
                  )}
                  <div className="sources-sidebar-item-text">
                    {src.text?.slice(0, 140)}{src.text?.length > 140 ? "…" : ""}
                  </div>
                </div>
                {isWebSource && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, opacity:0.4, marginTop:2}}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                )}
              </>
            );

            return isWebSource ? (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sources-sidebar-item sources-sidebar-item--link"
              >
                {inner}
              </a>
            ) : (
              <div key={i} className="sources-sidebar-item">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
  );
}
