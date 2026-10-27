#!/bin/sh
set -e

echo "==> Running database migrations..."
if [ -n "$DATABASE_URL" ]; then
  prisma migrate deploy --schema=./prisma/schema.prisma
else
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "==> Starting Next.js application on port ${PORT:-3000}..."
exec node server.js
