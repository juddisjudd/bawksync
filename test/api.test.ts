import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.ts'
import { SqliteStore } from '../src/store-sqlite.ts'

const TOKEN_A = 'a'.repeat(32)
const TOKEN_B = 'b'.repeat(32)

function setup() {
  const app = createApp({ store: new SqliteStore(':memory:'), tokens: [TOKEN_A, TOKEN_B] })
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  }
  return { call }
}

const rec = (id: string, updatedAt: number, blob = `blob-${id}-${updatedAt}`, deleted = false) => ({
  id,
  updatedAt,
  deleted,
  blob
})

test('health is public, records need a valid token', async () => {
  const { call } = setup()
  assert.equal((await call('GET', '/v1/health')).status, 200)
  assert.equal((await call('GET', '/v1/records')).status, 401)
  assert.equal((await call('GET', '/v1/records', 'x'.repeat(32))).status, 401)
  assert.equal((await call('GET', '/v1/records', TOKEN_A)).status, 200)
})

test('push then pull returns records in seq order', async () => {
  const { call } = setup()
  const push = await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 10), rec('h2', 20)] })
  assert.equal(push.status, 200)
  assert.deepEqual(push.body.rejected, [])
  const pull = await call('GET', '/v1/records?since=0', TOKEN_A)
  assert.deepEqual(
    pull.body.records.map((r: { id: string }) => r.id),
    ['h1', 'h2']
  )
  assert.equal(pull.body.more, false)
  assert.equal(pull.body.seq, pull.body.records[1].seq)
  const again = await call('GET', `/v1/records?since=${pull.body.seq}`, TOKEN_A)
  assert.equal(again.body.records.length, 0)
  assert.equal(again.body.seq, pull.body.seq)
})

test('last write wins: older or equal updatedAt is rejected', async () => {
  const { call } = setup()
  await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 100, 'new')] })
  const stale = await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 50, 'old'), rec('h1', 100, 'same')] })
  assert.deepEqual(stale.body.rejected, ['h1', 'h1'])
  const newer = await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 150, 'newer')] })
  assert.deepEqual(newer.body.rejected, [])
  const pull = await call('GET', '/v1/records?since=0', TOKEN_A)
  assert.equal(pull.body.records.length, 1)
  assert.equal(pull.body.records[0].blob, 'newer')
})

test('tombstones replace records and are not counted', async () => {
  const { call } = setup()
  await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 10), rec('h2', 10)] })
  await call('POST', '/v1/records', TOKEN_A, { records: [rec('h1', 20, '', true)] })
  const info = await call('GET', '/v1/info', TOKEN_A)
  assert.equal(info.body.records, 1)
  const pull = await call('GET', '/v1/records?since=0', TOKEN_A)
  const h1 = pull.body.records.find((r: { id: string }) => r.id === 'h1')
  assert.equal(h1.deleted, true)
})

test('pagination with limit and more flag', async () => {
  const { call } = setup()
  const records = Array.from({ length: 7 }, (_, i) => rec(`r${i}`, i + 1))
  await call('POST', '/v1/records', TOKEN_A, { records })
  const seen: string[] = []
  let since = 0
  for (;;) {
    const page = await call('GET', `/v1/records?since=${since}&limit=3`, TOKEN_A)
    seen.push(...page.body.records.map((r: { id: string }) => r.id))
    since = page.body.seq
    if (!page.body.more) break
  }
  assert.deepEqual(seen, records.map((r) => r.id))
})

test('tokens are isolated spaces', async () => {
  const { call } = setup()
  await call('POST', '/v1/records', TOKEN_A, { records: [rec('secret', 1)] })
  const other = await call('GET', '/v1/records?since=0', TOKEN_B)
  assert.equal(other.body.records.length, 0)
})

test('rejects malformed input', async () => {
  const { call } = setup()
  assert.equal((await call('POST', '/v1/records', TOKEN_A, { records: [{ id: 'x' }] })).status, 400)
  assert.equal((await call('POST', '/v1/records', TOKEN_A, { nope: 1 })).status, 400)
  assert.equal((await call('POST', '/v1/records', TOKEN_A, { records: [rec('x', -1)] })).status, 400)
  assert.equal((await call('POST', '/v1/records', TOKEN_A, { records: [rec('x', 1, 'z'.repeat(300 * 1024))] })).status, 400)
  assert.equal((await call('GET', '/v1/records?since=-4', TOKEN_A)).status, 400)
})
