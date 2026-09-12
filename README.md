# My HTML + Tailwind IELTS Learning Website

IELTS practice website built with native HTML, Tailwind CSS, and a small Python standard-library HTTP server.

## Features

- Bento-style dashboard in existing forest-green palette
- Reading practice with instant scoring
- Writing practice with local heuristic feedback or Groq AI feedback
- IELTS criterion coaching and progress charts
- Explain Bot powered by Groq
- Responsive desktop sidebar and mobile bottom navigation
- Keyboard focus states, skip link, accessible labels, and reduced-motion support

## Requirements

- Python 3.9+
- Groq API key optional; required for AI features

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
```

4. Start web server:

```powershell
python website.py
```

5. Open http://localhost:8501

## Notes

- Tailwind loads from `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` during development.
- Progress stays in local `ielts_progress.json`.
- Browser-entered Groq keys stay in `sessionStorage` and are not written to disk.
- `website.py` serves HTML and JSON API routes. No Streamlit dependency remains.
