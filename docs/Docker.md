# Docker and Docker Compose

This works on any Linux machine with Docker: a VPS, a Raspberry Pi, a home server, or a NAS that runs Docker containers.

## With Docker Compose (recommended)

1. Make a folder for bawksync and go into it:

   ```sh
   mkdir -p ~/bawksync && cd ~/bawksync
   ```

2. Create `docker-compose.yml` with this content:

   ```yaml
   services:
     bawksync:
       image: ghcr.io/juddisjudd/bawksync:latest
       container_name: bawksync
       restart: unless-stopped
       ports:
         - "8787:8787"
       environment:
         PUID: "1000"   # your user id: run `id -u`
         PGID: "1000"   # your group id: run `id -g`
       volumes:
         - ./data:/data
   ```

3. Start it:

   ```sh
   docker compose up -d
   ```

4. Get your token from the log:

   ```sh
   docker compose logs bawksync
   ```

   Look for the line after `created a sync token`. The token is also saved in `./data/tokens`. Show it again any time with `docker compose exec bawksync bawksync tokens`.

5. Check that it answers:

   ```sh
   curl http://localhost:8787/v1/health
   ```

   You should see `{"ok":true,"name":"bawksync",...}`.

Next: [reach it from your other devices](Remote-access.md), then [connect bawkterm](Connect-bawkterm.md).

## With plain docker run

```sh
docker run -d --name bawksync --restart unless-stopped \
  -p 8787:8787 \
  -e PUID="$(id -u)" -e PGID="$(id -g)" \
  -v bawksync-data:/data \
  ghcr.io/juddisjudd/bawksync:latest

docker exec bawksync bawksync tokens   # shows the token
```

## Choosing your own token

To set the token yourself instead of using the generated one:

1. Make a token:

   ```sh
   docker run --rm ghcr.io/juddisjudd/bawksync token
   ```

2. Pass it as `BAWKSYNC_TOKENS` (add `- BAWKSYNC_TOKENS=<token>` under `environment:`), or write it into `data/tokens`.
3. Restart the container.

Several tokens (for example one for you and one for a family member) go in the same setting, separated by commas. Each token is a separate, private space.

For Docker secrets, set `BAWKSYNC_TOKENS_FILE: /run/secrets/bawksync_tokens`.

## Without Docker

You need Node.js 24 or newer and [Bun](https://bun.sh):

```sh
git clone https://github.com/juddisjudd/bawksync.git
cd bawksync
bun install --production
HOST=0.0.0.0 bun run start
```

Run it under a service manager (systemd, pm2) so it restarts after a reboot.
