#!/bin/bash
cd /home/z/my-project

# ─── Auto-fix Prisma client drift (sandbox vs production) ────────────────────
# Schema prisma = postgresql (untuk Vercel production), tapi sandbox pakai
# sqlite. Generated client harus sqlite di sandbox, postgresql di Vercel.
# `bun install` (postinstall: prisma generate) akan regenerate ke postgresql
# karena schema text = postgresql. Script ini ensure client tetap sqlite
# di sandbox setiap startup.
#
# Cek activeProvider di generated client. Kalau postgresql, regenerate sqlite.
ACTIVE_PROVIDER=$(grep -o '"activeProvider": "[^"]*"' node_modules/.prisma/client/index.js 2>/dev/null | head -1 | sed 's/.*"activeProvider": "//' | sed 's/".*//')
if [ "$ACTIVE_PROVIDER" != "sqlite" ]; then
  echo "[$(date)] Prisma client activeProvider=$ACTIVE_PROVIDER, regenerating as sqlite..."
  # Save postgresql schema
  cp prisma/schema.prisma /tmp/schema-postgres.prisma
  # Temporarily switch to sqlite for generate
  sed 's|provider = "postgresql"|provider = "sqlite"|' prisma/schema.prisma > /tmp/schema-sqlite.prisma
  cp /tmp/schema-sqlite.prisma prisma/schema.prisma
  # Push schema to sqlite DB (creates tables if missing)
  bun run db:push --skip-generate >/dev/null 2>&1 || true
  # Generate sqlite client
  bun run db:generate >/dev/null 2>&1 || true
  # Restore postgresql schema (for Vercel build & git)
  cp /tmp/schema-postgres.prisma prisma/schema.prisma
  echo "[$(date)] Prisma client regenerated as sqlite."
fi

# Ensure DB exists & has all tables (idempotent)
if [ ! -f "/home/z/my-project/db/custom.db" ]; then
  echo "[$(date)] DB missing, creating..."
  mkdir -p /home/z/my-project/db
  cp prisma/schema.prisma /tmp/schema-postgres.prisma
  sed 's|provider = "postgresql"|provider = "sqlite"|' prisma/schema.prisma > /tmp/schema-sqlite.prisma
  cp /tmp/schema-sqlite.prisma prisma/schema.prisma
  bun run db:push --skip-generate >/dev/null 2>&1 || true
  bun run db:generate >/dev/null 2>&1 || true
  cp /tmp/schema-postgres.prisma prisma/schema.prisma
fi

while true; do
  NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
