#!/bin/bash

# Pastikan script berhenti jika ada command yang gagal (error)
set -e

echo "🚀 Memulai proses deployment Shipment Tracker..."

echo "📥 1. Menarik update terbaru dari repository Git..."
git pull origin main

echo "📦 2. Menginstal dependencies..."
# Gunakan --no-frozen-lockfile jika ingin otomatis update versi minor/patch
pnpm install

echo "⚙️ 3. Melakukan generate Prisma Client..."
pnpm prisma generate

echo "🗄️ 4. Melakukan migrasi database (Deploy)..."
pnpm prisma migrate deploy

echo "🔨 5. Mem-build aplikasi Next.js..."
pnpm build

echo "🔄 6. Merestart aplikasi di PM2..."
pm2 restart shipment-track

echo "✅ Deployment selesai dengan sukses!"
