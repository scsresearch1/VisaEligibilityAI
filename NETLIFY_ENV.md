# Netlify environment variables

Set these in **Netlify → Site configuration → Environment variables** (all scopes: **Production**, **Deploy previews**, **Branch deploys** unless you use different keys per environment).

Vite only exposes variables prefixed with `VITE_`. They are embedded at **build time** — trigger a new deploy after changing values.

## Required for LLM assessments

| Variable | Value to set | Notes |
|----------|----------------|-------|
| `VITE_LLM_PROVIDER` | `hybrid` | Gemini for long JSON tasks; Groq fallback; insights prefer Gemini |
| `VITE_GEMINI_API_KEY` | Your Google AI Studio key (`AIza…`) | [Create key](https://aistudio.google.com/apikey) |
| `VITE_GROQ_API_KEY` | Your Groq key (`gsk_…`) | [Groq console](https://console.groq.com) |
| `VITE_REQUIRE_LLM_OUTPUT` | `true` | No heuristic fallback for assessments |

## LLM tuning (recommended defaults)

| Variable | Value |
|----------|--------|
| `VITE_GEMINI_MODEL` | `gemini-2.5-flash` |
| `VITE_GEMINI_MODEL_FALLBACKS` | *(leave empty)* |
| `VITE_GROQ_MODEL` | `llama-3.1-8b-instant` |
| `VITE_MAX_PROFILE_CHARS` | `8000` |
| `VITE_GROQ_MAX_PROFILE_CHARS` | `2800` |
| `VITE_GROQ_MAX_SYSTEM_CHARS` | `2400` |
| `VITE_GROQ_MAX_USER_CHARS` | `2800` |
| `VITE_GROQ_MAX_INPUT_TOKENS` | `4200` |
| `VITE_GROQ_MAX_INPUT_TOKENS_AGGRESSIVE` | `3200` |
| `VITE_GROQ_MAX_COMPLETION_TOKENS` | `1200` (not 4096 — counts toward 6k limit) |
| `VITE_GROQ_MAX_COMPLETION_TOKENS_LARGE_JSON` | `1600` |
| `VITE_GROQ_MAX_COMPLETION_TOKENS_AGGRESSIVE` | `1024` |
| `VITE_GROQ_MIN_GAP_MS` | `9000` (space between Groq calls; reduces 429 TPM errors) |
| `VITE_LLM_TEMPERATURE` | `0.2` |
| `VITE_LLM_TOP_P` | `0.9` |

## App branding & auth

| Variable | Value |
|----------|--------|
| `VITE_APP_NAME` | `Visa Eligibility AI` |
| `VITE_APP_TAGLINE` | `Intelligent visa pathway assessment` |
| `VITE_SUPPORT_EMAIL` | `support@example.com` |
| `VITE_API_BASE_URL` | `https://api.example.com` |
| `VITE_AUTH_USERNAME` | `admin` |
| `VITE_AUTH_PASSWORD` | `visaadm` |

## Firebase (when enabling Google sign-in)

| Variable | Value |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Your Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `YOUR_PROJECT.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `YOUR_PROJECT.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Feature flags

| Variable | Value |
|----------|--------|
| `VITE_ENABLE_GOOGLE_SIGN_IN` | `false` |
| `VITE_ENABLE_REGISTRATION` | `true` |

## Groq token limit (important)

`llama-3.1-8b-instant` on the free/on_demand tier allows about **6000 tokens per request** (prompt + completion). If you see **413 Request too large**, ensure `VITE_GROQ_MAX_COMPLETION_TOKENS` is **1200** (not 4096) and use the char limits above, or add a valid **`VITE_GEMINI_API_KEY`** (`AIza…`) for automatic Gemini fallback.

## Security

- Mark `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`, and `VITE_AUTH_PASSWORD` as **secret** in Netlify if available.
- Keys are still visible in the built browser bundle (Vite client env). For production hardening, move LLM calls to a serverless function later.

## Local development

```bash
cp .env.example .env
# Edit .env with your keys, then:
npm run dev
```
