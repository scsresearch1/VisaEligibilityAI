/**
 * Copy to app.config.ts and add your API keys (app.config.ts is gitignored).
 */
export const appConfig = {
  appName: 'Visa Eligibility AI',
  tagline: 'Intelligent visa pathway assessment',
  supportEmail: 'support@example.com',

  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000',
  },

  apiBaseUrl: 'https://api.example.com',

  auth: {
    username: 'admin',
    password: 'visaadm',
  },

  llm: {
    provider: 'gemini' as 'gemini' | 'groq' | 'off',
    geminiApiKey: 'YOUR_GEMINI_API_KEY',
    geminiModel: 'gemini-2.5-flash',
    geminiModelFallbacks: [] as string[],
    groqApiKey: 'YOUR_GROQ_API_KEY',
    groqModel: 'llama-3.3-70b-versatile',
    maxProfileChars: 14000,
    temperature: 0.2,
    topP: 0.9,
    requireLlmOutput: true,
  },

  features: {
    enableGoogleSignIn: false,
    enableRegistration: true,
  },
} as const

export type AppConfig = typeof appConfig
