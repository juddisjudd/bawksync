// Smoke test a running bawksync over HTTP: node scripts/smoke.ts <baseUrl> <token>
import assert from 'node:assert/strict'

const [base, token] = process.argv.slice(2)
if (!base || !token) {
  console.error('usage: node scripts/smoke.ts <baseUrl> <token>')
  process.exit(1)
}

const call = async (method: string, path: string, body?: unknown, auth = token) => {
  const res = await fetch(new URL(path, base), {
    method,
    headers: { authorization: `Bearer ${auth}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  return { status: res.status, body: (await res.json().catch(() => null)) as any }
}

const run = Date.now().toString(36)
const id = (n: string) => `${run}-${n}`

assert.equal((await call('GET', '/v1/health')).status, 200)
assert.equal((await call('GET', '/v1/records', undefined, 'nope'.repeat(8))).status, 401)

const start = (await call('GET', '/v1/records?since=0&limit=500')).body
let since = start.seq
while ((await call('GET', `/v1/records?since=${since}&limit=500`)).body.more) since += 500

const push = await call('POST', '/v1/records', {
  records: [
    { id: id('a'), updatedAt: 10, deleted: false, blob: 'A1' },
    { id: id('b'), updatedAt: 10, deleted: false, blob: 'B1' }
  ]
})
assert.equal(push.status, 200)
assert.deepEqual(push.body.rejected, [])

const stale = await call('POST', '/v1/records', { records: [{ id: id('a'), updatedAt: 5, deleted: false, blob: 'old' }] })
assert.deepEqual(stale.body.rejected, [id('a')])

await call('POST', '/v1/records', { records: [{ id: id('b'), updatedAt: 20, deleted: true, blob: '' }] })

const pulled = (await call('GET', '/v1/records?since=0&limit=500')).body.records.filter((r: any) => r.id.startsWith(run))
assert.equal(pulled.length, 2)
assert.equal(pulled.find((r: any) => r.id === id('a')).blob, 'A1')
assert.equal(pulled.find((r: any) => r.id === id('b')).deleted, true)
assert.ok(pulled[0].seq < pulled[1].seq)

console.log(`smoke ok against ${base}`)
