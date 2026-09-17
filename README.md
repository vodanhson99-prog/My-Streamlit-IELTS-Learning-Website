# ielts with rbs — Modern Next.js Dashboard

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

### 2. Configure Environment (Required for AI Writing Evaluation)

Copy the environment sample:

```bash
cp .env.example .env.local
```

Edit `.env.local` and provide an API key that belongs to the configured
OpenAI-compatible endpoint:

```env
AI_API_KEY=your_provider_or_9router_api_key_here
AI_API_URL=https://9router.minhmice.com/v1/chat/completions
AI_MODEL=coding-rbs
AI_TIMEOUT_MS=120000
```

`AI_API_KEY` must be valid for `AI_API_URL`. For a remote 9Router instance,
create/copy an API key from the 9Router dashboard; an upstream OpenAI/Groq key
is not automatically a valid 9Router remote-access key. The Writing evaluator
fails closed when the provider is unavailable and does not return a heuristic
band as if it were an AI evaluation.

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
