# GemKBR

Интернет-магазин изделий ручной работы с 3D-конструктором браслетов.

- Сайт: https://gemkbr.ru
- Стек: Astro + Svelte + TypeScript + Threlte + SQLite + Drizzle + Better Auth

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Документация:

- [Deployment](docs/deployment.md)
- [Backup & restore](docs/backup-restore.md)
- [ADRs](docs/adr/README.md)

## Scripts

- `pnpm test` — Vitest (domain + repository contracts)
- `pnpm test:e2e` — Playwright smoke
- `pnpm db:backup` / `pnpm db:restore`
- `pnpm outbox:worker` — notification outbox drain
