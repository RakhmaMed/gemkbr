#!/bin/sh
set -eu

mkdir -p "${DATA_DIR:-/data}" "${PREVIEWS_DIR:-/data/previews}"
./node_modules/.bin/tsx scripts/db-migrate.ts
./node_modules/.bin/tsx scripts/db-seed.ts
exec node ./dist/server/entry.mjs
