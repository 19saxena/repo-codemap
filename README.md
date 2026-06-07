# ⬡ CODEMAP — Codebase Analyzer

> Visual dependency mapping for any local Git repository. Drag nodes, trace imports, and get AI-powered explanations of every file.

![Stack](https://img.shields.io/badge/Python-FastAPI-blue) ![Stack](https://img.shields.io/badge/React-ReactFlow-61dafb) ![Stack](https://img.shields.io/badge/AI-Claude-orange)

---

## Features

| Feature | Details |
|---|---|
| **Dependency Graph** | Auto-detects `import`, `require`, `#include` across 15+ languages |
| **Interactive Canvas** | React Flow — drag nodes, zoom, pan, infinite canvas |
| **Code Metrics** | LoC, Code Lines, Cyclomatic Complexity, File Size per node |
| **AI File Summaries** | Click any node → 3-sentence Claude explanation of what the file does |
| **Smart Caching** | AI summaries cached by SHA-256 content hash — no redundant API calls |
| **Edge Highlighting** | Click a node to highlight all its import/export relationships |
| **Git Info** | Shows current branch and commit in the toolbar |

---

## Project Structure

```
codebase-analyzer/
├── backend/
│   ├── main.py            # FastAPI app — analysis engine + AI proxy
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root component + React Flow canvas
│   │   ├── types.ts           # Shared TypeScript interfaces
│   │   ├── components/
│   │   │   ├── CodeNode.tsx   # Custom draggable node card
│   │   │   ├── SidePanel.tsx  # File detail + AI summary panel
│   │   │   ├── Toolbar.tsx    # Path input + repo stats bar
│   │   │   └── EmptyState.tsx # Zero-state illustration
│   │   └── utils/
│   │       └── layout.ts      # Auto-layout + color helpers
│   ├── package.json
│   └── vite.config.ts
├── setup.sh               # One-shot setup script
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone & Setup

```bash
git clone <your-repo>
cd codebase-analyzer
chmod +x setup.sh
./setup.sh
```

### 2. Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

### 5. Open the app

Navigate to **http://localhost:5173** and enter an absolute path to any repo:

```
/Users/you/projects/my-python-app
/home/you/repos/my-node-server
```

---

## API Reference

### `GET /api/analyze?path=<absolute_path>`

Returns the full dependency graph as JSON:

```json
{
  "nodes": [
    {
      "id": "src/main.py",
      "data": {
        "label": "main.py",
        "path": "src/main.py",
        "full_path": "/abs/path/src/main.py",
        "language": "py",
        "metrics": { "loc": 120, "code_lines": 95, "blank_lines": 14, "complexity": 8, "size_bytes": 3200 },
        "folder": "src"
      },
      "position": { "x": 0, "y": 0 },
      "type": "codeNode"
    }
  ],
  "edges": [
    { "id": "src/main.py→src/utils.py", "source": "src/main.py", "target": "src/utils.py", ... }
  ],
  "meta": { "root": "/abs/path", "name": "my-app", "total_files": 42, "total_edges": 17, "git": { "branch": "main", "commit": "a3f2c1d" } }
}
```

### `POST /api/summarize`

```json
// Request
{ "file_path": "/abs/path/src/main.py", "repo_root": "/abs/path" }

// Response
{ "summary": "This file is the entry point...", "cached": false }
```

### `GET /api/file?path=<absolute_path>`

Returns the raw source code of a file (truncated to 20 KB for display).

---

## Supported Languages

| Language | Dependency Detection |
|---|---|
| Python | `import`, `from X import` (including relative) |
| JavaScript / TypeScript | `import X from`, `require()`, `import()`, `export from` |
| C / C++ | `#include` |
| Go | `import ( "..." )` |
| Java / Kotlin / Scala | File structure (planned: `import` parsing) |
| Ruby / PHP / Swift | File detection only (dep parsing planned) |

---

## Architecture Decisions

**Why FastAPI?** Async support, automatic OpenAPI docs, and fast startup time make it ideal for a local dev tool.

**Why content-hash caching?** Avoids re-calling the AI API for unchanged files between analysis runs. The cache persists for the lifetime of the server process (in-memory). For persistence, replace `_summary_cache` with a SQLite/JSON file store.

**Why auto-layout by folder?** Groups related files visually, mimicking how developers mentally model a codebase. Users can then drag nodes freely to customize their view.

**Cyclomatic Complexity:** The current implementation is a keyword-count approximation (fast, language-agnostic). For production accuracy, replace with `radon` (Python) or `escomplex` (JS).

---

## Roadmap

- [ ] Persist canvas layouts to `~/.codemap/<repo_hash>.json`
- [ ] Filter/search nodes by name or folder
- [ ] Folder grouping nodes (React Flow groups)
- [ ] More accurate CC via `radon` / `lizard`
- [ ] Export graph as SVG/PNG
- [ ] WebSocket for live file-change updates (FSEvents/inotify)
