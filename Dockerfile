FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --production --frozen-lockfile --ignore-scripts

FROM node:24-alpine
LABEL org.opencontainers.image.title="bawksync" \
      org.opencontainers.image.description="End-to-end encrypted sync server for bawkterm" \
      org.opencontainers.image.source="https://github.com/juddisjudd/bawksync" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

WORKDIR /app
RUN apk add --no-cache su-exec
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    BAWKSYNC_DB=/data/bawksync.db

VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8787/v1/health || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/node.ts"]
