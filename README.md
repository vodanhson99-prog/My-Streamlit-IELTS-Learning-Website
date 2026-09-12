# My HTML + Tailwind IELTS Learning Website

IELTS practice website built with native HTML, Tailwind CSS, and a small Python standard-library HTTP server.

## Features

- Bento-style dashboard in existing forest-green palette
- Reading practice with instant scoring
- Writing practice with local heuristic feedback or server-side AI feedback
- IELTS criterion coaching and progress charts
- AI-powered Explain Bot
- Responsive desktop sidebar and mobile bottom navigation
- Keyboard focus states, skip link, accessible labels, and reduced-motion support

## Requirements

- Python 3.9+
- Server-side AI API key optional; required for AI features

## Run locally on Windows

1. Create and activate `.venv`:

```powershell
.\venv.ps1
```

If PowerShell blocks local scripts:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\venv.ps1
```

2. Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. Optional: create `.env` for server-side AI features:

```dotenv
GROQ_API_KEY=your_groq_api_key
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_MODEL=your_server_side_model_name
```

4. Start web server:

```powershell
python website.py
```

5. Open http://localhost:8501

## Notes

- Tailwind loads from `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` during development.
- Progress stays in local `ielts_progress.json`.
- AI provider, model, and API key stay server-side through `.env`.
- `website.py` serves HTML and JSON API routes. No Streamlit dependency remains.
