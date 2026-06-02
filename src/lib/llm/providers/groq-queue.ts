/** Serialize Groq calls — free tier is 6000 TPM; parallel/rapid calls cause 429. */
let chain: Promise<unknown> = Promise.resolve()

export function enqueueGroqRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn(), () => fn())
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** Pause between back-to-back Groq calls in the same assessment flow. */
export function delayBetweenGroqCalls(ms = 4500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
