# HexOS

HexOS runs on top of TrueNAS. Its own app catalog doesn't include bawksync yet, so you install it through the TrueNAS interface that HexOS includes. HexOS still shows the app on its dashboard afterwards.

## 1. Open the TrueNAS interface

1. In the HexOS Command Deck, go to **Settings** and choose the **TrueNAS** button.
2. Sign in as `truenas_admin`, with the password you chose when installing HexOS.

## 2. Pick a folder for its data

HexOS keeps app data in the **Applications** location you chose under **Settings → Applications → Locations**. In the TrueNAS interface:

1. Go to **Datasets**, select the dataset HexOS uses for Applications, and choose **Add Dataset**.
2. Name it `bawksync`, set **Dataset Preset** to **Apps**, and choose **Save**.
3. Note its path, shown as `/mnt/...` on the dataset's details.

## 3. Install

Follow [TrueNAS, step 2](TrueNAS.md#2-install-the-app). Use the path from above as the Host Path, and keep `PUID` / `PGID` at `568`, the user HexOS uses for apps.

Keep the app name `bawksync`. HexOS refuses a custom app whose name matches an app in its own catalog. If that ever happens, add a suffix such as `bawksync-2`.

## 4. Get your token and connect

- **Token:** see [TrueNAS, step 3](TrueNAS.md#3-get-your-token).
- **Connecting:** use `http://<hexos-ip>:8787` at home. For away from home, see [Remote access](Remote-access.md). Tailscale also runs on HexOS.

## Good to know

- **Support requests:** HexOS's support form asks whether an app was "installed via TrueNAS not HexOS". Answer yes for bawksync.
- **Updates:** go through the TrueNAS interface, as on [TrueNAS](TrueNAS.md#updating-and-backups).
- HexOS also has JSON install scripts for its own catalog (behind **Settings → Preferences → Experimental Features**). A bawksync install script may be offered there later, which would allow a one-click install.
