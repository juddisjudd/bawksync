# Connect bawkterm

You need:

- your server's address, for example `http://192.168.1.20:8787`, `http://100.101.102.103:8787` or `https://sync.example.com`;
- the token.

## First device

1. In bawkterm, open **settings → sync**.
2. Choose **Set up new sync**.
3. Enter the server address and the token, then choose **Start syncing**.

bawkterm creates a new encryption key on this device and uploads your vault, encrypted.

Then it asks you to **save your sync link**. Do it: copy the link into a password manager. The server cannot read your data, so if you lose every device, the sync link is the only way to get your synced data back.

## Other devices

1. On the first device, choose **Copy sync link** (it asks for your master password). The link is cleared from the clipboard after a minute.
2. On the new device, open **settings → sync → Join with sync link** and paste it.
3. bawkterm shows which server the link points to and asks you to confirm.

Send the link to yourself only through something private (not email or chat that others can read). The link contains the encryption key.

## Good to know

- **Each device keeps its own master password.** Sync never shares it.
- **When sync runs:** after you change something, and when you come back to the window. It never runs on a timer. The cloud icon in the sidebar shows the state.
- **Newest change wins** for each host, key, identity or snippet.
- **What stays per device:** all settings, open tabs and last folders.

## Starting over

If you lost the sync link and no device syncs anymore, choose **Set up new sync** with the same token. bawkterm sees that the server already holds a synced vault and offers **Erase and start fresh**. That deletes the server copy for this token and uploads this device's vault with a new key.

A device that still syncs with the old link then shows *"Sync was reset from another device"* and uploads nothing more. On that device, choose **Stop syncing**, then **Join with sync link** using the new link. Its hosts and keys are merged in.
