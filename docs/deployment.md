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
4. Run:

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
