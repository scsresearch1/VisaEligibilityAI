import fs from 'fs'

const hasEnvFile = fs.existsSync('.env') || fs.existsSync('.env.local')
const hasCiEnv =
  Boolean(process.env.CI) ||
  Boolean(process.env.NETLIFY) ||
  Boolean(process.env.VITE_GEMINI_API_KEY) ||
  Boolean(process.env.VITE_GROQ_API_KEY)

if (!hasEnvFile && !hasCiEnv) {
  console.warn(
    '[config] No .env file and no VITE_* vars in the environment.\n' +
      '       Copy .env.example → .env for local dev, or set variables in Netlify.\n' +
      '       See NETLIFY_ENV.md',
  )
}
