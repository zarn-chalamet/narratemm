# 🎬 NarrateMM

<div align="center">

**AI-Powered Burmese Video Recap Generator**

Transform any video into engaging recap content with AI-generated Burmese scripts, natural voice-overs, and perfectly rendered Myanmar subtitles.

![Status](https://img.shields.io/badge/status-in--development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Java](https://img.shields.io/badge/Java-17+-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen)
![React](https://img.shields.io/badge/React-18-61dafb)

</div>

---

## ✨ Features

- 🎥 **Multi-Source Input** — Upload local videos (MP4, MOV, AVI) or paste YouTube URLs
- 🎙️ **AI Transcription** — Automatic speech-to-text powered by Groq Whisper Large v3
- ✍️ **AI Script Generation** — Smart recap scripts in Burmese, English, or bilingual (Gemini AI)
- 🎭 **4 Script Styles** — Dramatic, Casual, Spoiler-free, or Hype mode
- 🗣️ **Natural Voice-Over** — High-quality TTS via local Edge TTS microservice (no API delays!)
- 📝 **Perfect Burmese Subtitles** — Custom Java AWT rendering engine (no broken characters!)
- 🎨 **Visual Editor** — Drag-and-drop logo positioning, custom subtitle styling, color pickers
- 📐 **Multi-Format Export** — 9:16 (TikTok/Reels), 4:5 (Instagram), 1:1 (Square), 16:9 (YouTube)
- 🎚️ **Audio Mixing** — Balance original audio with voice-over (0-100%)
- ⏱️ **Auto-Sync** — Voiceover tempo adjustment to match video duration

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Spring Boot 3** | REST API framework |
| **Java 17+** | Core language |
| **Spring Security + JWT** | Authentication & authorization |
| **Spring Data JPA** | Database ORM |
| **H2 Database** | Embedded data persistence |
| **Lombok** | Boilerplate reduction |
| **WebClient** | Reactive HTTP client for external APIs |
| **Java AWT / Graphics2D** | Burmese subtitle rendering (replaces libass) |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **Zustand** | State management |
| **React Router** | Navigation |
| **Axios** | HTTP client |
| **Lucide React** | Icon library |

### AI & External Services
| Service | Purpose |
|---------|---------|
| **Groq Whisper Large v3** | Audio transcription (Burmese support) |
| **Google Gemini AI** | Script generation |
| **Supadata API** | YouTube transcript extraction |

### Voice-Over (Local Microservice)
| Technology | Purpose |
|------------|---------|
| **Python 3** | Microservice runtime |
| **edge-tts** | Microsoft Edge TTS engine (free, offline-capable) |
| **Flask / FastAPI** | HTTP server for TTS microservice |

> **Why local Edge TTS instead of cloud TTS APIs?**  
> Cloud TTS APIs (Google, AWS Polly, etc.) introduce **2–8 second delays** per request and occasional timeout errors. Running Edge TTS locally gives **instant response** with no rate limits or API costs.

### Media Processing
| Tool | Purpose |
|------|---------|
| **FFmpeg** | Video encoding, audio mixing, frame composition |
| **FFprobe** | Media duration & metadata analysis |
| **yt-dlp** | YouTube video downloading |
| **Padauk Font (SIL)** | Burmese Unicode rendering |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│  (Step Wizard: Upload → Transcribe → Script → Voice → Edit) │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (JWT)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐     │
│  │ Transcript │  │   Script   │  │   Export Pipeline  │     │
│  │  Service   │  │  Service   │  │                    │     │
│  └─────┬──────┘  └─────┬──────┘  └─────────┬──────────┘     │
└────────┼───────────────┼─────────────────────┼──────────────┘
         │               │                     │
         ▼               ▼                     ▼
   ┌──────────┐   ┌────────────┐    ┌──────────────────┐
   │   Groq   │   │   Gemini   │    │  Java AWT (PNG)  │
   │ Whisper  │   │     AI     │    │  + FFmpeg        │
   └──────────┘   └────────────┘    └──────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Edge TTS       │
                                    │  Microservice   │
                                    │  (Python:5005)  │
                                    └─────────────────┘
```

---

## 🔥 Key Technical Challenges Solved

### 1. **Burmese Subtitle Rendering**
FFmpeg's built-in `libass` library cannot properly shape Myanmar script (Burmese characters appear broken or out of order).

**Solution:** Built a custom subtitle renderer using **Java AWT Graphics2D** that:
- Uses the JDK's text engine with HarfBuzz support
- Renders each subtitle as a transparent PNG
- Overlays PNGs on video via FFmpeg with time-based enable filters

### 2. **Voice-Over Generation Speed**
Cloud TTS APIs introduce 2–8 second delays per request with occasional failures under load.

**Solution:** Built a local **Python microservice** using `edge-tts` (Microsoft Edge's TTS engine) that:
- Runs entirely on localhost — zero network latency
- Supports 4 high-quality voices (Aoede, Puck, Charon, Kore mapped to Edge TTS voices)
- Handles style prompts and speed adjustment
- Returns audio as MP3 stream instantly

### 3. **Voice-Over Sync**
TTS-generated voice often doesn't match video duration.

**Solution:** Dynamic tempo adjustment using FFmpeg's `atempo` filter with chained filter graphs for extreme ratios (0.25x - 4.0x).

### 4. **Burmese Text Wrapping**
Default text wrapping breaks Burmese words at incorrect points.

**Solution:** Custom `LineBreakMeasurer` implementation with Myanmar-specific punctuation handling (၊ ။).

---

## 🚀 Getting Started

### Prerequisites

- **Java 17** or higher
- **Node.js 18+** and npm
- **Maven 3.8+**
- **FFmpeg** and **FFprobe**
- **yt-dlp**
- **Python 3.8+** (for Edge TTS microservice)

### 1. Clone the Repository

```bash
git clone https://github.com/zarn-chalamet/narratemm.git
cd narratemm
```

### 2. Edge TTS Microservice Setup ⭐

This microservice **must be running** before generating voice-overs.

```bash
cd edge-tts-service
pip install -r requirements.txt
python server.py
```

TTS service will start on `http://localhost:5005`

#### `requirements.txt`
```
edge-tts
flask        # or fastapi + uvicorn
```

#### How it works
The Spring Boot backend calls the microservice via HTTP:
```
POST http://localhost:5005/generate
{
  "text": "...",
  "voice": "Aoede",
  "speed": 1.0
}
→ Returns: audio/mpeg stream
```

> **Note:** Keep this service running in a separate terminal while using NarrateMM.

### 3. Backend Setup

```bash
cd narratemm-backend
mvn clean install
```

#### Required `application.properties` configuration:

```properties
# API Keys
app.api.groq-key=YOUR_GROQ_API_KEY
app.api.gemini-key=YOUR_GEMINI_API_KEY
app.api.supadata-key=YOUR_SUPADATA_API_KEY

# Tool Paths (Windows example)
app.tools.ffmpeg-path=C:/path/to/ffmpeg.exe
app.tools.ffprobe-path=C:/path/to/ffprobe.exe
app.tools.yt-dlp-path=C:/path/to/yt-dlp.exe
app.tools.fonts-dir=C:/path/to/fonts

# Edge TTS Microservice
app.tts.edge-url=http://localhost:5005
```

#### Download Required Fonts

Place these in your `tools/fonts/` directory:
- **Padauk-Regular.ttf** — [Download](https://software.sil.org/padauk/)
- **Pyidaungsu-Regular.ttf** — [Download](https://www.unicode.org.mm/)
- **NotoSerifMyanmar-Regular.ttf** — [Download](https://fonts.google.com/noto/specimen/Noto+Serif+Myanmar)

#### Run Backend

```bash
mvn spring-boot:run
```

Backend will start on `http://localhost:8080`

### 4. Frontend Setup

```bash
cd narratemm-frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

### 5. Start Order Summary

```bash
# Terminal 1 - Edge TTS Microservice (start first!)
cd edge-tts-service && python server.py

# Terminal 2 - Spring Boot Backend
cd narratemm-backend && mvn spring-boot:run

# Terminal 3 - React Frontend
cd narratemm-frontend && npm run dev
```

---

## 📁 Project Structure

```
narratemm/
├── narratemm-backend/              # Spring Boot backend
│   ├── src/main/java/com/narratemm/
│   │   ├── controller/             # REST endpoints
│   │   ├── service/                # Business logic
│   │   │   ├── ExportService.java
│   │   │   ├── SubtitleRendererService.java   # ⭐ Burmese rendering
│   │   │   ├── GroqService.java
│   │   │   ├── GeminiService.java
│   │   │   ├── EdgeTTSService.java            # ⭐ Calls Python microservice
│   │   │   └── ...
│   │   ├── entity/                 # JPA entities
│   │   ├── repository/             # Data access
│   │   ├── dto/                    # Data transfer objects
│   │   └── config/                 # Spring configuration
│   └── tools/
│       ├── ffmpeg.exe
│       ├── yt-dlp.exe
│       └── fonts/                  # Burmese fonts
│
├── narratemm-frontend/             # React frontend
│   ├── src/
│   │   ├── pages/                  # Route components
│   │   │   ├── ProjectPage.tsx     # ⭐ Main workflow
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ...
│   │   ├── components/             # Reusable UI
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API clients
│   │   ├── store/                  # Zustand stores
│   │   └── utils/
│   └── public/
│
└── edge-tts-service/               # ⭐ Python TTS microservice
    ├── server.py                   # Flask/FastAPI server
    ├── requirements.txt
    └── README.md
```

---

## 🎯 Workflow

NarrateMM uses a **6-step wizard**:

1. **📤 Upload** — Drop video file or paste YouTube URL
2. **📝 Transcribe** — Auto-transcribe with Whisper (or extract from YouTube)
3. **✨ Script** — Generate AI recap script (4 styles, 3 languages)
4. **🎙️ Voice-Over** — Generate natural TTS narration via local Edge TTS
5. **🎨 Edit** — Customize subtitles, logo, audio mix
6. **🎬 Export** — Render final video with FFmpeg

---

## 🎨 Subtitle Customization

The editor supports:

- **Custom positioning** — Drag-and-drop anywhere on video
- **Width control** — Resize caption box (30% - 100%)
- **Font selection** — Padauk, Pyidaungsu, Noto Serif Myanmar, Myanmar3
- **Font size** — Smart recommendations per aspect ratio
- **Colors** — Font color, background color, outline color
- **Border styles** — Outline, Box, Shadow, None
- **Outline thickness** — 0-5px adjustable

---

## 📦 API Endpoints

### Authentication
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — User login

### Projects
- `GET /api/projects` — List user projects
- `POST /api/projects` — Create new project
- `GET /api/projects/{id}` — Get project details

### Pipeline
- `POST /api/transcript/transcribe/{projectId}` — Generate transcript
- `POST /api/script/generate/{projectId}` — Generate recap script
- `POST /api/voice/generate/{projectId}` — Generate voice-over (via Edge TTS)
- `POST /api/export/start/{projectId}` — Start export job
- `GET /api/export/status/{jobId}` — Poll export progress
- `GET /api/export/download/{jobId}` — Download final video
- `GET /api/export/preview/{jobId}` — Stream preview
- `GET /api/export/source/{projectId}` — Stream source video (authenticated)

### Upload
- `POST /api/upload/file` — Upload video file
- `POST /api/upload/youtube` — Register YouTube URL + trigger background download
- `POST /api/upload/logo/{projectId}` — Upload watermark logo

---

## 🌐 Environment Variables

### Backend (`application.properties`)
```properties
# Database
spring.datasource.url=jdbc:h2:file:./data/narratemm

# Security
app.jwt.secret=YOUR_64_CHAR_SECRET
app.jwt.expiration=86400000

# Storage
app.storage.base-path=./storage

# CORS
app.cors.allowed-origins=http://localhost:5173

# Edge TTS Microservice
app.tts.edge-url=http://localhost:5005
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:8080
```

---

## 🐛 Known Issues & Limitations

- ⚠️ Large videos (>30 min) may take significant processing time
- ⚠️ Edge TTS microservice must be running before generating voice-overs
- ⚠️ YouTube downloads require periodic `yt-dlp` updates

---

## 🗺️ Roadmap

- [ ] Multi-language UI (Burmese, English)
- [ ] Cloud storage integration (S3, GCS)
- [ ] Background music library
- [ ] Animated subtitle effects (fade, slide)
- [ ] Batch export queue
- [ ] User credit system
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **SIL International** for the Padauk Myanmar font
- **Groq** for fast Whisper API access
- **Google Gemini** for AI script generation
- **Microsoft** for Edge TTS engine
- **FFmpeg** community for the incredible media tool
- **yt-dlp** maintainers
- The Myanmar Unicode community

---

## 👤 Author

**Zarn Holland**  
📧 zarnn872@gmail.com  
🐙 [GitHub](https://github.com/zarn-chalamet)

---

<div align="center">

**Made for Myanmar content creators**

⭐ Star this repo if you find it useful!

</div>
