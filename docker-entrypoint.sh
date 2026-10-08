#!/bin/sh
set -e

echo "==> Running database migrations..."
if [ -n "$DATABASE_URL" ]; then
  prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "WARNING: prisma migrate deploy failed or database is still starting up."
  }
else
  echo "WARNING: DATABASE_URL is not set. Skipping migration."
fi

echo "==> Starting Next.js application on port ${PORT:-3000}..."
exec node server.js
