# My Streamlit IELTS Learning Website

IELTS practice website built with Streamlit.

## Features

- Reading practice
- Writing practice with AI feedback
- Progress tracking
- IELTS coaching chatbot

## Requirements

- Python 3.9+
- Groq API key (optional, required for AI features)

## Run locally on Windows

1. Clone the repository and open it:

```powershell
git clone https://github.com/capncook-cookin/My-Streamlit-IELTS-Learning-Website.git
cd My-Streamlit-IELTS-Learning-Website
```

2. Create and activate `.venv` using the included script:

```powershell
.\venv.ps1
```

If PowerShell blocks local scripts, allow them for the current terminal only:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\venv.ps1
```

3. Install dependencies inside the activated virtual environment:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

4. Optionally create `.env` for AI features:

```dotenv
GROQ_API_KEY=your_groq_api_key
```

5. Start the website:

```powershell
python -m streamlit run website.py
```

## Status

Under active development.

