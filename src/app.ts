import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { IncomingRecord, Store } from './store.ts'

export const VERSION = '0.1.0'
export const LIMITS = {
  body: 8 * 1024 * 1024,
  recordsPerPush: 500,
  pullPage: 500,
  blob: 256 * 1024,
  id: 128
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

  app.get('/', (c) => c.text('bawksync'))
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

  app.post(
    '/v1/records',
    bodyLimit({ maxSize: LIMITS.body, onError: (c) => c.json({ error: 'body too large' }, 413) }),
    async (c) => {
      const body = await c.req.json().catch(() => null)
      const records: unknown = body?.records
      if (!Array.isArray(records) || records.length > LIMITS.recordsPerPush || !records.every(validRecord)) {
        return c.json({ error: 'bad records' }, 400)
      }
      return c.json(await store.push(c.get('space'), records))
    }
  )

  return app
}
