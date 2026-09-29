import { createApp, weakToken } from './app.ts'
import { D1Store, type D1Database } from './store-d1.ts'

interface Env {
  DB: D1Database
  BAWKSYNC_TOKENS: string
}

let cached: { tokens: string; app: ReturnType<typeof createApp> } | undefined

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    if (cached?.tokens !== env.BAWKSYNC_TOKENS) {
      const tokens = (env.BAWKSYNC_TOKENS ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => !weakToken(t))
      cached = { tokens: env.BAWKSYNC_TOKENS, app: createApp({ store: new D1Store(env.DB), tokens }) }
    }
    return cached.app.fetch(request)
  }
}
