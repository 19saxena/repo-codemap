#!/usr/bin/env bash
# setup.sh - One-shot setup for Codebase Analyzer
set -e

echo "═══════════════════════════════════════"
echo "  CODEMAP — Codebase Analyzer Setup"
echo "═══════════════════════════════════════"

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "❌  Python 3.9+ required"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌  Node.js 18+ required"; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌  npm required"; exit 1; }

# Backend
echo ""
echo "📦  Installing Python dependencies…"
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
echo "✅  Backend ready"
cd ..

# Frontend
echo ""
echo "📦  Installing Node dependencies…"
cd frontend
npm install --legacy-peer-deps
echo "✅  Frontend ready"
cd ..

echo ""
echo "════════════════════════════════════════"
echo "  Setup complete! Next steps:"
echo ""
echo "  1. Set your API key:"
echo "     export ANTHROPIC_API_KEY=sk-ant-..."
echo ""
echo "  2. Start the backend (terminal 1):"
echo "     cd backend && source .venv/bin/activate"
echo "     uvicorn main:app --reload --port 8000"
echo ""
echo "  3. Start the frontend (terminal 2):"
echo "     cd frontend && npm run dev"
echo ""
echo "  4. Open: http://localhost:5173"
echo "════════════════════════════════════════"
