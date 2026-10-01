#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALACIÓN Y DESPLIEGUE AUTOMATIZADO EN VPS (UBUNTU / DEBIAN)
# Sistema de Facturación Electrónica SUNAT Multitenant & Marca Blanca
# Soporte para Puertos Personalizados y Múltiples Métodos de SSL (Cloudflare / Let's Encrypt / Custom)
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
  echo "Por favor ejecuta: sudo bash deploy/install.sh"
  exit 1
fi

APP_DIR="/var/www/facturador-sunat"

# 2. Solicitar datos de configuración
echo -e "${CYAN}--- Configuración de Dominio y Puertos ---${NC}"
read -rp "👉 Ingresa tu Nombre de Dominio o Subdominio (ej: facturador.tudominio.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}❌ El nombre de dominio no puede estar vacío.${NC}"
  exit 1
fi

read -rp "👉 Puerto interno de Node.js Express [Default: 3000]: " NODE_PORT
NODE_PORT=${NODE_PORT:-3000}

# 3. Menú de Métodos de SSL y Puertos
echo ""
echo -e "${CYAN}--- Selección del Método de SSL y Puerto Público ---${NC}"
echo "  1) Let's Encrypt Automático (Certbot oficial en puertos estándar 80 / 443)"
echo "  2) Cloudflare Proxy / Flexible SSL (Puerto estándar 80/443 o puerto alternativo ej: 8080, 8443, 2083)"
echo "  3) Cloudflare Origin Certificate (Certificado cifrado de 15 años en puerto 443 o 8443)"
echo "  4) Certificado SSL Propio / Comprado (.crt/.pem y .key)"
echo "  5) Sin SSL / HTTP Directo (Para proxy inverso externo, Docker o red privada)"
read -rp "👉 Selecciona una opción [1-5] (Default: 1): " SSL_OPTION
SSL_OPTION=${SSL_OPTION:-1}

PUBLIC_PORT=443
SSL_MODE="LETSENCRYPT"
SSL_EMAIL=""
CUSTOM_CERT=""
CUSTOM_KEY=""

case "$SSL_OPTION" in
  1)
    PUBLIC_PORT=443
    read -rp "👉 Ingresa tu Correo Electrónico para Let's Encrypt: " SSL_EMAIL
    if [ -z "$SSL_EMAIL" ]; then SSL_EMAIL="admin@${DOMAIN_NAME}"; fi
    SSL_MODE="LETSENCRYPT"
    APP_URL="https://${DOMAIN_NAME}"
    ;;
  2)
    echo -e "${YELLOW}Puertos compatibles con Cloudflare Proxy:${NC}"
    echo -e "  HTTPS: 443, 8443, 2053, 2083, 2087, 2096 | HTTP: 80, 8080, 8880, 2052, 2082, 2086, 2095"
    read -rp "👉 Ingresa el puerto público en Nginx para Cloudflare [Default: 80]: " PUBLIC_PORT
    PUBLIC_PORT=${PUBLIC_PORT:-80}
    SSL_MODE="CLOUDFLARE_FLEXIBLE"
    if [ "$PUBLIC_PORT" = "80" ] || [ "$PUBLIC_PORT" = "443" ]; then
      APP_URL="https://${DOMAIN_NAME}"
    else
      APP_URL="https://${DOMAIN_NAME}:${PUBLIC_PORT}"
    fi
    ;;
  3)
    read -rp "👉 Ingresa el puerto público HTTPS en Nginx [Default: 443 o 8443]: " PUBLIC_PORT
    PUBLIC_PORT=${PUBLIC_PORT:-443}
    SSL_MODE="CLOUDFLARE_ORIGIN"
    CUSTOM_CERT="/etc/ssl/cloudflare-origin.crt"
    CUSTOM_KEY="/etc/ssl/cloudflare-origin.key"
    if [ "$PUBLIC_PORT" = "443" ]; then
      APP_URL="https://${DOMAIN_NAME}"
    else
      APP_URL="https://${DOMAIN_NAME}:${PUBLIC_PORT}"
    fi
    ;;
  4)
    read -rp "👉 Ingresa el puerto público HTTPS en Nginx [Default: 443 o 8443]: " PUBLIC_PORT
    PUBLIC_PORT=${PUBLIC_PORT:-443}
    read -rp "👉 Ruta absoluta al archivo de Certificado (.crt o .pem): " CUSTOM_CERT
    read -rp "👉 Ruta absoluta al archivo de Clave Privada (.key): " CUSTOM_KEY
    SSL_MODE="CUSTOM_SSL"
    if [ "$PUBLIC_PORT" = "443" ]; then
      APP_URL="https://${DOMAIN_NAME}"
    else
      APP_URL="https://${DOMAIN_NAME}:${PUBLIC_PORT}"
    fi
    ;;
  5)
    read -rp "👉 Ingresa el puerto público HTTP en Nginx [Default: 8080]: " PUBLIC_PORT
    PUBLIC_PORT=${PUBLIC_PORT:-8080}
    SSL_MODE="HTTP_ONLY"
    if [ "$PUBLIC_PORT" = "80" ]; then
      APP_URL="http://${DOMAIN_NAME}"
    else
      APP_URL="http://${DOMAIN_NAME}:${PUBLIC_PORT}"
    fi
    ;;
esac

echo ""
echo -e "${YELLOW}Resumen de Configuración:${NC}"
echo -e " • Dominio:           ${BOLD}${DOMAIN_NAME}${NC}"
echo -e " • URL Pública:       ${BOLD}${APP_URL}${NC}"
echo -e " • Puerto Nginx:      ${BOLD}${PUBLIC_PORT}${NC}"
echo -e " • Puerto Node.js:    ${BOLD}${NODE_PORT}${NC}"
echo -e " • Método SSL:        ${BOLD}${SSL_MODE}${NC}"
echo -e " • Ruta en el VPS:    ${BOLD}${APP_DIR}${NC}"
echo ""
read -rp "¿Deseas continuar con la instalación? (s/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo -e "${YELLOW}Instalación cancelada por el usuario.${NC}"
  exit 0
fi

# 4. Actualizar paquetes del sistema
echo -e "\n${BLUE}📦 Paso 1/8: Actualizando paquetes del sistema...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw nginx

if [ "$SSL_MODE" = "LETSENCRYPT" ]; then
  apt install -y certbot python3-certbot-nginx
fi

# 5. Instalar Node.js 20 LTS (si no está instalado o versión anterior)
echo -e "\n${BLUE}🟢 Paso 2/8: Verificando e instalando Node.js 20 LTS...${NC}"
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 20 ]]; then
  echo "Instalando Node.js 20 desde NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo -e "Node.js instalado: ${GREEN}$(node -v)${NC}"
echo -e "NPM instalado:     ${GREEN}$(npm -v)${NC}"

# 6. Instalar PM2 para gestión de procesos en segundo plano
echo -e "\n${BLUE}⚡ Paso 3/8: Instalando PM2 Process Manager...${NC}"
npm install -g pm2

# 7. Preparar directorio del proyecto
echo -e "\n${BLUE}📂 Paso 4/8: Preparando archivos de la aplicación en ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

mkdir -p storage/comprobantes
mkdir -p logs
mkdir -p server/prisma

# 8. Configurar variables de entorno (.env)
echo -e "\n${BLUE}🔐 Paso 5/8: Configurando variables de entorno en server/.env...${NC}"
JWT_SECRET_RANDOM=$(openssl rand -hex 32)

cat <<EOF > server/.env
NODE_ENV=production
PORT=${NODE_PORT}
APP_URL=${APP_URL}
DATABASE_URL="file:./prod.db"
JWT_SECRET=${JWT_SECRET_RANDOM}
STORAGE_DIR=storage/comprobantes
EOF
echo "Archivo server/.env configurado con puerto ${NODE_PORT} y URL ${APP_URL}."

# 9. Instalar dependencias y compilar
echo -e "\n${BLUE}⚙️ Paso 6/8: Instalando dependencias del Backend y Frontend...${NC}"
cd "$APP_DIR/server"
npm install --production=false
npx prisma generate
npx prisma db push
node src/seed.js || true

cd "$APP_DIR/client"
npm install
npm run build

# 10. Configurar Nginx
echo -e "\n${BLUE}🌐 Paso 7/8: Configurando servidor web Nginx (Puerto ${PUBLIC_PORT})...${NC}"

NGINX_CONF="/etc/nginx/sites-available/facturador-sunat"

if [ "$SSL_MODE" = "LETSENCRYPT" ]; then
  # Plantilla inicial HTTP para validación de Certbot
  cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:${NODE_PORT};
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

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  echo "Solicitando certificado SSL a Let's Encrypt..."
  certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect || {
    echo -e "${YELLOW}⚠️ Aviso: No se pudo emitir el certificado SSL automáticamente.${NC}"
    echo "Asegúrate de que tu dominio '$DOMAIN_NAME' apunte a la IP de este VPS en tu proveedor DNS."
    echo "Podrás reintentar SSL con: certbot --nginx -d $DOMAIN_NAME"
  }

elif [ "$SSL_MODE" = "CLOUDFLARE_ORIGIN" ] || [ "$SSL_MODE" = "CUSTOM_SSL" ]; then
  # Si es Cloudflare Origin y no existen los archivos, crearlos con plantilla
  if [ "$SSL_MODE" = "CLOUDFLARE_ORIGIN" ] && [ ! -f "$CUSTOM_CERT" ]; then
    echo -e "${YELLOW}Creando archivos vacíos para Cloudflare Origin Certificate:${NC}"
    echo -e "  Certificado: $CUSTOM_CERT"
    echo -e "  Clave:       $CUSTOM_KEY"
    touch "$CUSTOM_CERT" "$CUSTOM_KEY"
    chmod 600 "$CUSTOM_KEY"
    echo -e "${CYAN}Nota: Recuerda pegar tu certificado y clave de Cloudflare en esos archivos.${NC}"
  fi

  cat <<EOF > "$NGINX_CONF"
server {
    listen ${PUBLIC_PORT} ssl http2;
    listen [::]:${PUBLIC_PORT} ssl http2;
    server_name ${DOMAIN_NAME};

    client_max_body_size 25M;

    ssl_certificate ${CUSTOM_CERT};
    ssl_certificate_key ${CUSTOM_KEY};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:${NODE_PORT};
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

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

else
  # Modo HTTP Directo o Cloudflare Flexible
  cat <<EOF > "$NGINX_CONF"
server {
    listen ${PUBLIC_PORT};
    listen [::]:${PUBLIC_PORT};
    server_name ${DOMAIN_NAME};

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:${NODE_PORT};
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

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
fi

# 11. Iniciar aplicación con PM2
echo -e "\n${BLUE}🚀 Paso 8/8: Iniciando la aplicación con PM2 y configurando arranque automático...${NC}"
cd "$APP_DIR"

# Actualizar puerto en ecosystem si cambió
cat <<EOF > deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'facturador-sunat',
      script: 'server/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${NODE_PORT}
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

pm2 delete facturador-sunat 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

# 12. Configurar Firewall UFW
ufw allow OpenSSH
ufw allow "${PUBLIC_PORT}/tcp"
if [ "$PUBLIC_PORT" != "80" ] && [ "$SSL_MODE" = "LETSENCRYPT" ]; then
  ufw allow 80/tcp
fi
ufw --force enable

echo -e "\n${GREEN}${BOLD}"
echo "=============================================================================="
echo "    🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE! SISTEMA LISTO PARA PRODUCCIÓN   "
echo "=============================================================================="
echo -e "${NC}"
echo -e "📍 URL de tu Plataforma:   ${CYAN}${APP_URL}${NC}"
echo -e "🌐 Puerto Público Nginx:   ${BOLD}${PUBLIC_PORT}${NC}"
echo -e "⚡ Puerto Interno Node.js: ${BOLD}${NODE_PORT}${NC}"
echo -e "🔒 Modo SSL:               ${BOLD}${SSL_MODE}${NC}"
echo -e "📁 Directorio en el VPS:   ${BOLD}${APP_DIR}${NC}"
echo ""
echo -e "${BOLD}🔑 Accesos Iniciales de Super Administrador:${NC}"
echo -e " • Usuario:    ${CYAN}admin@facturador.com${NC}"
echo -e " • Contraseña: ${CYAN}Admin12345*${NC}"
echo ""
echo -e "${BOLD}Comandos útiles de gestión:${NC}"
echo " • Ver estado del servicio:     pm2 status"
echo " • Ver logs en vivo:            pm2 logs facturador-sunat"
echo " • Reiniciar el sistema:        pm2 restart facturador-sunat"
echo " • Probar configuración Nginx:  nginx -t && systemctl reload nginx"
echo ""
