/** Serialize Gemini calls so analysis + insights + report do not hammer the API in parallel. */
let chain: Promise<unknown> = Promise.resolve()

export function enqueueGeminiRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn(), () => fn())
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
