/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_TAGLINE: string
  readonly VITE_SUPPORT_EMAIL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_AUTH_USERNAME: string
  readonly VITE_AUTH_PASSWORD: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_LLM_PROVIDER: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GEMINI_MODEL: string
  readonly VITE_GEMINI_MODEL_FALLBACKS: string
  readonly VITE_GROQ_API_KEY: string
  readonly VITE_GROQ_MODEL: string
  readonly VITE_MAX_PROFILE_CHARS: string
  readonly VITE_GROQ_MAX_PROFILE_CHARS: string
  readonly VITE_GROQ_MAX_SYSTEM_CHARS: string
  readonly VITE_GROQ_MAX_USER_CHARS: string
  readonly VITE_GROQ_MAX_INPUT_TOKENS: string
  readonly VITE_GROQ_MAX_INPUT_TOKENS_AGGRESSIVE: string
  readonly VITE_GROQ_MAX_COMPLETION_TOKENS: string
  readonly VITE_GROQ_MAX_COMPLETION_TOKENS_LARGE_JSON: string
  readonly VITE_GROQ_MAX_COMPLETION_TOKENS_ROADMAP: string
  readonly VITE_GROQ_MAX_COMPLETION_TOKENS_AGGRESSIVE: string
  readonly VITE_LLM_TEMPERATURE: string
  readonly VITE_LLM_TOP_P: string
  readonly VITE_REQUIRE_LLM_OUTPUT: string
  readonly VITE_ENABLE_GOOGLE_SIGN_IN: string
  readonly VITE_ENABLE_REGISTRATION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
