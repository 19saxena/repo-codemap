"""
Codebase Analyzer - Backend API
Parses local Git repos to extract dependencies, metrics, and structure.
"""

import os
import re
import ast
import json
import hashlib
import subprocess
from pathlib import Path
from typing import Optional
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from google import genai
import os
_genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Codebase Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory AI summary cache: { file_hash: summary_string } ─────────────────
_summary_cache: dict[str, str] = {}

# ── Config ────────────────────────────────────────────────────────────────────
IGNORED_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", "*.egg-info",
}
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c",
    ".h", ".hpp", ".cs", ".go", ".rs", ".rb", ".php", ".swift",
    ".kt", ".scala", ".vue", ".svelte",
}

# ── Models ────────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    path: str

class SummaryRequest(BaseModel):
    file_path: str
    repo_root: str


# ── Dependency Parsers ────────────────────────────────────────────────────────
def parse_python_imports(source: str, file_path: Path, root: Path) -> list[str]:
    """Extract imports from Python files using AST."""
    imports = []
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    # Try to resolve relative imports to actual file paths
                    if node.level > 0:
                        # Relative import
                        parts = file_path.parent.parts
                        base = Path(*parts[:-node.level]) if node.level <= len(parts) else root
                        module_path = base / node.module.replace(".", "/")
                        for ext in [".py", "/__init__.py"]:
                            candidate = Path(str(module_path) + ext)
                            if candidate.exists():
                                imports.append(str(candidate.relative_to(root)))
                                break
                    else:
                        imports.append(node.module.split(".")[0])
    except SyntaxError:
        pass
    return imports


def parse_js_imports(source: str) -> list[str]:
    """Extract imports/requires from JS/TS files using regex."""
    patterns = [
        r'import\s+.*?\s+from\s+["\']([^"\']+)["\']',
        r'require\s*\(\s*["\']([^"\']+)["\']\s*\)',
        r'import\s*\(\s*["\']([^"\']+)["\']\s*\)',
        r'export\s+.*?\s+from\s+["\']([^"\']+)["\']',
    ]
    imports = []
    for pattern in patterns:
        imports.extend(re.findall(pattern, source))
    return imports


def parse_c_includes(source: str) -> list[str]:
    """Extract #include directives from C/C++ files."""
    pattern = r'#include\s+[<"]([^>"]+)[>"]'
    return re.findall(pattern, source)


def parse_go_imports(source: str) -> list[str]:
    """Extract imports from Go files."""
    pattern = r'"([^"]+)"'
    in_import_block = False
    imports = []
    for line in source.splitlines():
        stripped = line.strip()
        if stripped == "import (":
            in_import_block = True
        elif in_import_block and stripped == ")":
            in_import_block = False
        elif in_import_block or stripped.startswith("import "):
            found = re.findall(pattern, stripped)
            imports.extend(found)
    return imports


def get_imports(file_path: Path, source: str, root: Path) -> list[str]:
    """Dispatch to the right parser based on extension."""
    ext = file_path.suffix.lower()
    if ext == ".py":
        return parse_python_imports(source, file_path, root)
    elif ext in {".js", ".ts", ".jsx", ".tsx", ".vue", ".svelte"}:
        return parse_js_imports(source)
    elif ext in {".c", ".cpp", ".h", ".hpp"}:
        return parse_c_includes(source)
    elif ext == ".go":
        return parse_go_imports(source)
    return []


# ── Complexity Metrics ────────────────────────────────────────────────────────
def cyclomatic_complexity(source: str, ext: str) -> int:
    """Rough cyclomatic complexity estimate (decision points + 1)."""
    keywords = ["if ", "elif ", "else:", "for ", "while ", "try:", "except",
                 "case ", "&&", "||", "?", "catch", "switch"]
    count = 1
    for kw in keywords:
        count += source.count(kw)
    return count


def calculate_metrics(file_path: Path, source: str) -> dict:
    lines = source.splitlines()
    code_lines = [l for l in lines if l.strip() and not l.strip().startswith(("#", "//", "/*", "*", "*/", "'''", '"""'))]
    return {
        "loc": len(lines),
        "code_lines": len(code_lines),
        "blank_lines": sum(1 for l in lines if not l.strip()),
        "complexity": cyclomatic_complexity(source, file_path.suffix),
        "size_bytes": file_path.stat().st_size,
    }


# ── Git Helpers ───────────────────────────────────────────────────────────────
def is_git_repo(path: Path) -> bool:
    return (path / ".git").exists()


def get_git_info(path: Path) -> dict:
    try:
        branch = subprocess.check_output(
            ["git", "-C", str(path), "rev-parse", "--abbrev-ref", "HEAD"],
            stderr=subprocess.DEVNULL, text=True
        ).strip()
        commit = subprocess.check_output(
            ["git", "-C", str(path), "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL, text=True
        ).strip()
        return {"branch": branch, "commit": commit}
    except Exception:
        return {}


# ── Core Analysis ─────────────────────────────────────────────────────────────
def analyze_repo(root: Path) -> dict:
    """Walk the repo and build the nodes + edges graph."""
    nodes = {}   # node_id -> node dict
    raw_edges = []  # (source_id, raw_import_string)

    # Build a lookup: filename/module -> node_id for resolving edges later
    path_index: dict[str, str] = {}   # relative path str -> node_id

    # First pass: collect all files
    for file_path in root.rglob("*"):
        if file_path.is_dir():
            continue
        if any(part in IGNORED_DIRS for part in file_path.parts):
            continue
        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        rel = file_path.relative_to(root)
        node_id = str(rel).replace(os.sep, "/")

        try:
            source = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        metrics = calculate_metrics(file_path, source)
        imports = get_imports(file_path, source, root)

        node = {
            "id": node_id,
            "data": {
                "label": file_path.name,
                "path": node_id,
                "full_path": str(file_path),
                "language": file_path.suffix.lstrip("."),
                "metrics": metrics,
                "imports_raw": imports,
                "folder": str(rel.parent).replace(os.sep, "/"),
            },
            "position": {"x": 0, "y": 0},  # layout computed client-side
            "type": "codeNode",
        }
        nodes[node_id] = node
        path_index[node_id] = node_id
        path_index[file_path.stem] = node_id
        path_index[file_path.name] = node_id

    # Second pass: resolve imports to edges
    edge_set = set()
    for node_id, node in nodes.items():
        for raw_import in node["data"]["imports_raw"]:
            # Normalize: try various lookups
            target = None
            # Direct path match (relative import resolved earlier)
            if raw_import in path_index:
                target = path_index[raw_import]
            # Module/stem match
            elif raw_import.replace(".", "/") in path_index:
                target = path_index[raw_import.replace(".", "/")]
            # Filename match
            else:
                # Try appending common extensions
                for ext in [".py", ".js", ".ts", ".jsx", ".tsx"]:
                    candidate = raw_import.replace(".", "/") + ext
                    if candidate in path_index:
                        target = path_index[candidate]
                        break
                    # Just stem
                    stem_candidate = raw_import.split(".")[-1]
                    if stem_candidate in path_index:
                        target = path_index[stem_candidate]
                        break

            if target and target != node_id:
                edge_key = f"{node_id}→{target}"
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    raw_edges.append({
                        "id": edge_key,
                        "source": node_id,
                        "target": target,
                        "type": "smoothstep",
                        "animated": False,
                        "style": {"stroke": "#4a9eff", "strokeWidth": 1.5},
                    })

    # Remove raw import data from final output (not needed by frontend)
    for node in nodes.values():
        del node["data"]["imports_raw"]

    git_info = get_git_info(root) if is_git_repo(root) else {}

    return {
        "nodes": list(nodes.values()),
        "edges": raw_edges,
        "meta": {
            "root": str(root),
            "name": root.name,
            "total_files": len(nodes),
            "total_edges": len(raw_edges),
            "git": git_info,
        },
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "Codebase Analyzer API"}


@app.get("/api/analyze")
def analyze(path: str = Query(..., description="Absolute path to the repository root")):
    repo_path = Path(path).expanduser().resolve()
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")
    if not repo_path.is_dir():
        raise HTTPException(status_code=400, detail="Path must be a directory")

    try:
        result = analyze_repo(repo_path)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summarize")
def summarize(req: SummaryRequest):
    """Generate an AI summary for a specific file. Caches by content hash."""
    file_path = Path(req.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        source = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read file: {e}")

    # Cache lookup
    content_hash = hashlib.sha256(source.encode()).hexdigest()
    if content_hash in _summary_cache:
        return {"summary": _summary_cache[content_hash], "cached": True}

    # Truncate very large files
    if len(source) > 12000:
        source = source[:12000] + "\n\n... [file truncated for analysis]"

    rel_path = req.file_path.replace(req.repo_root, "").lstrip("/")

    try:
        response = _genai_client.models.generate_content(
    model="gemini-2.0-flash",
    contents=(
        f"You are a senior software engineer doing a code review.\n"
        f"File: `{rel_path}`\n\n"
        f"```\n{source}\n```\n\n"
        "Explain what this file does in exactly 3 concise sentences. "
        "Focus on: (1) its primary purpose, (2) key functions/classes, "
        "(3) how it fits in the broader codebase. "
        "Be direct and technical. No preamble."
    )
)
        summary = response.text
        _summary_cache[content_hash] = summary
        return {"summary": summary, "cached": False}
              
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI API error: {e}")


@app.get("/api/file")
def get_file_content(path: str = Query(...)):
    """Return the raw source of a file (for display in the side panel)."""
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        source = file_path.read_text(encoding="utf-8", errors="replace")
        # Truncate for display
        truncated = len(source) > 20000
        return {
            "content": source[:20000],
            "truncated": truncated,
            "size": len(source),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
