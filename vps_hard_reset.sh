#!/bin/bash

# VPS Hard Reset Script - Fix tampilan UI yang tidak update

echo "=============================================="
echo "  VPS - Hard Reset & Rebuild"
echo "=============================================="
echo ""

cd ~/dfresto

echo "[1/8] Stopping application..."
pm2 stop dfresto

echo "[2/8] Deleting Next.js cache..."
rm -rf .next

echo "[3/8] Deleting node cache..."
rm -rf node_modules/.cache

echo "[4/8] Deleting Prisma cache..."
rm -rf node_modules/.prisma

echo "[5/8] Reinstalling all dependencies..."
npm install

echo "[6/8] Regenerating Prisma Client..."
npx prisma generate

echo "[7/8] Building fresh production bundle..."
NODE_ENV=production npm run build

echo "[8/8] Restarting application..."
pm2 restart dfresto
pm2 save

