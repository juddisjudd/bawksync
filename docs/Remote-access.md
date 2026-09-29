# Remote access

bawkterm needs to reach the server from every device you sync. At home, the server's local IP address is enough. Laptops that leave the house need one of the options below.

bawkterm sends your token over plain `http://` only to addresses that cannot be on the public internet:

- your home network: `192.168.x.x`, `10.x.x.x`, `172.16.x.x`–`172.31.x.x`
- Tailscale: `100.64.x.x`–`100.127.x.x`
- `localhost`

Everything else must be `https://`.

## Option 1: Tailscale (easiest, recommended)

[Tailscale](https://tailscale.com) connects your devices in a private encrypted network (a "tailnet"). Nothing is opened to the internet, and it's free for personal use.

1. Install Tailscale on the server:
   - **Unraid:** the Tailscale plugin (Apps tab, search "Tailscale"). Unraid 7 can also put the bawksync container itself on your tailnet; see [Unraid](Unraid.md#connect).
   - **TrueNAS:** the Tailscale app (Apps → Discover), following [Tailscale's TrueNAS guide](https://tailscale.com/kb/1483/truenas).
   - **HexOS:** see [HexOS](HexOS.md).
   - **Other Linux:** `curl -fsSL https://tailscale.com/install.sh | sh` then `sudo tailscale up`.
2. Install Tailscale on each computer that runs bawkterm, and sign in to the same account.
3. Find the server's Tailscale address (`100.x.y.z`) in the Tailscale admin console or the app.
4. In bawkterm, use `http://100.x.y.z:8787` as the server address.

Tailscale already encrypts the connection, so plain `http://` is fine here.

## Option 2: A reverse proxy with HTTPS

If you already run a reverse proxy (Nginx Proxy Manager, Caddy, Traefik, SWAG), add a host for bawksync:

- **Domain:** for example `sync.example.com`, pointing at your public IP.
- **Forward to:** the server's IP and port `8787`, over `http`.
- **HTTPS:** request a Let's Encrypt certificate and force HTTPS.

In bawkterm, use `https://sync.example.com`.

With Caddy the whole configuration is one block:

```
sync.example.com {
    reverse_proxy 192.168.1.20:8787
}
```

This opens a port on your router (443), so keep the proxy and bawksync updated. The token is long and random, so it cannot realistically be guessed.

## Option 3: Cloudflare Tunnel

A [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) gives you an HTTPS address without opening any router port. You need a domain on Cloudflare.

1. In the Cloudflare dashboard, open **Networking → Tunnels** and choose **Create a tunnel**. It gives you a `cloudflared` Docker command with a token; run it on your server (Unraid and TrueNAS also have `cloudflared` apps).
2. On the tunnel's **Routes** tab, choose **Add route → Published application**. Set the hostname, for example `sync.example.com`, and the service URL `http://<server-ip>:8787`.
3. In bawkterm, use `https://sync.example.com`.

Do not put Cloudflare Access login screens in front of bawksync. bawkterm cannot complete a browser login; the token already protects the server.

## Option 4: Cloudflare Workers instead

If you don't want to expose anything at home, run bawksync on [Cloudflare Workers](Cloudflare-Workers.md). It comes with HTTPS.
