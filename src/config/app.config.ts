/**
 * Application configuration — loaded from Vite environment variables (VITE_*).
 * Local: copy .env.example → .env
 * Netlify: Site settings → Environment variables (see NETLIFY_ENV.md)
 */
import { envBool, envCsv, envLlmProvider, envNumber, envString } from './env'

export type { LlmProvider } from './env'

export interface AppConfig {
  appName: string
  tagline: string
  supportEmail: string
  firebase: {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }
  apiBaseUrl: string
  auth: {
    username: string
    password: string
  }
  llm: {
    provider: import('./env').LlmProvider
    geminiApiKey: string
    geminiModel: string
    geminiModelFallbacks: string[]
    groqApiKey: string
    groqModel: string
    maxProfileChars: number
    groqMaxProfileChars: number
    groqMaxSystemChars: number
    groqMaxUserChars: number
    /** Input token budget for Groq on_demand (~6000 total incl. completion). */
    groqMaxInputTokens: number
    groqMaxInputTokensAggressive: number
    groqMaxCompletionTokens: number
    groqMaxCompletionTokensLargeJson: number
    groqMaxCompletionTokensRoadmap: number
    groqMaxCompletionTokensAggressive: number
    /** Minimum ms between queued Groq calls (free tier TPM). */
    groqMinGapMs: number
    temperature: number
    topP: number
    requireLlmOutput: boolean
  }
  features: {
    enableGoogleSignIn: boolean
    enableRegistration: boolean
  }
}

export const appConfig: AppConfig = {
  appName: envString('VITE_APP_NAME', 'Visa Eligibility AI'),
  tagline: envString('VITE_APP_TAGLINE', 'Intelligent visa pathway assessment'),
  supportEmail: envString('VITE_SUPPORT_EMAIL', 'support@example.com'),

  firebase: {
    apiKey: envString('VITE_FIREBASE_API_KEY'),
    authDomain: envString('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: envString('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: envString('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: envString('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: envString('VITE_FIREBASE_APP_ID'),
  },

  apiBaseUrl: envString('VITE_API_BASE_URL', 'https://api.example.com'),

  auth: {
    username: envString('VITE_AUTH_USERNAME', 'admin'),
    password: envString('VITE_AUTH_PASSWORD', 'visaadm'),
  },

  llm: {
    provider: envLlmProvider('VITE_LLM_PROVIDER', 'hybrid'),
    geminiApiKey: envString('VITE_GEMINI_API_KEY'),
    geminiModel: envString('VITE_GEMINI_MODEL', 'gemini-2.5-flash'),
    geminiModelFallbacks: envCsv('VITE_GEMINI_MODEL_FALLBACKS'),
    groqApiKey: envString('VITE_GROQ_API_KEY'),
    groqModel: envString('VITE_GROQ_MODEL', 'llama-3.1-8b-instant'),
    maxProfileChars: envNumber('VITE_MAX_PROFILE_CHARS', 8000),
    groqMaxProfileChars: envNumber('VITE_GROQ_MAX_PROFILE_CHARS', 2800),
    groqMaxSystemChars: envNumber('VITE_GROQ_MAX_SYSTEM_CHARS', 2400),
    groqMaxUserChars: envNumber('VITE_GROQ_MAX_USER_CHARS', 2800),
    groqMaxInputTokens: envNumber('VITE_GROQ_MAX_INPUT_TOKENS', 3800),
    groqMaxInputTokensAggressive: envNumber('VITE_GROQ_MAX_INPUT_TOKENS_AGGRESSIVE', 3200),
    groqMaxCompletionTokens: envNumber('VITE_GROQ_MAX_COMPLETION_TOKENS', 1200),
    groqMaxCompletionTokensLargeJson: envNumber('VITE_GROQ_MAX_COMPLETION_TOKENS_LARGE_JSON', 1800),
    groqMaxCompletionTokensRoadmap: envNumber('VITE_GROQ_MAX_COMPLETION_TOKENS_ROADMAP', 1400),
    groqMaxCompletionTokensAggressive: envNumber('VITE_GROQ_MAX_COMPLETION_TOKENS_AGGRESSIVE', 1536),
    groqMinGapMs: envNumber('VITE_GROQ_MIN_GAP_MS', 9000),
    temperature: envNumber('VITE_LLM_TEMPERATURE', 0.2),
    topP: envNumber('VITE_LLM_TOP_P', 0.9),
    requireLlmOutput: envBool('VITE_REQUIRE_LLM_OUTPUT', true),
  },

  features: {
    enableGoogleSignIn: envBool('VITE_ENABLE_GOOGLE_SIGN_IN', false),
    enableRegistration: envBool('VITE_ENABLE_REGISTRATION', true),
  },
}
