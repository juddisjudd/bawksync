import { serve } from '@hono/node-server'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createApp, MIN_TOKEN_LENGTH, VERSION, weakToken } from './app.ts'
import { SqliteStore } from './store-sqlite.ts'

const port = Number(process.env.PORT ?? 8787)
// plain http, so only this machine by default; put it behind a TLS proxy before opening it up
const hostname = process.env.HOST ?? '127.0.0.1'
const dbPath = process.env.BAWKSYNC_DB ?? './data/bawksync.db'

const split = (text: string): string[] =>
  text
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)

// tokens come from BAWKSYNC_TOKENS, then BAWKSYNC_TOKENS_FILE (Docker secrets), then a tokens file next to the
// database that is created with one fresh token on first start, so a NAS install needs no manual setup
function loadTokens(): string[] {
  if (process.env.BAWKSYNC_TOKENS) return split(process.env.BAWKSYNC_TOKENS)
  const file = process.env.BAWKSYNC_TOKENS_FILE ?? join(dirname(dbPath), 'tokens')
  if (existsSync(file)) return split(readFileSync(file, 'utf8'))
  if (process.env.BAWKSYNC_TOKENS_FILE) {
    console.error(`[bawksync] BAWKSYNC_TOKENS_FILE points to ${file}, which does not exist`)
    process.exit(1)
  }
  const token = randomBytes(32).toString('base64url')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, token + '\n', { mode: 0o600 })
  console.log(`[bawksync] created a sync token and saved it in ${file}:`)
  console.log(`[bawksync]   ${token}`)
  console.log('[bawksync] enter it in bawkterm under settings → sync → Set up new sync. It is only shown this once.')
  return [token]
}

const tokens = loadTokens()
if (!tokens.length) {
  console.error('[bawksync] no tokens configured')
  process.exit(1)
}
if (tokens.some(weakToken)) {
  console.error(`[bawksync] every token must be random and at least ${MIN_TOKEN_LENGTH} characters (make one with "docker run --rm ghcr.io/juddisjudd/bawksync token" or "bun run token")`)
  process.exit(1)
}

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
