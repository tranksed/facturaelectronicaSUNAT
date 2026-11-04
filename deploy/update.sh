#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN RÁPIDA EN VPS
# Actualiza código desde GitHub, sincroniza Prisma DB, compila frontend y reinicia PM2
# ==============================================================================

set -e

APP_DIR="/var/www/facturador-sunat"
if [ ! -d "$APP_DIR" ]; then
  APP_DIR="$(pwd)"
fi

echo "=========================================================="
echo "  🚀 ACTUALIZANDO FACTURADOR ELECTRÓNICO SUNAT EN VPS     "
echo "=========================================================="

cd "$APP_DIR"
echo "📥 Descargando últimos cambios desde GitHub..."
git pull origin main

echo "📦 Sincronizando modelos de base de datos Prisma..."
cd "$APP_DIR/server"
npm install --production=false
npx prisma generate
npx prisma db push

echo "🎨 Compilando interfaz web (Vite Build)..."
cd "$APP_DIR/client"
npm install
npm run build

echo "🔄 Reiniciando servidor en producción con PM2..."
cd "$APP_DIR"
pm2 restart facturador-sunat || pm2 restart all

echo "=========================================================="
echo "  ✅ ¡ACTUALIZACIÓN Y SINCRONIZACIÓN EXITOSA!             "
echo "=========================================================="
