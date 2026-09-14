# 🚀 LYX AI: Multimodal AI Voice & Workspace Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![FAISS](https://img.shields.io/badge/VectorDB-FAISS-orange.svg)](https://github.com/facebookresearch/faiss)

**LYX AI** is a next-generation, high-performance **Multimodal AI Voice & Workspace Assistant**. It combines real-time voice synthesis and speech recognition with an advanced retrieval-augmented generation (RAG) engine capable of ingesting documents, spreadsheets, images, code repositories, and full-length video files with timestamped citations.

---

## ✨ Key Features

### 🎙️ Real-time Voice & Audio Interaction
- **Speech-to-Text (STT)**: High-speed local transcription powered by `faster-whisper` (support for English, Tamil, and multi-lingual voice inputs).
- **Text-to-Speech (TTS)**: Natural Neural voice generation using `edge-tts` with real-time waveform visualization (`ta-IN-PallaviNeural`, `ta-IN-ValluvarNeural`, `en-US-AriaNeural`).
- **Interactive Audio Visualizer**: 3D Shader toy, Aura Orb, and real-time live caption streaming.

### 📚 Multimodal RAG Ingestion Pipeline
- **Documents**: Deep parsing for `.pdf`, `.docx`, `.txt`, and `.md` with smart semantic chunking.
- **Spreadsheets**: Row-by-row indexing across all sheets for `.xlsx`, `.xls`, and `.csv`.
- **Images**: Hybrid OCR (Tesseract for English & Tamil) + Vision LLM processing for `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`.
- **Video Processing**: Native `.mp4`, `.mov`, `.avi`, `.mkv`, and `.webm` ingestion. 
  - Extracts audio tracks for timestamped Whisper transcription.
  - Samples video frames via `PySceneDetect` scene detection + OCR/Vision analysis.
  - Generates 30-second windowed chunks with timestamp-aware answer citations (e.g., *"around the 2-minute mark..."*).

### 🔌 Enterprise Data Connectors
- **GitHub Connector**: Connect and query GitHub repositories directly within conversations.
- **PostgreSQL Connector**: Execute natural language queries and analyze database schemas.
- **Web Ingestion**: Direct link scraping and content indexing.

### 💻 System Agent & Workspace Automation
- Execute workspace commands and inspection scripts safely.
- Manage interactive tasks, conversations, and custom persona prompts.

### 🧠 Advanced Memory & QA Engine
- Multi-turn conversation history tracking.
- Predefined fallback Q&A matching bank backed by FAISS vector similarity (`sentence-transformers/all-MiniLM-L6-v2`).
- Configurable model backend powered by Groq (`llama-3.3-70b-versatile`, `llama-3.2-11b-vision-preview`), LiteLLM, or Ollama.

---

## 🛠️ Architecture & Tech Stack

```
                     ┌─────────────────────────────────────────┐
                     │            React 18 + Vite              │
                     │  (Tailwind CSS, Shader Visualizer UI)   │
                     └────────────────────┬────────────────────┘
                                          │ REST / Audio Stream
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │             FastAPI Backend             │
                     └──────┬──────────────┬─────────────┬─────┘
                            │              │             │
        ┌───────────────────┴───┐   ┌──────┴──────┐  ┌───┴───────────────────┐
        │   Voice Engine        │   │  RAG Engine │  │    LLM & Services     │
        ├───────────────────────┤   ├─────────────┤  ├───────────────────────┤
        │ • faster-whisper (STT)│   │ • FAISS     │  │ • Groq (Llama 3.3/3.2)│
        │ • edge-tts (TTS)      │   │ • MiniLM-L6 │  │ • Tesseract OCR       │
        │ • Audio Waveforms     │   │ • PyScene   │  │ • FFmpeg Video Trans. │
        └───────────────────────┘   └─────────────┘  └───────────────────────┘
```

---

## 📋 Prerequisites

Before running LYX AI, ensure the following system dependencies are installed:

1. **Python 3.10+**
2. **Node.js 18+** & `npm`
3. **FFmpeg & FFprobe**: Required for audio extraction and video frame sampling.
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Install via [Gyan.dev FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/) and add `bin` to System PATH.
4. **Tesseract OCR**: Required for text extraction from images and video frames.
   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr tesseract-ocr-tam`
   - **macOS**: `brew install tesseract tesseract-lang`
   - **Windows**: Install from [UB-Mannheim Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki) and add to PATH.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/ajaishanth-sg/LYX-AI.git
cd LYX-AI
```

### 2. Backend Setup (FastAPI)
```bash
# Create virtual environment
python -m venv .venv

# Activate environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from environment variables guide
cp .env.example .env   # Or create .env manually
```

Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup (React + Vite)
Open a new terminal window:
```bash
cd frontend-react

# Install dependencies
npm install

# Start development server
npm run dev
```
Access the application at: [http://localhost:5173](http://localhost:5173)

---

## 📂 Project Structure

```
LYX-AI/
├── app/                        # FastAPI Application Core
│   ├── main.py                 # Application entrypoint & routes mounting
│   ├── config.py               # Global configuration & environment settings
│   ├── routes/                 # API Endpoint routes
│   │   ├── ask.py              # Voice/Audio question handling
│   │   ├── conversation.py     # Multi-turn RAG chat API
│   │   ├── documents.py        # Document & video ingestion endpoints
│   │   ├── connectors.py       # GitHub, DB, Web connectors
│   │   ├── system_agent.py     # System control and execution agent
│   │   ├── settings.py         # App & Model settings
│   │   └── qa_bank.py          # Predefined Q&A bank endpoints
│   ├── services/               # Core Business Logic & Pipelines
│   │   ├── stt_service.py      # Speech-to-Text (faster-whisper)
│   │   ├── tts_service.py      # Text-to-Speech (edge-tts)
│   │   ├── document_parser.py  # Multi-format document parser
│   │   ├── document_store.py   # RAG Indexer & Vector Store wrapper
│   │   ├── video_service.py    # FFmpeg + PySceneDetect video ingest
│   │   ├── llm_service.py      # Groq / LiteLLM integration
│   │   ├── matcher_service.py  # Cosine similarity matcher
│   │   └── connectors_manager.py
│   └── models/                 # Pydantic Schemas & Data Models
├── frontend-react/             # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Modals, Audio Waveforms, Chat & Visualizers
│   │   ├── contexts/           # React State Contexts
│   │   ├── services/           # Frontend API Clients
│   │   └── App.jsx             # Main Application Shell
├── media/                      # Generated Audio Storage
├── requirements.txt            # Python Dependencies
├── README.md                   # Project Documentation
└── .gitignore                  # Git Ignore Rules
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# LLM Provider Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Database Configuration (Optional for connectors)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lyxai

# Binary Path Overrides (Optional if ffmpeg / tesseract are in PATH)
FFMPEG_CMD=ffmpeg
FFPROBE_CMD=ffprobe

# Voice & STT Settings
STT_MODEL_SIZE=small
TTS_VOICE=ta-IN-PallaviNeural
```

---

## 📡 API Reference Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/health` | `GET` | Health check & feature availability (FFmpeg, Q&A count) |
| `/api/v1/ask` | `POST` | Process voice/audio input and return matched response + audio output |
| `/api/v1/conversation/chat` | `POST` | Interactive multi-turn RAG chat with streaming & voice support |
| `/api/v1/documents/upload` | `POST` | Upload & index documents (PDF, DOCX, XLSX, Images, Videos) |
| `/api/v1/connectors` | `GET/POST` | Manage and sync third-party data connectors |
| `/api/v1/system-agent` | `POST` | Invoke workspace actions and system commands |
| `/api/v1/settings` | `GET/POST` | Get/Set AI models, voice parameters, and API keys |

---

## 🔧 Troubleshooting

| Issue | Resolution |
|---|---|
| **`ffmpeg` binary missing** | Ensure `ffmpeg` and `ffprobe` are installed on PATH, or specify `FFMPEG_CMD` in `.env`. Verify via `/api/v1/health`. |
| **OCR failure on Tamil text** | Install Tamil language pack for Tesseract (`tesseract-ocr-tam`). |
| **First request latency** | Local Whisper and sentence-transformer models download automatically on first run. |
| **Audio playback issues** | Grant microphone permissions in your web browser for `http://localhost:5173`. |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
