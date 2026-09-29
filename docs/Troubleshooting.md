# Troubleshooting

Start by checking two things:

1. The container log (`docker logs bawksync`, or the **Logs** view on Unraid and TrueNAS).
2. The health address in a browser: `http://<server>:8787/v1/health` should show `{"ok":true,"name":"bawksync",...}`.

## bawkterm says "Use https:// for servers outside your local network"

bawkterm only sends your token over plain `http://` to private addresses:

- `192.168.x.x`, `10.x.x.x` and `172.16.x.x`–`172.31.x.x`
- Tailscale's `100.64.x.x`–`100.127.x.x`
- `localhost`

Names like `nas.local` or `sync.mydomain.com` need HTTPS. Use the server's IP address, or set up HTTPS as described in [Remote access](Remote-access.md).

## "Cannot reach the sync server"

- Check the health address from the same computer that runs bawkterm.
- Check the port mapping. The container listens on `8787`. If you mapped another host port (for example `18787:8787`), use the host port in the address.
- Check the firewall on the server, and that both devices are on the same network or the same tailnet.

## "The sync server rejected the token"

- Show the token again with `docker exec bawksync bawksync tokens` and copy it. Watch for missing characters and extra spaces.
- If you set `BAWKSYNC_TOKENS`, it replaces `/data/tokens` completely.

## I lost my token

- **A device still syncs:** its **Copy sync link** contains the token. Join your other devices with that link. You do not need the token itself.
- **Docker, Unraid, TrueNAS, HexOS:** run `bawksync tokens` in the container: `docker exec bawksync bawksync tokens`, or open the container's console or shell and type `bawksync tokens`. Without Docker, run `bun run tokens` in the bawksync folder.
- **Cloudflare Workers:** Cloudflare never shows a secret again. Make a new token (`bun run token`), store it with `bunx wrangler secret put BAWKSYNC_TOKENS`, then use **Set up new sync** in bawkterm with the new token.

## The container stops right after starting

- `every token must be random and at least 32 characters`: your token is too short or too simple. Make one with `docker run --rm ghcr.io/juddisjudd/bawksync token`.
- `EACCES` or `permission denied` on `/data`: the data folder is not writable by the container's user. Either:
  - start the container as root and set `PUID`/`PGID`, so it fixes ownership itself; or
  - if your platform forces a user (TrueNAS **Run As**, Compose `user:`), give that user write access to the folder.
- `BAWKSYNC_TOKENS_FILE points to ..., which does not exist`: the secret file path is wrong.

## "This server already holds a synced vault for that token"

That token's space already has data, for example from an earlier setup. bawkterm offers two ways on:

- **A device still syncs:** cancel, then join from that device (**Copy sync link**, then **Join with sync link**).
- **No device syncs anymore:** choose **Erase and start fresh**. The old server copy is deleted and this device's vault is uploaded with a new key. The erased copy cannot be recovered.

Erasing needs bawksync 0.2 or newer. An older server answers *"This bawksync server is too old to erase its copy"*; update it first.

## "Sync was reset from another device"

Another device erased the server copy and started over with a new key. This device stopped syncing before uploading anything. Choose **Stop syncing**, then **Join with sync link** with the link from the device that started over. Your hosts and keys on this device are merged in.

## "Sync server error 413"

Each token can hold 50,000 records or 128 MB, far more than a normal vault. Hitting the limit usually means a script pushed test data with your real token. Use a new token, or delete the data folder and set sync up again.

## Reset everything

1. Stop the container.
2. Delete the data folder, or just `bawksync.db*` to keep your token.
3. Start it again.
4. In bawkterm, **Stop syncing** on every device, then **Set up new sync** on one and **Join** on the rest.
