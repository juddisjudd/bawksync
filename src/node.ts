import { serve } from '@hono/node-server'
import { createApp, VERSION } from './app.ts'
import { SqliteStore } from './store-sqlite.ts'

const tokens = (process.env.BAWKSYNC_TOKENS ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)

if (!tokens.length) {
  console.error('[bawksync] set BAWKSYNC_TOKENS to one or more comma-separated tokens (pnpm token makes one)')
  process.exit(1)
}
if (tokens.some((t) => t.length < 24)) {
  console.error('[bawksync] every token must be at least 24 characters')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 8787)
const hostname = process.env.HOST ?? '0.0.0.0'
const dbPath = process.env.BAWKSYNC_DB ?? './data/bawksync.db'
const store = new SqliteStore(dbPath)

const server = serve({ fetch: createApp({ store, tokens }).fetch, port, hostname }, () => {
  console.log(`[bawksync] v${VERSION} listening on ${hostname}:${port}, db ${dbPath}, ${tokens.length} token(s)`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close()
    store.close()
    process.exit(0)
  })
}
