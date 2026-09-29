# bawksync

The sync server for [bawkterm](https://github.com/juddisjudd/bawkterm). It stores end-to-end encrypted records and nothing else.

**Self-hosting guides:** [Docker](docs/Docker.md) · [Unraid](docs/Unraid.md) · [TrueNAS](docs/TrueNAS.md) · [HexOS](docs/HexOS.md) · [Cloudflare Workers](docs/Cloudflare-Workers.md) · [Remote access](docs/Remote-access.md) · [all guides](docs/Home.md)

Quick start with Docker:

```sh
docker run -d --name bawksync --restart unless-stopped -p 8787:8787 -v bawksync-data:/data ghcr.io/juddisjudd/bawksync:latest
docker logs bawksync   # shows your token once
```

## What the server can and cannot do

bawkterm encrypts every item on the device before it leaves. The server only ever holds:

- an opaque record ID (an HMAC of the item ID, so it cannot tell hosts from keys),
- a timestamp and a "deleted" flag,
- an AES-256-GCM ciphertext, padded to whole KiB.

It never sees hostnames, usernames, passwords, private keys, labels or the encryption key.

**It cannot** read items, forge them, delete them on your devices (deletions are decided inside the encrypted data), or bring back a deleted item by replaying an old copy (devices remember deletions).

**It can** refuse service, lose data, or see how many records you have, how big they are and when they change. Each device keeps its own copy, so a lost server means setting sync up again, not losing your vault.

### Tokens

- Each token is its own separate space. The server stores only the token's SHA-256 hash.
- Anyone with a token can overwrite or delete records in its space, but cannot read them without the key from the bawkterm sync link.
- There is no rate limit on guesses. Instead, tokens must be at least 32 random characters. The server makes one with 256 bits of randomness on first start, or you can make one with `docker run --rm ghcr.io/juddisjudd/bawksync token` or `bun run token`.

### Limits

| Limit | Value |
| --- | --- |
| request body | 8 MB |
| records per push | 500 |
| records per pull page | 100 |
| size of one record | 256 KB |
| records per token | 50,000 |
| stored data per token | 128 MB |

## Run it

The image `ghcr.io/juddisjudd/bawksync` runs on `amd64` and `arm64`. Step-by-step guides live in [docs/](docs/Home.md), and are mirrored to the wiki:

- [Docker and Docker Compose](docs/Docker.md), including running without Docker
- [Unraid](docs/Unraid.md), [TrueNAS](docs/TrueNAS.md) and [HexOS](docs/HexOS.md)
- [Cloudflare Workers + D1](docs/Cloudflare-Workers.md), no server needed
- [Remote access](docs/Remote-access.md): Tailscale, reverse proxies, Cloudflare Tunnel
- [Backups and updates](docs/Backups-and-updates.md) and [Troubleshooting](docs/Troubleshooting.md)

| Variable | Default | Meaning |
| --- | --- | --- |
| `PUID` / `PGID` | `1000` / `1000` | owner of `/data` and the user the server runs as (Docker image only) |
| `BAWKSYNC_TOKENS` | unset | comma-separated tokens, 32+ random characters each |
| `BAWKSYNC_TOKENS_FILE` | `<database folder>/tokens` | file with tokens; created with one fresh token on first start when nothing else is set |
| `PORT` | `8787` | listen port |
| `HOST` | `127.0.0.1` (`0.0.0.0` in Docker) | listen address |
| `BAWKSYNC_DB` | `./data/bawksync.db` (`/data/bawksync.db` in Docker) | SQLite file |

The server speaks plain HTTP. bawkterm only accepts `http://` for private IP addresses, Tailscale addresses and `localhost`; anything else needs HTTPS in front.

## Connect bawkterm

1. First device: settings → sync → **Set up new sync**, then enter the server URL and token.
2. On that device: **Copy sync link** (asks for the master password).
3. Other devices: settings → sync → **Join with sync link**.

The sync link holds the URL, the token and the encryption key. Treat it like a password.

To rotate a token:

1. Create a new token and deploy it.
2. Set up sync again on one device.
3. Re-join the other devices with the new link.

## Develop

Needs [Bun](https://bun.sh) 1.4+ and Node 24+. The server itself runs on Node, for its built-in SQLite.

```sh
bun install
bun run dev                          # server with reload on change
bun run test                         # API tests against in-memory SQLite
bun run typecheck
node scripts/smoke.ts <url> <token>  # HTTP smoke test against a running server
docker build -t bawksync .           # the same image CI publishes
```

`bunfig.toml` only installs package versions that have been public for at least a day.

Pushing to `main` publishes `ghcr.io/juddisjudd/bawksync:latest`. Tags `vX.Y.Z` also publish `X.Y.Z` and `X.Y`. Changes in `docs/` are copied to the wiki.

Do not run the smoke test with a token your devices use. It leaves test records, and bawkterm refuses to set up new sync on a space that is not empty.

## API

All `/v1/*` routes except `/v1/health` need `Authorization: Bearer <token>`.

- `GET /v1/health` → `{ ok, name, version }`
- `GET /v1/info` → `{ records }`
- `GET /v1/records?since=<seq>&limit=<n>` → `{ records: [{ id, seq, updatedAt, deleted, blob }], seq, more }`
- `POST /v1/records` `{ records: [{ id, updatedAt, deleted, blob }] }` → `{ seq, rejected: [id] }`
  - A record whose `updatedAt` is not newer than the stored one is rejected.
  - Returns `413` when the token's storage limit would be exceeded.

## Security

See [SECURITY.md](SECURITY.md) to report a problem.

## License

[GNU Affero General Public License v3.0](LICENSE). If you run a changed version of bawksync as a service for others, you must offer them its source under the same license.
