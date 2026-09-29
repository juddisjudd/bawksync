import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { IncomingRecord, Store } from './store.ts'
import { FAVICON, PAGE_HEADERS, landingPage } from './page.ts'

export const VERSION = '0.2.0'
// pullPage keeps one response under ~25 MB even when every blob is at the size limit
export const LIMITS = {
  body: 8 * 1024 * 1024,
  recordsPerPush: 500,
  pullPage: 100,
  blob: 256 * 1024,
  id: 128,
  recordsPerSpace: 50_000,
  bytesPerSpace: 128 * 1024 * 1024
}

// tokens are bearer secrets with no rate limit in front of them, so they must be long and random
export const MIN_TOKEN_LENGTH = 32

export function weakToken(token: string): boolean {
  return token.length < MIN_TOKEN_LENGTH || new Set(token).size < 12
}

export interface AppOptions {
  store: Store
  tokens: string[]
}

type Env = { Variables: { space: string } }

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function validRecord(r: unknown): r is IncomingRecord {
  if (!r || typeof r !== 'object') return false
  const { id, updatedAt, deleted, blob } = r as Record<string, unknown>
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= LIMITS.id &&
    Number.isSafeInteger(updatedAt) &&
    (updatedAt as number) >= 0 &&
    typeof deleted === 'boolean' &&
    typeof blob === 'string' &&
    blob.length <= LIMITS.blob
  )
}

export function createApp({ store, tokens }: AppOptions): Hono<Env> {
  const spaces = Promise.all(tokens.map(sha256)).then((hashes) => new Set(hashes))
  const app = new Hono<Env>()

  app.onError((err, c) => {
    console.error('[bawksync]', err)
    return c.json({ error: 'internal error' }, 500)
  })

  app.get('/', (c) => {
    const url = new URL(c.req.url)
    const proto = c.req.header('x-forwarded-proto')?.split(',')[0].trim()
    if (proto === 'http' || proto === 'https') url.protocol = `${proto}:`
    return c.html(landingPage(url.origin, VERSION), 200, PAGE_HEADERS)
  })
  app.get('/favicon.svg', (c) =>
    c.body(FAVICON, 200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400', ...PAGE_HEADERS })
  )
  app.get('/v1/health', (c) => c.json({ ok: true, name: 'bawksync', version: VERSION }))

  app.use('/v1/*', async (c, next) => {
    if (c.req.path === '/v1/health') return next()
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const space = token ? await sha256(token) : ''
    if (!space || !(await spaces).has(space)) return c.json({ error: 'unauthorized' }, 401)
    c.set('space', space)
    await next()
  })

  app.get('/v1/info', async (c) => {
    return c.json({ records: await store.count(c.get('space')), version: VERSION })
  })

  app.get('/v1/records', async (c) => {
    const since = Number(c.req.query('since') ?? 0)
    const limit = Math.min(Number(c.req.query('limit') ?? LIMITS.pullPage), LIMITS.pullPage)
    if (!Number.isSafeInteger(since) || since < 0 || !Number.isSafeInteger(limit) || limit < 1) {
      return c.json({ error: 'bad query' }, 400)
    }
    return c.json(await store.pull(c.get('space'), since, limit))
  })

  // anyone with the token can already delete records one by one, so erasing them all adds no new power
  app.delete('/v1/records', async (c) => {
    await store.clear(c.get('space'))
    return c.json({ ok: true })
  })

  app.post(
    '/v1/records',
    bodyLimit({ maxSize: LIMITS.body, onError: (c) => c.json({ error: 'body too large' }, 413) }),
    async (c) => {
      const body = await c.req.json().catch(() => null)
      const records: unknown = body?.records
      if (!Array.isArray(records) || records.length > LIMITS.recordsPerPush || !records.every(validRecord)) {
        return c.json({ error: 'bad records' }, 400)
      }
      const usage = await store.usage(c.get('space'))
      const incoming = records.reduce((n, r) => n + r.blob.length, 0)
      if (usage.records + records.length > LIMITS.recordsPerSpace || usage.bytes + incoming > LIMITS.bytesPerSpace) {
        return c.json({ error: 'storage limit reached' }, 413)
      }
      return c.json(await store.push(c.get('space'), records))
    }
  )

  return app
}
