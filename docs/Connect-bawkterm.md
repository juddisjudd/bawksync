# Connect bawkterm

You need:

- your server's address, for example `http://192.168.1.20:8787`, `http://100.101.102.103:8787` or `https://sync.example.com`;
- the token.

## First device

1. In bawkterm, open **settings → sync**.
2. Choose **Set up new sync**.
3. Enter the server address and the token, then choose **Start syncing**.

bawkterm creates a new encryption key on this device and uploads your vault, encrypted.

## Other devices

1. On the first device, choose **Copy sync link** (it asks for your master password). The link is cleared from the clipboard after a minute.
2. On the new device, open **settings → sync → Join with sync link** and paste it.
3. bawkterm shows which server the link points to and asks you to confirm.

Send the link to yourself only through something private (not email or chat that others can read). The link contains the encryption key.

## Good to know

- **Each device keeps its own master password.** Sync never shares it.
- **When sync runs:** after you change something, and when you come back to the window. It never runs on a timer. The cloud icon in the sidebar shows the state.
- **Newest change wins** for each host, key, identity or snippet.
- **What stays per device:** settings like theme and fonts, open tabs and last folders.
- **"Set up new sync" refuses a token whose server space already has data.** Use **Join with sync link** from a device that already syncs instead, or use a fresh token.
