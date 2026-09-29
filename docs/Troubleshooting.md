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

- Copy the token again from `/data/tokens` or the first-start log. Watch for missing characters and extra spaces.
- If you set `BAWKSYNC_TOKENS`, it replaces `/data/tokens` completely.

## The container stops right after starting

- `every token must be random and at least 32 characters`: your token is too short or too simple. Make one with `docker run --rm ghcr.io/juddisjudd/bawksync token`.
- `EACCES` or `permission denied` on `/data`: the data folder is not writable by the container's user. Either:
  - start the container as root and set `PUID`/`PGID`, so it fixes ownership itself; or
  - if your platform forces a user (TrueNAS **Run As**, Compose `user:`), give that user write access to the folder.
- `BAWKSYNC_TOKENS_FILE points to ..., which does not exist`: the secret file path is wrong.

## "This server already holds a synced vault for that token"

That token's space already has data, for example from an earlier setup. Either:

- join from a device that already syncs (**Copy sync link**, then **Join with sync link**); or
- use a new token.

## "Sync server error 413"

Each token can hold 50,000 records or 128 MB, far more than a normal vault. Hitting the limit usually means a script pushed test data with your real token. Use a new token, or delete the data folder and set sync up again.

## Reset everything

1. Stop the container.
2. Delete the data folder, or just `bawksync.db*` to keep your token.
3. Start it again.
4. In bawkterm, **Stop syncing** on every device, then **Set up new sync** on one and **Join** on the rest.
