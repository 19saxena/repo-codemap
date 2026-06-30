#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  CODEMAP — One-shot setup script (Unix / Mac / WSL)
# ─────────────────────────────────────────────────────────
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}  ⬡  CODEMAP — Codebase Analyzer${NC}"
echo -e "${CYAN}  ─────────────────────────────────${NC}"
echo ""

# ── Prerequisite checks ───────────────────────────────────
check() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}  ✗  $1 is not installed. Please install it first.${NC}"
    exit 1
  else
    echo -e "${GREEN}  ✓  $1 found: $(command -v $1)${NC}"
  fi
}

echo "  Checking prerequisites…"
check python3
check node
check npm
check git
echo ""

# ── Python version check ──────────────────────────────────
PY_VER=$(python3 -c "import sys; print(sys.version_info.minor)")
if [ "$PY_VER" -lt 9 ]; then
  echo -e "${RED}  ✗  Python 3.9+ required (found 3.$PY_VER)${NC}"
  exit 1
fi

# ── Backend setup ─────────────────────────────────────────
echo -e "  ${CYAN}[1/3] Setting up Python backend…${NC}"
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install -q --upgrade pip
pip install -q -r requirements.txt

echo -e "${GREEN}  ✓  Backend dependencies installed${NC}"
deactivate
cd ..
echo ""

# ── Frontend setup ────────────────────────────────────────
echo -e "  ${CYAN}[2/3] Setting up React frontend…${NC}"
cd frontend
npm install --legacy-peer-deps --silent
echo -e "${GREEN}  ✓  Frontend dependencies installed${NC}"
cd ..
echo ""

# ── API key prompt ────────────────────────────────────────
echo -e "  ${CYAN}[3/3] Gemini API Key setup…${NC}"
echo ""
echo -e "  ${YELLOW}  Get a free key at: https://aistudio.google.com/apikey${NC}"
echo -e "  ${YELLOW}  (Sign in with Google → Create API Key → Create in new project)${NC}"
echo ""
read -p "  Paste your GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY

if [ -n "$GEMINI_KEY" ]; then
  # Write start scripts with the key baked in
  cat > start-backend.sh << EOF
#!/usr/bin/env bash
cd backend
source .venv/bin/activate
export GEMINI_API_KEY=${GEMINI_KEY}
echo "  Starting CODEMAP backend on http://localhost:8000"
uvicorn main:app --reload --port 8000
EOF
  chmod +x start-backend.sh
  echo -e "${GREEN}  ✓  Key saved to start-backend.sh${NC}"
else
  cat > start-backend.sh << 'EOF'
#!/usr/bin/env bash
cd backend
source .venv/bin/activate
# Set your key here or export it before running:
# export GEMINI_API_KEY=your-key-here
echo "  Starting CODEMAP backend on http://localhost:8000"
uvicorn main:app --reload --port 8000
EOF
  chmod +x start-backend.sh
  echo -e "${YELLOW}  ⚠  No key entered. Edit start-backend.sh and add your GEMINI_API_KEY.${NC}"
fi

cat > start-frontend.sh << 'EOF'
#!/usr/bin/env bash
cd frontend
echo "  Starting CODEMAP frontend on http://localhost:5173"
npm run dev
EOF
chmod +x start-frontend.sh

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ─────────────────────────────────────────${NC}"
echo -e "${GREEN}  ✓  Setup complete!${NC}"
echo ""
echo "  To run CODEMAP:"
echo ""
echo -e "    ${YELLOW}Terminal 1:${NC}  ./start-backend.sh"
echo -e "    ${YELLOW}Terminal 2:${NC}  ./start-frontend.sh"
echo ""
echo -e "    Then open: ${CYAN}http://localhost:5173${NC}"
echo ""
echo "  Enter any local repo path in the app, e.g.:"
echo "    /home/you/projects/my-app"
echo ""
echo -e "${CYAN}  ─────────────────────────────────────────${NC}"
echo ""
