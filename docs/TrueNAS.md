# TrueNAS

This covers TrueNAS Community Edition 24.10 and newer (25.04 "Fangtooth", 25.10 "Goldeye", 26). These versions run apps with Docker. bawksync isn't in the TrueNAS app catalog, so you install it as a **Custom App**.

## 1. Make a dataset for its data

1. Go to **Datasets**, select your pool, and choose **Add Dataset**.
2. Name it, for example `apps/bawksync`. It will live at `/mnt/<pool>/apps/bawksync`. Create `apps` first if you don't have it.
3. Set **Dataset Preset** to **Apps**. This gives the apps group (568) permission to write.
4. Choose **Save**.

## 2. Install the app

Pick one of two ways.

### Option A: the Custom App form

1. Go to **Apps → Discover** and choose **Custom App**. The form is titled "Install iX App" on 25.10 and "Install Custom App" on 26.
2. **Application Name:** `bawksync`
3. **Image Configuration:**
   - Repository: `ghcr.io/juddisjudd/bawksync`
   - Tag: `latest`
   - Pull Policy: **Always pull image even if present on host**, so updating the app gets the newest image
4. **Container Configuration:**
   - **Restart Policy:** change it to **Unless Stopped**. The default, "No", leaves bawksync off after a reboot.
   - **Environment Variables:** add `PUID` = `568` and `PGID` = `568`.
5. **Security Context Configuration:** leave **Custom User** unchecked. The container starts as root only to set the data folder's owner, then runs as user 568.
6. **Network Configuration → Ports:** add one:
   - Port Bind Mode: **Publish port on the host for external access**
   - Host Port: `8787`
   - Container Port: `8787`
   - Protocol: TCP
7. **Storage Configuration:** add one entry:
   - **Type: Host Path.** The default is ixVolume, which is meant for testing.
   - Mount Path: `/data`
   - Host Path: `/mnt/<pool>/apps/bawksync`, the dataset from step 1.
8. Choose **Install**.

### Option B: YAML

1. Go to **Apps → Discover**, open the **⋮** menu and choose **Install via YAML**.
2. Name: `bawksync`
3. Paste into **Custom Config**, replacing `<pool>`:

   ```yaml
   services:
     bawksync:
       image: ghcr.io/juddisjudd/bawksync:latest
       restart: unless-stopped
       pull_policy: always
       ports:
         - "8787:8787"
       environment:
         PUID: "568"
         PGID: "568"
       volumes:
         - /mnt/<pool>/apps/bawksync:/data
   ```

4. Choose **Save**.

## 3. Get your token

1. Go to **Apps → Installed** and select **bawksync**.
2. Under **Workloads**, open the logs (the page icon next to the container).
3. Copy the token printed after `created a sync token`. It is shown only on the first start.

It's also saved in the dataset as `tokens`. Read it with the container's shell (`cat /data/tokens`) or from **System → Shell**: `cat /mnt/<pool>/apps/bawksync/tokens`.

## 4. Connect

- **At home:** use `http://<truenas-ip>:8787` in bawkterm. See [Connect bawkterm](Connect-bawkterm.md).
- **Away from home:** install the **Tailscale** app from **Apps → Discover** (follow [Tailscale's TrueNAS guide](https://tailscale.com/kb/1483/truenas)). Then use `http://<truenas-tailscale-ip>:8787`. More options are on [Remote access](Remote-access.md).

## Updating and backups

- **Update:** **Apps → Installed** → **bawksync** → **Edit** → **Save**. This redeploys the app, and with the pull policy above it fetches the newest image.
- **Back up:** add a snapshot task for the dataset in **Data Protection → Periodic Snapshot Tasks**, and replicate it off the box if you can.

See [Backups and updates](Backups-and-updates.md).

## If it won't start

- **"permission denied" on `/data`:** you probably checked **Custom User**, so the container can't fix ownership itself. Either uncheck it, or give user 568 **Modify** access to the dataset: **Datasets** → select it → **Permissions → Edit** → **Add Item** → Who: User, `apps`, Modify → **Save Access Control List**.
- **Anything else:** see [Troubleshooting](Troubleshooting.md).
