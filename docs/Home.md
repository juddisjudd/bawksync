# bawksync self-hosting guide

bawksync is the sync server for [bawkterm](https://github.com/juddisjudd/bawkterm). It keeps your devices' vaults in step. Everything is encrypted on your devices before it reaches the server, so the server only ever stores data it cannot read.

These pages walk you through running your own copy.

## Pick a guide

| You have | Guide |
| --- | --- |
| Any machine with Docker (a VPS, a Raspberry Pi, a home server) | [Docker and Docker Compose](Docker.md) |
| Unraid | [Unraid](Unraid.md) |
| TrueNAS Community Edition (formerly TrueNAS SCALE) | [TrueNAS](TrueNAS.md) |
| HexOS | [HexOS](HexOS.md) |
| A Cloudflare account and no server | [Cloudflare Workers](Cloudflare-Workers.md) |

After installing:

1. [Reach it from outside your home](Remote-access.md) (Tailscale, a reverse proxy or Cloudflare Tunnel).
2. [Connect bawkterm](Connect-bawkterm.md).
3. Read [Backups and updates](Backups-and-updates.md).

Stuck? See [Troubleshooting](Troubleshooting.md).

## What you need to know first

- **One container, one port, one folder.** The server listens on port `8787`. It keeps everything in one folder, mounted at `/data`: a SQLite database and a `tokens` file.
- **A token is your password for the server.** On first start, bawksync creates one and prints it once in the container log. Anyone with the token can store and delete data on your server, but cannot read it.
- **The sync link is the real secret.** bawkterm's sync link contains the server address, the token *and* your encryption key. Treat it like a password.
- **The server speaks plain HTTP.** bawkterm only accepts `http://` for addresses on your own network (like `192.168.1.20`) or Tailscale (`100.x.y.z`). Anywhere else needs HTTPS. [Remote access](Remote-access.md) shows the easy ways to get it.
- **Small footprint.** It idles at well under 100 MB of memory and needs almost no CPU. It runs on `amd64` and `arm64` (for example Raspberry Pi 4 and 5).

## Settings reference

| Variable | Default | Meaning |
| --- | --- | --- |
| `PUID` / `PGID` | `1000` / `1000` | the user and group that own `/data` and run the server. Unraid uses `99` / `100`; TrueNAS uses `568` / `568`. |
| `BAWKSYNC_TOKENS` | unset | comma-separated tokens (32+ random characters each). When unset, the tokens come from `/data/tokens`, which is created with one token on first start. |
| `BAWKSYNC_TOKENS_FILE` | `/data/tokens` | read tokens from this file instead, for example a Docker secret |
| `PORT` | `8787` | listen port inside the container |
| `HOST` | `0.0.0.0` in the image | listen address inside the container |
| `BAWKSYNC_DB` | `/data/bawksync.db` | database file |

Make a new token any time with:

```sh
docker run --rm ghcr.io/juddisjudd/bawksync token
```
