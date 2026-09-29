#!/bin/sh
set -e

if [ "$1" = "token" ]; then
  exec node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
fi

umask 077

# started as root: hand /data to PUID:PGID (Unraid 99:100, TrueNAS 568:568) and drop privileges
if [ "$(id -u)" = "0" ]; then
  PUID="${PUID:-1000}"
  PGID="${PGID:-1000}"
  mkdir -p /data
  if [ "$(stat -c %u:%g /data)" != "$PUID:$PGID" ]; then
    chown -R "$PUID:$PGID" /data
  fi
  exec su-exec "$PUID:$PGID" "$@"
fi

exec "$@"
