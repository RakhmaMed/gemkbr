# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
ENV DATABASE_PATH=/data/app.db
ENV DATA_DIR=/data
ENV PREVIEWS_DIR=/data/previews
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 gemkbr \
  && useradd --system --uid 1001 --gid gemkbr gemkbr \
  && mkdir -p /data/previews \
  && chown -R gemkbr:gemkbr /data /app
COPY --from=build --chown=gemkbr:gemkbr /app/dist ./dist
COPY --from=build --chown=gemkbr:gemkbr /app/node_modules ./node_modules
COPY --from=build --chown=gemkbr:gemkbr /app/package.json ./package.json
COPY --from=build --chown=gemkbr:gemkbr /app/drizzle ./drizzle
COPY --from=build --chown=gemkbr:gemkbr /app/scripts ./scripts
COPY --from=build --chown=gemkbr:gemkbr /app/seed ./seed
COPY --from=build --chown=gemkbr:gemkbr /app/src ./src
USER gemkbr
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4321/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "scripts/docker-entrypoint.sh"]
