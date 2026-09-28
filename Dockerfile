FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm@11 && mkdir -p /data && chown node:node /data

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY src ./src

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    BAWKSYNC_DB=/data/bawksync.db

USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8787/v1/health || exit 1
CMD ["node", "src/node.ts"]
