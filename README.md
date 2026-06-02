# Visa Eligibility AI

Professional React application for U.S. visa eligibility assessment — landing page, authentication UI, and Netlify-ready deployment.

## Local development

```bash
npm install
cp .env.example .env
# Edit .env — add VITE_GEMINI_API_KEY and VITE_GROQ_API_KEY
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

Settings are loaded from **environment variables** prefixed with `VITE_` (see `.env.example` and **`NETLIFY_ENV.md`**).

| Environment | How to configure |
|-------------|------------------|
| Local | `.env` file (gitignored) |
| Netlify | Site → Environment variables |

Code reads values in `src/config/app.config.ts` via `src/config/env.ts`.

## Deploy to Netlify

1. Connect this repository to Netlify.
2. Add all `VITE_*` variables from **`NETLIFY_ENV.md`** in the Netlify dashboard.
3. Build: `npm run build`, publish: `dist` (configured in `netlify.toml`).
4. Redeploy after changing any environment variable (values are baked in at build time).

## Default login (local testing)

| Field    | Value     |
|----------|-----------|
| Username | `admin`   |
| Password | `visaadm` |

Set via `VITE_AUTH_USERNAME` and `VITE_AUTH_PASSWORD`.

## Routes
