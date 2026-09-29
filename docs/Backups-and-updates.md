# Backups and updates

## What to back up

Everything lives in the folder mounted at `/data`:

| File | What it is |
| --- | --- |
| `bawksync.db` (plus `-wal` and `-shm` while running) | the encrypted records |
| `tokens` | your token(s), if you did not set `BAWKSYNC_TOKENS` |

Every synced device also keeps a full copy of its vault. Losing the server therefore never loses your hosts or keys. You would only need to set sync up again.

### Simple backup

1. Stop the container. This makes sure the database files are complete.
2. Copy the whole data folder somewhere safe.
3. Start the container again.

```sh
docker compose stop bawksync
cp -a ./data ./data-backup-$(date +%F)
docker compose start bawksync
```

On Unraid, the Appdata Backup plugin does this for you. On TrueNAS, snapshot the dataset (**Data Protection → Periodic Snapshot Tasks**).

### Restore

1. Stop the container.
2. Put the backed-up files back into the data folder.
3. Start it again. Your devices catch up on their next sync.

## Updating

The image tag `latest` always points to the newest release.

- **Docker Compose:** `docker compose pull && docker compose up -d`
- **docker run:** `docker pull ghcr.io/juddisjudd/bawksync:latest`, then remove the container and run it again with the same settings.
- **Unraid:** the Docker tab shows **update ready**. Choose **apply update**.
- **TrueNAS and HexOS:** **Apps → Installed**, select bawksync, then **Edit → Save**. With the pull policy from the [TrueNAS guide](TrueNAS.md), this fetches the newest image.

To stay on one version, use a version tag such as `ghcr.io/juddisjudd/bawksync:0.1` instead of `latest`.

## Changing the token

Change the token if it may have leaked.

1. Make a new token: `docker run --rm ghcr.io/juddisjudd/bawksync token`.
2. Replace the old one in `BAWKSYNC_TOKENS` or in `/data/tokens`, then restart the container.
3. In bawkterm on one device: **settings → sync → Stop syncing**, then **Set up new sync** with the new token. This also makes a new encryption key.
4. On your other devices: **Stop syncing**, then **Join with sync link** using the new link.

The old token's data stays on the server until you delete the data folder, but without the old encryption key it is unreadable.
