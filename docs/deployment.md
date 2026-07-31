# Deployment

## Local development

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

App: http://localhost:4321

## Local Docker (HTTP)

```bash
docker compose -f docker/docker-compose.local.yml up --build
```

- App via Caddy: http://localhost:8080
- Or direct app: http://localhost:4321

## Production (gemkbr.ru)

1. Point DNS A/AAAA for `gemkbr.ru` and `www.gemkbr.ru` to the VPS.
2. Copy `.env.example` → `.env` and set:
   - `BETTER_AUTH_SECRET` (long random)
   - `BETTER_AUTH_URL=https://gemkbr.ru`
   - `PUBLIC_SITE_URL=https://gemkbr.ru`
   - `DOMAIN=gemkbr.ru`
   - `ORDER_NOTIFIER_MODE=console|pii_safe|full`
3. Place `.env` next to the compose project root used by deploy.

### Continuous deploy (recommended)

Build runs on **GitHub Actions** (not on the 1 GB VPS). The VPS only pulls a prebuilt image and restarts containers — downtime is seconds, not a full compile.

Flow:

```text
push → main → Actions builds image → push to GHCR → SSH → docker pull → up -d
```

Required GitHub Actions secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`.

After the first successful workflow, package `ghcr.io/rakhmamed/gemkbr` appears under the repo **Packages**. Keep it private; deploy logs into GHCR with `GITHUB_TOKEN` for the pull.

Do **not** run `docker compose … --build` on this VPS — it saturates 1 CPU / 1 GB and takes the site down.

On this host, nginx already binds `:80`/`:443`. Keep `docker/docker-compose.override.yml` (publish `127.0.0.1:4321`, disable Caddy). When using `-f`, always pass the override explicitly — Compose will not auto-load it:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml up -d --no-build
```

`git reset --hard` on deploy does not remove the override if it is untracked; do not commit secrets into it.

### Manual first start / recovery

```bash
# after an image exists in GHCR (or build elsewhere and tag locally)
export GEMKBR_IMAGE=ghcr.io/rakhmamed/gemkbr:latest
echo "$GHCR_TOKEN" | docker login ghcr.io -u USER --password-stdin
docker compose -f docker/docker-compose.yml pull app outbox-worker
docker compose -f docker/docker-compose.yml up -d --no-build
```

Local/dev still can build on a stronger machine:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Topology:

```text
Internet → Caddy (HTTPS) → Astro Node app → SQLite volume (/data/app.db)
                                         → /data/previews
```

## Health

- `GET /health/live` — process up
- `GET /health/ready` — SQLite open

Docker healthcheck uses readiness.

## Migrations

```bash
pnpm db:backup
pnpm db:generate
pnpm db:migrate
```

Never use schema push in production.

## Backups

See [backup-restore.md](./backup-restore.md).

## Outbox worker

`outbox-worker` service drains `notification_outbox` and calls `OrderNotifier`.
