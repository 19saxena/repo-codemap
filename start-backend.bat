@echo off
title CODEMAP — Backend
color 0B

echo.
echo   ^| CODEMAP Backend
echo   ^| FastAPI + Uvicorn on http://localhost:8000
echo   ^+------------------------------------------
echo.

:: ── Move into backend folder ──────────────────────────────
cd /d "%~dp0backend"

:: ── Check if venv exists, create if not ──────────────────
if not exist ".venv\" (
    echo   Setting up Python virtual environment...
    python -m venv .venv
    echo   Installing dependencies...
    call .venv\Scripts\activate.bat
    pip install -q -r requirements.txt
    echo   Dependencies installed.
) else (
    call .venv\Scripts\activate.bat
)

:: ── SET YOUR GEMINI API KEY HERE ─────────────────────────
set GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
:: ─────────────────────────────────────────────────────────

if "%GEMINI_API_KEY%"=="YOUR_GEMINI_KEY_HERE" (
    echo.
    echo   [WARNING] GEMINI_API_KEY is not set!
    echo   Open start-backend.bat and replace YOUR_GEMINI_KEY_HERE
    echo   with your key from https://aistudio.google.com/apikey
    echo.
    pause
    exit /b 1
)

echo   Gemini API key loaded.
echo   Starting server...
echo.

uvicorn main:app --reload --port 8000

pause
