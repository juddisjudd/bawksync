# bawksync

Sync server for [bawkterm](../bawkterm). It stores end-to-end encrypted records and nothing else.

## What the server sees

- An opaque record ID (HMAC of the item ID), a timestamp, a deleted flag and an AES-256-GCM ciphertext.
- It never sees hostnames, usernames, passwords, keys, labels or the encryption key.
- Each token is its own space (stored as a SHA-256 hash). Anyone with a token can overwrite or delete records in that space, but cannot read them without the key from the bawkterm sync link.

Conflicts resolve per item: the newest edit wins.

## Run with Docker (Coolify, any VPS)

```sh
pnpm token                      # prints a random token
docker build -t bawksync .
docker run -d --name bawksync -p 8787:8787 \
  -e BAWKSYNC_TOKENS=<token> \
  -v bawksync-data:/data \
  bawksync
```

Put it behind HTTPS (Coolify's proxy, Caddy, Cloudflare Tunnel). bawkterm only accepts plain `http://` for local network addresses.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BAWKSYNC_TOKENS` | required | comma-separated tokens, 24+ characters each |
| `PORT` | `8787` | listen port |
| `HOST` | `0.0.0.0` | listen address |
| `BAWKSYNC_DB` | `./data/bawksync.db` (`/data/bawksync.db` in Docker) | SQLite file |

Without Docker: `BAWKSYNC_TOKENS=<token> pnpm start` (Node 24+).

## Run on Cloudflare Workers + D1

```sh
pnpm wrangler d1 create bawksync      # copy the database_id into wrangler.jsonc
pnpm worker:migrate
pnpm wrangler secret put BAWKSYNC_TOKENS
pnpm worker:deploy
```

## Connect bawkterm

1. First device: settings → sync → **Set up new sync**, enter the server URL and token.
2. Same screen: **Copy sync link**.
3. Other devices: settings → sync → **Join with sync link**.

The sync link holds the URL, token and encryption key. Treat it like a password.

## Develop

```sh
pnpm install
pnpm test                          # API tests against in-memory SQLite
pnpm typecheck
node scripts/smoke.ts <url> <token>  # HTTP smoke test against a running server
```

## API

All `/v1/*` routes except `/v1/health` need `Authorization: Bearer <token>`.

- `GET /v1/health` → `{ ok, name, version }`
- `GET /v1/info` → `{ records }`
- `GET /v1/records?since=<seq>&limit=<n>` → `{ records: [{ id, seq, updatedAt, deleted, blob }], seq, more }`
- `POST /v1/records` `{ records: [{ id, updatedAt, deleted, blob }] }` → `{ seq, rejected: [id] }`. A record with an `updatedAt` that is not newer than the stored one is rejected.
