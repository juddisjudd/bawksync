# Cloudflare Workers

Run bawksync on Cloudflare's network instead of your own hardware. The free Workers plan is enough for personal use. The data goes in D1, Cloudflare's SQLite database.

## What you need

- A Cloudflare account.
- Optional: a domain on Cloudflare. Without one, you can use the `workers.dev` address.
- [Bun](https://bun.sh) and Git on your computer.

## Steps

1. Get the code:

   ```sh
   git clone https://github.com/juddisjudd/bawksync.git
   cd bawksync
   bun install
   ```

2. Sign in to Cloudflare:

   ```sh
   bunx wrangler login
   ```

3. Create the database:

   ```sh
   bunx wrangler d1 create bawksync
   ```

   Copy the `database_id` it prints into `wrangler.jsonc`, replacing the one there.

4. Set your address in `wrangler.jsonc`:
   - **Your own domain:** set `routes` to `[{ "pattern": "sync.example.com", "custom_domain": true }]`.
   - **No domain:** delete the `routes` line and set `"workers_dev": true`. Your address will be `https://bawksync.<your-subdomain>.workers.dev`.

5. Create the tables:

   ```sh
   bun run worker:migrate
   ```

6. Make a token and store it as a secret:

   ```sh
   bun run token
   bunx wrangler secret put BAWKSYNC_TOKENS
   ```

   Paste the token when asked. Keep a copy somewhere safe; you need it in bawkterm.

7. Deploy:

   ```sh
   bun run worker:deploy
   ```

8. Check it: open `https://<your address>/v1/health` in a browser. You should see `{"ok":true,"name":"bawksync",...}`.

Next: [connect bawkterm](Connect-bawkterm.md). You don't need the remote access page, because Workers already serve HTTPS.

## Updating

```sh
git pull
bun install
bun run worker:migrate
bun run worker:deploy
```

## Notes

- Request logging is turned off in `wrangler.jsonc`, because request logs could include the `Authorization` header that carries your token. Errors are still logged.
- To see stored data sizes, open the D1 database in the Cloudflare dashboard. The data itself is encrypted and unreadable there.
