# Unraid

Tested against Unraid 7.x. bawksync runs as a normal Docker container, with its data in `/mnt/user/appdata/bawksync`.

There are two ways to add it: with the ready-made template (quicker), or by hand.

## Option A: with the template

1. Open a terminal on Unraid: the **>_** icon at the top right of the web UI.
2. Download the template into your user templates folder:

   ```sh
   wget -O /boot/config/plugins/dockerMan/templates-user/my-bawksync.xml \
     https://raw.githubusercontent.com/juddisjudd/bawksync/main/unraid/bawksync.xml
   ```

3. Go to the **Docker** tab and choose **Add Container**.
4. In the **Template** drop-down, under **User templates**, choose **bawksync**. The fields fill in.
5. Leave **Token** empty to have one created for you, or paste your own.
6. Choose **Apply**.

Then [get your token](#get-your-token).

## Option B: by hand

1. Go to the **Docker** tab and choose **Add Container**.
2. Fill in:

   | Field | Value |
   | --- | --- |
   | Name | `bawksync` |
   | Repository | `ghcr.io/juddisjudd/bawksync:latest` |
   | Network Type | `Bridge` |
   | Console shell command | `Shell` |

3. Choose **Add another Path, Port, Variable, Label or Device** and add a **Port**:
   - Name: `Sync port`
   - Container Port: `8787`
   - Host Port: `8787`
   - Connection Type: `TCP`
4. Add a **Path**:
   - Name: `Data`
   - Container Path: `/data`
   - Host Path: `/mnt/user/appdata/bawksync`
   - Access Mode: `Read/Write`
5. Add a **Variable**: Name `PUID`, Key `PUID`, Value `99`.
6. Add a **Variable**: Name `PGID`, Key `PGID`, Value `100`.
7. Choose **Apply**.

Unraid saves this as a user template, so you can edit it later from the container's icon → **Edit**.

## Get your token

1. On the **Docker** tab, click the bawksync icon and choose **Logs**.
2. Copy the token printed after `created a sync token`.

The log line appears only on the first start. To show the token again later, open the container's **Console** and run `bawksync tokens`. It is also saved in `/mnt/user/appdata/bawksync/tokens`.

## Connect

- **At home:** use `http://<unraid-ip>:8787` in bawkterm, for example `http://192.168.1.20:8787`. See [Connect bawkterm](Connect-bawkterm.md).
- **Away from home:** Unraid 7 can put the container on your [Tailscale](Remote-access.md#option-1-tailscale-easiest-recommended) network directly:
  1. Install the Tailscale plugin from the **Apps** tab and sign in.
  2. Edit the bawksync container and turn on **Use Tailscale**. This needs the Bridge or a custom network.
  3. Use the container's Tailscale address in bawkterm.

  The other options on [Remote access](Remote-access.md) work too.

## Updating and backups

- **Update:** the Docker tab shows **update ready** when a new image is out. Choose **apply update**.
- **Back up:** the **Appdata Backup** plugin (from Apps) backs up `/mnt/user/appdata/bawksync` on a schedule, stopping the container while it copies.

See [Backups and updates](Backups-and-updates.md).

## Notes

- `PUID=99` and `PGID=100` are Unraid's usual `nobody` and `users`. The container fixes the data folder's ownership on start, then runs as that user.
- bawksync has no web page. `http://<unraid-ip>:8787/v1/health` shows a short status message if it's running.
