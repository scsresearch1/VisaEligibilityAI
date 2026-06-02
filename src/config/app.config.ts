/**
 * Application configuration — edit values here directly.
 * No Netlify env vars or .env — all config lives in this file (committed for deploy).
 */
export const appConfig = {
  appName: 'Visa Eligibility AI',
  tagline: 'Intelligent visa pathway assessment',
  supportEmail: 'support@example.com',

  /** Firebase — replace with your project values when ready */
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000',
  },

  /** API base URL for future backend integration */
  apiBaseUrl: 'https://api.example.com',

  /** Default login (local / demo — replace when Firebase auth is enabled) */
  auth: {
    username: 'admin',
    password: 'visaadm',
  },

  /** LLM — Gemini (default) or Groq; keys live here for local + Netlify deploy */
  llm: {
    provider: 'gemini' as 'gemini' | 'groq' | 'off',
    /** Google AI Studio key — must start with AIza (https://aistudio.google.com/apikey) */
    geminiApiKey: 'YOUR_GEMINI_API_KEY',
    /** 1.5-flash retired on v1beta — use 2.5/2.0; fallbacks on 404 or 429 */
    geminiModel: 'gemini-2.5-flash',
    /** Only used on 404 — not on 429 (same quota). Keep empty to avoid extra calls. */
    geminiModelFallbacks: [] as string[],
    groqApiKey: 'YOUR_GROQ_API_KEY',
    groqModel: 'llama-3.1-8b-instant',
    maxProfileChars: 8000,
    groqMaxProfileChars: 4500,
    groqMaxSystemChars: 5000,
    groqMaxUserChars: 6000,
    /** Lower = more consistent rubric scores (0–1) */
    temperature: 0.2,
    topP: 0.9,
    /** When true (default), assessment/report/roadmap must come from LLM — no heuristic fallbacks. */
    requireLlmOutput: true,
  },

  /** Feature flags */
  features: {
    enableGoogleSignIn: false,
    enableRegistration: true,
  },
} as const

export type AppConfig = typeof appConfig
