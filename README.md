# Visa Eligibility AI

Professional React application for U.S. visa eligibility assessment — landing page, authentication UI, and Netlify-ready deployment.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

All settings (Gemini/Groq keys, auth, Firebase placeholders) live in **`src/config/app.config.ts`** in the repo — **no Netlify environment variables** and no `.env` files.

For a new clone, copy `src/config/app.config.example.ts` to `src/config/app.config.ts` and add your keys.

## Deploy to Netlify

1. Connect this repository to Netlify (no env vars to configure in the Netlify UI).
2. Netlify reads **`netlify.toml`**: build `npm run build`, publish `dist`.
3. Ensure **`src/config/app.config.ts`** is committed with your API keys before deploy (same file you use locally).

SPA redirects are included in `netlify.toml`.

After deploy, edit **`src/config/app.config.ts`** on GitHub (or locally) and paste your Gemini/Groq keys — no Netlify dashboard env vars. Alternatively, allow GitHub push protection and commit the real keys in that file.

## Default login (local testing)

| Field    | Value     |
|----------|-----------|
| Username | `admin`   |
| Password | `visaadm` |

Credentials are defined in `src/config/app.config.ts` under `auth`.

## Routes

| Path          | Page      |
|---------------|-----------|
| `/`           | Landing   |
| `/login`      | Sign in   |
| `/dashboard`  | Dashboard (after login) |
