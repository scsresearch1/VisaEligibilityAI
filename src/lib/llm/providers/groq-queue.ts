import { appConfig } from '../../../config/app.config'

/** Serialize Groq calls and space them apart — free tier is ~6000 TPM. */
function minGapMs(): number {
  const configured = appConfig.llm.groqMinGapMs
  return configured > 0 ? configured : 9000
}

let chain: Promise<unknown> = Promise.resolve()
let lastGroqFinishTime = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function enqueueGroqRequest<T>(fn: () => Promise<T>): Promise<T> {
  const gap = minGapMs()
  const run = chain.then(async () => {
    if (lastGroqFinishTime > 0) {
      const elapsed = Date.now() - lastGroqFinishTime
      if (elapsed < gap) {
        await sleep(gap - elapsed)
      }
    }
    try {
      return await fn()
    } finally {
      lastGroqFinishTime = Date.now()
    }
  }, async () => {
    if (lastGroqFinishTime > 0) {
      const elapsed = Date.now() - lastGroqFinishTime
      if (elapsed < gap) {
        await sleep(gap - elapsed)
      }
    }
    try {
      return await fn()
    } finally {
      lastGroqFinishTime = Date.now()
    }
  })

  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** @deprecated Queue enforces spacing; kept for explicit post-analysis pause. */
export function delayBetweenGroqCalls(ms?: number): Promise<void> {
  return sleep(ms ?? minGapMs())
}
