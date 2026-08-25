# Tungston AI

A chat app built to run long — big context window, file + image upload, native image
generation, streaming replies. Neomorphic UI, dark gunmetal palette with a warm
filament-amber accent (the "signature" gauge in the header shows how much of the
context window the current chat has used).

## Which API key to use

You listed Gemini, OpenRouter, Bytez, Groq, Cerebras, Mistral, and Explorium. Given
your priorities — long context, strong answers, file upload, and image generation —
here's the actual trade-off:

| Provider | Context window | Files (PDF/docs) | Image generation | Notes |
|---|---|---|---|---|
| **Gemini** | ~1M tokens | Native, direct upload | Native (Nano Banana) | Best fit for everything you asked for, in one key |
| OpenRouter | Depends on routed model | Depends on model | Only on image-capable models (incl. Gemini) | Good if you want to swap between many models later |
| Mistral | ~128K | OCR/document support | No | Solid, but smaller context, no image gen |
| Groq | ~128K | Vision on some Llama models | No | Extremely fast inference, not built for files/images |
| Cerebras | ~128K | No | No | Fastest raw inference, text-only |
| Bytez | Varies by model | Varies | Varies | Aggregator of open models, inconsistent API shape per model |
| Explorium | — | — | — | Not a chat model host — it's a B2B contact/company data enrichment API. Doesn't fit this app at all. |

**Recommendation: Gemini.** It's the only one of these that natively covers all four
things you asked for — long context, file upload, image upload, and image generation
— through a single API key, and it has a generous free tier to start with. Get a key
at https://aistudio.google.com/apikey.

The app is built provider-agnostic (`lib/providers.ts`), so switching later is a
one-line env var change (`AI_PROVIDER=openrouter`, etc.) rather than a rewrite — no
need to commit to Gemini forever.

Model names shift often (Google alone has renamed its lineup several times in the
last year) — if `GEMINI_MODEL` in `.env.example` is out of date by the time you read
this, check https://ai.google.dev/gemini-api/docs/models and swap in the current
name; nothing else in the code needs to change.

## Local setup

```bash
npm install
cp .env.example .env.local
# paste your GEMINI_API_KEY into .env.local
npm run dev
```

## Deploying

Push to GitHub, import the repo in Vercel, and add the same environment variables
from `.env.example` in the Vercel project settings (Settings → Environment
Variables). No other config needed.

Note: Vercel serverless functions cap request bodies at a few MB on the Hobby plan
(higher on Pro). That limits how large a file you can send through `/api/upload`
regardless of the 30MB check in the code. If you need to support bigger files
(long videos, huge PDFs), the next step is uploading straight from the browser to
Gemini's File API and only sending the resulting `fileUri` through Vercel — ask and
I can wire that up.

## How token usage is kept down

- **Files use a reference, not a re-upload.** Attachments go through
  `/api/upload`, which hands them to Gemini's File API once and gets back a small
  `fileUri`. That reference — not the raw bytes — is what's included in the message,
  so a 20-page PDF doesn't get re-encoded into every request.
- **History is capped per request** (`MAX_HISTORY_MESSAGES` in
  `app/api/chat/route.ts`) so a long-running chat on a smaller-context provider
  (Groq, Cerebras, Mistral) doesn't silently balloon.
- **Streaming, plain-text responses** — no repeated JSON envelope per token, just a
  raw text stream the client appends as it arrives.

## Structure

```
app/api/chat/route.ts     Streaming chat endpoint
app/api/image/route.ts    Image generation endpoint
app/api/upload/route.ts   File upload (Gemini File API, or inline fallback)
app/api/config/route.ts   Tells the client which provider + context window is active
lib/providers.ts          All provider integrations, one switch statement
components/ChatApp.tsx    App state, streaming, conversation persistence (localStorage)
components/Composer.tsx   Input, attach, image-mode toggle, send
components/MessageBubble.tsx
components/Sidebar.tsx
components/ContextGauge.tsx  The header usage gauge
components/FilamentMark.tsx  Logo / loading indicator
```

## Usage limits (do this before sharing the link widely)

Without a rate limiter, anyone with your deployed URL can send unlimited requests
against your Gemini key. The app ships with IP-based rate limiting via Upstash
Redis, but it only turns on once you connect a database — until then it's
disabled and requests are unlimited.

1. In your Vercel project → **Storage** tab → **Create Database** → choose
   **Upstash** → **Redis** (there's a free tier, no card needed for small usage).
2. Once created, click **Connect Project**, pick `tungston-ai`, and select
   Production + Preview. Vercel injects `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` into your project automatically — you don't need to
   copy/paste anything.
3. Redeploy (Vercel → Deployments → ⋯ on the latest one → Redeploy), or just push
   any small commit — the new env vars only take effect on a fresh deployment.
4. Defaults are 30 chat messages/hour and 8 generated images/hour per IP address.
   Adjust with `RATE_LIMIT_CHAT_PER_HOUR` / `RATE_LIMIT_IMAGE_PER_HOUR` in the
   project's Environment Variables if you want it looser or tighter.

This limits *volume*, not *access* — anyone with the URL can still use it, just
not without limit. If you want to gate access entirely (e.g. only you can use it),
the simplest next step is a shared password screen in front of the chat UI — ask
and I'll add one.

## Wiring this into your dashboard

Nothing here touches the dashboard you already deployed. When you're ready to make
Tungston AI the centerpiece, the cleanest path is usually either (a) linking out to
this app's URL from the dashboard, or (b) moving `components/ChatApp.tsx` and the
`app/api/*` routes into the dashboard's own Next.js project. Send over the deployed
link when you have it and we can wire it up properly.
