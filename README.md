# IELTS Prep — Modern Next.js Dashboard

Modern IELTS preparation platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui**.

## Features

- **Personalized Coach & Dashboard:** Actionable diagnostics based on practice trends.
- **Reading Practice:** Authentic IELTS academic passages with instant scoring and explanation support.
- **Writing Studio:** Real-time word tracking, heuristic evaluation, and AI-powered band scoring across 4 official IELTS criteria.
- **Explain Bot:** On-demand AI tutor to clarify incorrect reading/listening options.
- **Local Persistence:** Zero-friction client storage via `localStorage` with data reset support.

## Getting Started

### Prerequisites

- Node.js 18.17+ or 20+
- pnpm 9+

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment (Optional for AI Examiner)

Copy the environment sample and provide your Groq API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key_here
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_MODEL=llama-3.3-70b-versatile
```

> Note: If no API key is provided, the Writing module automatically falls back to local heuristic analysis.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
pnpm build
pnpm start
```
