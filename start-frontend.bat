@echo off
title CODEMAP — Frontend
color 0B

echo.
echo   ^| CODEMAP Frontend
echo   ^| React + Vite on http://localhost:5173
echo   ^+---------------------------------------
echo.

:: ── Move into frontend folder ─────────────────────────────
cd /d "%~dp0frontend"

:: ── Check if node_modules exists, install if not ─────────
if not exist "node_modules\" (
    echo   Installing Node dependencies...
    npm install --legacy-peer-deps
    echo   Dependencies installed.
    echo.
)

echo   Starting dev server...
echo   Open http://localhost:5173 in your browser.
echo.

npm run dev

pause
