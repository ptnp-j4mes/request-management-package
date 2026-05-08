#!/usr/bin/env bash
set -e

echo "==> Copying .env.example to .env (if not exists)"
[ ! -f .env ] && cp .env.example .env

echo "==> Installing dependencies"
bun install

echo "==> Starting PostgreSQL"
docker compose up postgres -d
echo "==> Waiting for PostgreSQL to be ready..."
sleep 3

echo "==> Running migrations"
bun run db:migrate

echo "==> Seeding database"
bun run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development servers:"
echo "  Terminal 1: cd apps/api && bun run dev"
echo "  Terminal 2: cd apps/web && bun run dev"
echo ""
echo "Or run everything with Docker:"
echo "  docker compose up --build"
