# Visa Eligibility AI

Professional React application for U.S. visa eligibility assessment — landing page, authentication UI, and Netlify-ready deployment.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

Copy **`src/config/app.config.example.ts`** to **`src/config/app.config.ts`** and add your Gemini/Groq keys. `app.config.ts` is gitignored so keys are not pushed to GitHub.

## Deploy to Netlify

1. Connect this repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`

`netlify.toml` is included with SPA redirects.

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
