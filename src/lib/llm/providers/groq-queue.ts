/** Serialize Groq calls and space them apart — free tier is ~6000 TPM. */
const MIN_GAP_MS = 4500

let chain: Promise<unknown> = Promise.resolve()
let lastGroqFinishTime = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function enqueueGroqRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    if (lastGroqFinishTime > 0) {
      const elapsed = Date.now() - lastGroqFinishTime
      if (elapsed < MIN_GAP_MS) {
        await sleep(MIN_GAP_MS - elapsed)
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
      if (elapsed < MIN_GAP_MS) {
        await sleep(MIN_GAP_MS - elapsed)
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
export function delayBetweenGroqCalls(ms = MIN_GAP_MS): Promise<void> {
  return sleep(ms)
}
