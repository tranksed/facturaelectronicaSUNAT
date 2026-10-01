#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALACIÓN Y DESPLIEGUE AUTOMATIZADO EN VPS (UBUNTU / DEBIAN)
# Sistema de Facturación Electrónica SUNAT Multitenant & Marca Blanca
# ==============================================================================

set -e

# Colores para la consola
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}${BOLD}"
echo "=============================================================================="
echo "    🚀 INSTALADOR AUTOMÁTICO DE FACTURACIÓN ELECTRÓNICA SUNAT MULTITENANT    "
echo "=============================================================================="
echo -e "${NC}"

# 1. Comprobar permisos de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Este script debe ejecutarse con privilegios de superusuario (root).${NC}"
  echo "Por favor ejecuta: sudo bash install.sh"
  exit 1
fi

# 2. Solicitar datos de configuración de dominio y correo
echo -e "${CYAN}Ingresa los datos para la configuración de tu VPS y Certificado SSL:${NC}"
read -rp "👉 Ingresa tu Nombre de Dominio o Subdominio (ej: facturador.tudominio.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}❌ El nombre de dominio no puede estar vacío.${NC}"
  exit 1
fi

read -rp "👉 Ingresa tu Correo Electrónico (para notificaciones de SSL Let's Encrypt): " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
  echo -e "${RED}❌ El correo no puede estar vacío.${NC}"
  exit 1
fi

APP_DIR="/var/www/facturador-sunat"

echo ""
echo -e "${YELLOW}Resumen de Configuración:${NC}"
echo -e " • Dominio:        ${BOLD}${DOMAIN_NAME}${NC}"
echo -e " • Email SSL:      ${BOLD}${SSL_EMAIL}${NC}"
echo -e " • Ruta en el VPS: ${BOLD}${APP_DIR}${NC}"
echo ""
read -rp "¿Deseas continuar con la instalación? (s/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo -e "${YELLOW}Instalación cancelada por el usuario.${NC}"
  exit 0
fi

# 3. Actualizar paquetes del sistema
echo -e "\n${BLUE}📦 Paso 1/8: Actualizando paquetes del sistema...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# 4. Instalar Node.js 20 LTS (si no está instalado o versión anterior)
echo -e "\n${BLUE}🟢 Paso 2/8: Verificando e instalando Node.js 20 LTS...${NC}"
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 20 ]]; then
  echo "Instalando Node.js 20 desde NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo -e "Node.js instalado: ${GREEN}$(node -v)${NC}"
echo -e "NPM instalado:     ${GREEN}$(npm -v)${NC}"

# 5. Instalar PM2 para gestión de procesos en segundo plano
echo -e "\n${BLUE}⚡ Paso 3/8: Instalando PM2 Process Manager...${NC}"
npm install -g pm2

# 6. Preparar directorio del proyecto
echo -e "\n${BLUE}📂 Paso 4/8: Preparando archivos de la aplicación en ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Si el script se ejecuta desde una ruta diferente, copiamos los archivos
if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
  if [ -d "$CURRENT_DIR/server" ] && [ -d "$CURRENT_DIR/client" ]; then
    echo "Copiando archivos desde $CURRENT_DIR hacia $APP_DIR..."
    cp -r "$CURRENT_DIR"/* "$APP_DIR"/ 2>/dev/null || true
    cp -r "$CURRENT_DIR"/.* "$APP_DIR"/ 2>/dev/null || true
  fi
else
  echo -e "Los archivos ya se encuentran en el directorio destino (${BOLD}$APP_DIR${NC})."
fi

cd "$APP_DIR"

# Crear directorios para almacenamiento persistente y logs
mkdir -p storage/comprobantes
mkdir -p logs
mkdir -p server/prisma

# 7. Configurar variables de entorno (.env)
echo -e "\n${BLUE}🔐 Paso 5/8: Configurando variables de entorno en server/.env...${NC}"
if [ ! -f server/.env ]; then
  JWT_SECRET_RANDOM=$(openssl rand -hex 32)
  cat <<EOF > server/.env
NODE_ENV=production
PORT=3000
APP_URL=https://${DOMAIN_NAME}
DATABASE_URL="file:./prod.db"
JWT_SECRET=${JWT_SECRET_RANDOM}
STORAGE_DIR=storage/comprobantes
EOF
  echo "Archivo server/.env creado con nueva clave JWT aleatoria."
else
  echo "Archivo server/.env existente detectado. Conservando configuración actual."
fi

# 8. Instalar dependencias y compilar
echo -e "\n${BLUE}⚙️ Paso 6/8: Instalando dependencias del Backend y Frontend...${NC}"
cd "$APP_DIR/server"
npm install --production=false
npx prisma generate
npx prisma db push
node src/seed.js || true

cd "$APP_DIR/client"
npm install
npm run build

# 9. Configurar Nginx y Certificado SSL
echo -e "\n${BLUE}🌐 Paso 7/8: Configurando Nginx y Certificado SSL Let's Encrypt...${NC}"

# Configuración Nginx inicial (HTTP temporal para validación Let's Encrypt)
cat <<EOF > /etc/nginx/sites-available/facturador-sunat
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/facturador-sunat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Obtención de certificado SSL con Certbot
echo "Solicitando certificado SSL a Let's Encrypt..."
certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect || {
  echo -e "${YELLOW}⚠️ Aviso: No se pudo emitir el certificado SSL automáticamente.${NC}"
  echo "Asegúrate de que tu dominio '$DOMAIN_NAME' ya apunte a la IP de este VPS en tu proveedor DNS (Cloudflare, GoDaddy, etc)."
  echo "Podrás reintentar SSL más adelante con: certbot --nginx -d $DOMAIN_NAME"
}

# 10. Iniciar aplicación con PM2
echo -e "\n${BLUE}🚀 Paso 8/8: Iniciando la aplicación con PM2 y configurando arranque automático...${NC}"
cd "$APP_DIR"
pm2 delete facturador-sunat 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

# Configurar Firewall UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "\n${GREEN}${BOLD}"
echo "=============================================================================="
echo "    🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE! SISTEMA LISTO PARA PRODUCCIÓN   "
echo "=============================================================================="
echo -e "${NC}"
echo -e "📍 URL de tu Plataforma:  ${CYAN}https://${DOMAIN_NAME}${NC}"
echo -e "📁 Directorio en el VPS:  ${BOLD}${APP_DIR}${NC}"
echo -e "💾 Almacenamiento Local:  ${BOLD}${APP_DIR}/storage/comprobantes${NC}"
echo ""
echo -e "${BOLD}🔑 Accesos Iniciales de Super Administrador:${NC}"
echo -e " • Usuario:    ${CYAN}admin@facturador.com${NC}"
echo -e " • Contraseña: ${CYAN}Admin12345*${NC}"
echo -e " *(Recuerda cambiar la contraseña inmediatamente tras iniciar sesión)*"
echo ""
echo -e "${BOLD}Comandos útiles de gestión en tu VPS:${NC}"
echo " • Ver estado del servicio:     pm2 status"
echo " • Ver logs en tiempo real:     pm2 logs facturador-sunat"
echo " • Reiniciar el sistema:        pm2 restart facturador-sunat"
echo " • Actualizar con git pull:     cd ${APP_DIR} && git pull && pm2 reload facturador-sunat"
echo ""
EOF
