import fs from 'fs'
import path from 'path'

const target = path.join('src', 'config', 'app.config.ts')
const example = path.join('src', 'config', 'app.config.example.ts')

if (!fs.existsSync(target)) {
  if (!fs.existsSync(example)) {
    console.error('Missing src/config/app.config.ts and app.config.example.ts')
    process.exit(1)
  }
  fs.copyFileSync(example, target)
  console.warn(
    'Created src/config/app.config.ts from example — add API keys in that file for LLM features.',
  )
}
