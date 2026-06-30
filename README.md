# ⬡ CODEMAP — Codebase Dependency Visualizer

> An interactive, AI-powered codebase analysis engine that parses local Git repositories and renders a live, draggable dependency graph — so you can understand any unfamiliar project in minutes, not days.

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![ReactFlow](https://img.shields.io/badge/React_Flow-11-ff0072?style=flat-square)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash_Lite-4285F4?style=flat-square&logo=google)

---

## Why CODEMAP?

Most online tools like **dependency-cruiser**, **Madge**, or **Sourcegraph** require you to:
- Install language-specific runtimes or build systems
- Push your code to a cloud service
- Pay for private repo analysis
- Work with static SVG exports that can't be interacted with

**CODEMAP is different:**
- Runs **100% locally** — your code never leaves your machine
- No build step required — parses source files statically without executing them
- Works across **15+ languages** in one tool (Python, JS/TS, C/C++, Go, Java, Rust, etc.)
- Gives you an **interactive canvas** — drag nodes, zoom into hot spots, reorganize the map
- Integrates **AI file summaries** so you instantly understand what each file does
- Shows **folder structure as visual groups** — mimicking how IDEs like IntelliJ display project architecture

---

## Features

### Core
| Feature | Details |
|---|---|
| **Multi-language Dependency Parsing** | Statically extracts `import`, `from X import`, `require()`, `#include`, Go `import` blocks — no code execution |
| **Internal vs External Dependencies** | Edges on canvas for internal file links; external libraries listed with an "external" badge in the side panel |
| **Folder Group Visualization** | Files grouped into colored folder boxes, matching how IDEs display project structure |
| **Interactive Canvas** | React Flow — infinite pan, pinch/scroll zoom, draggable nodes and groups |
| **Code Metrics per File** | Lines of Code, Code Lines, Blank Lines, Cyclomatic Complexity, File Size |
| **Complexity Legend** | Color-coded complexity indicator per node: green → yellow → orange → red |
| **Edge Highlighting** | Click a node to highlight all its direct import/export relationships |
| **Minimap** | Bottom-right overview of the full graph with folder colors |

### AI Integration
| Feature | Details |
|---|---|
| **AI File Summaries** | Click any node → "Generate AI Summary" → Gemini explains the file in 3 plain-English sentences |
| **Content-Hash Cache** | Each file is SHA-256 hashed. Re-clicking a file loads instantly from cache — no redundant API calls |
| **Cache Hit Indicator** | Side panel shows "Loaded from cache" vs "Just generated" so you know when API is being used |
| **Source Viewer** | Collapsible raw source code view inside the side panel |

### Developer UX
| Feature | Details |
|---|---|
| **Search / Filter** | Type any filename or path in the toolbar — matching nodes stay bright, everything else fades. Live match counter shown |
| **Export PNG** | One-click export of the full canvas at 2× resolution for documentation or presentations |
| **Git Info Display** | Current branch and commit hash shown in the toolbar |
| **Re-analyze Button** | Refresh the graph without retyping the path |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                        │
│  React 18 + TypeScript + Vite                       │
│  React Flow 11  →  interactive canvas + nodes       │
│  html-to-image  →  PNG export                       │
│  lucide-react   →  icons                            │
└────────────────────┬────────────────────────────────┘
                     │  HTTP (Vite proxy → localhost:8000)
┌────────────────────▼────────────────────────────────┐
│                     BACKEND                         │
│  Python 3.9+ + FastAPI + Uvicorn                    │
│  AST parser    →  Python imports                    │
│  Regex parser  →  JS/TS/C/C++/Go imports            │
│  google-genai  →  Gemini AI summaries               │
│  hashlib       →  SHA-256 content cache             │
│  subprocess    →  Git branch/commit info            │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

### `GET /api/analyze?path=<absolute_path>`
Traverses the repo, parses all source files, builds the dependency graph.

**Response:**
```json
{
  "nodes": [
    {
      "id": "src/main.py",
      "type": "codeNode",
      "data": {
        "label": "main.py",
        "path": "src/main.py",
        "full_path": "/abs/path/src/main.py",
        "language": "py",
        "folder": "src",
        "imports": ["utils", "os", "fastapi"],
        "metrics": {
          "loc": 120,
          "code_lines": 95,
          "blank_lines": 14,
          "complexity": 8,
          "size_bytes": 3200
        }
      },
      "position": { "x": 84, "y": 60 }
    }
  ],
  "edges": [
    {
      "id": "src/main.py→src/utils.py",
      "source": "src/main.py",
      "target": "src/utils.py",
      "type": "smoothstep"
    }
  ],
  "meta": {
    "root": "/abs/path",
    "name": "my-project",
    "total_files": 42,
    "total_edges": 17,
    "git": { "branch": "main", "commit": "a3f2c1d" }
  }
}
```

### `POST /api/summarize`
Generates an AI explanation for a specific file. Returns cached result if file content hasn't changed.

**Request:**
```json
{ "file_path": "/abs/path/src/main.py", "repo_root": "/abs/path" }
```

**Response:**
```json
{ "summary": "This file is the FastAPI entry point...", "cached": false }
```

### `GET /api/file?path=<absolute_path>`
Returns raw source code of a file (truncated to 20 KB for display).

### `GET /`
Health check — returns `{ "status": "ok" }`.

---

## Project Structure

```
codemap/
├── backend/
│   ├── main.py              # FastAPI app — full analysis engine
│   │   ├── analyze_repo()   # Directory walker + dependency resolver
│   │   ├── parse_*()        # Per-language import parsers
│   │   ├── calculate_metrics() # LoC, complexity, size
│   │   └── /api/summarize   # Gemini AI proxy with SHA-256 cache
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root — React Flow canvas, search, export
│   │   ├── types.ts             # Shared TypeScript interfaces
│   │   ├── index.css            # Global dark theme + CSS variables
│   │   ├── components/
│   │   │   ├── CodeNode.tsx     # Custom draggable file node card
│   │   │   ├── FolderGroup.tsx  # Folder boundary group node
│   │   │   ├── SidePanel.tsx    # File detail + AI summary + source viewer
│   │   │   ├── Toolbar.tsx      # Path input, search, export, git stats
│   │   │   └── EmptyState.tsx   # Zero-state illustration
│   │   └── utils/
│   │       └── layout.ts        # Auto-layout algorithm + color helpers
│   ├── package.json
│   └── vite.config.ts           # Proxy: /api → localhost:8000
│
├── start-backend.bat        # Windows: one-click backend start
├── start-frontend.bat       # Windows: one-click frontend start
├── setup.sh                 # Unix: full setup script
└── README.md
```

---

## Setup & Run

### Prerequisites
- **Python 3.9+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **Gemini API Key** (free) — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

> Get the Gemini key from **AI Studio** (not Google Cloud Console). AI Studio keys come with a free tier automatically — no credit card needed.

---

### Windows Setup

**Step 1 — Install Python dependencies**
```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Step 2 — Install Node dependencies**
```bat
cd frontend
npm install --legacy-peer-deps
```

**Step 3 — Add your Gemini API key**

Open `start-backend.bat` and replace `YOUR_GEMINI_KEY_HERE` with your actual key.

**Step 4 — Run**

Double-click `start-backend.bat` → opens backend on port 8000

Double-click `start-frontend.bat` → opens frontend on port 5173

Open **http://localhost:5173** in your browser.

---

### Unix/Mac Setup

```bash
chmod +x setup.sh
./setup.sh

# Then edit start-backend.bat or export directly:
export GEMINI_API_KEY=your-key-here

# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

---

### Using the App

1. **Enter a local repo path** in the toolbar (e.g. `D:/Projects/my-app`) and click **Analyze**
2. The canvas renders all source files as nodes, grouped by folder, with edges showing import relationships
3. **Drag** nodes and folder groups to rearrange
4. **Scroll/pinch** to zoom in and out
5. **Click any node** to open the side panel with metrics, imports, and source code
6. Click **Generate AI Summary** in the side panel to get a plain-English explanation of that file
7. **Search** files using the search box in the toolbar — non-matching nodes fade out
8. Click **Export PNG** to save the graph as a high-resolution image

> **Path format on Windows:** Use forward slashes — `D:/WebD/my-repo` not `D:\WebD\my-repo`

---

## Assumptions & Design Decisions

| Decision | Reason |
|---|---|
| **Static parsing only** | No code execution required — works on incomplete or broken codebases |
| **In-memory AI cache** | Cache persists for the server session. Restarting clears it, but the SHA-256 approach means identical files never re-call the API even across runs if you add file-based persistence later |
| **Cyclomatic complexity via keyword counting** | Language-agnostic and fast. Production tools like `radon` (Python) or `lizard` give more accurate results but require per-language tooling |
| **Folder-column layout** | Auto-arranges files by directory, mirroring how developers mentally model a codebase. Users can drag to customize |
| **Gemini 2.5 Flash Lite** | Fastest and cheapest Gemini model available on the free tier — ideal for summarizing many files quickly |
| **Vite proxy for API calls** | Avoids CORS issues during development. In production, serve both from the same origin or configure CORS properly |

---

## Supported Languages

| Language | Detected Patterns |
|---|---|
| Python | `import X`, `from X import Y` (including relative imports) |
| JavaScript / TypeScript | `import X from`, `require()`, `import()`, `export … from` |
| JSX / TSX | Same as JS/TS |
| C / C++ | `#include <X>`, `#include "X"` |
| Go | `import "X"`, `import ( "X" )` blocks |
| Java, Kotlin, Scala, Ruby, PHP, Swift | File detection + metrics (import parsing planned) |
| Vue, Svelte | JS-style import detection |

---

## Potential Enhancements

- **Persistent canvas layout** — save node positions to a JSON file per repo
- **Persistent AI cache** — write cache to `~/.codemap/cache.json` so summaries survive server restarts
- **Accurate complexity** — integrate `radon` for Python, `escomplex` for JS
- **Dependency depth traversal** — highlight 2nd and 3rd level transitive dependencies
- **File type filter** — toggle buttons to show/hide `.h`, `.test.ts`, etc.
- **WebSocket live reload** — re-analyze automatically when files change on disk
- **GitHub URL support** — auto-clone a repo before analyzing
