# 🚀 MANUAL DE PUESTA EN PRODUCCIÓN Y DESPLIEGUE EN VPS
## Sistema de Facturación Electrónica SUNAT Multitenant & Marca Blanca

Este manual contiene la guía completa y profesional para:
1. Subir tu proyecto a tu repositorio de **GitHub**.
2. Desplegarlo en tu **VPS (Ubuntu 22.04 / 24.04 LTS o Debian 11/12)** con **Nginx, SSL Let's Encrypt y PM2**.
3. Configurar las opciones de **Almacenamiento (File Server / Amazon S3 / Cloudflare R2 / MinIO)** desde el **Super Panel de Administración**.

---

## 📌 1. Requisitos Previos del VPS

* **Servidor VPS:** Mínimo 1 vCPU, 1 GB de RAM (Recomendado: 2 vCPU, 2 GB o 4 GB RAM).
* **Sistema Operativo:** Ubuntu 22.04 LTS / Ubuntu 24.04 LTS o Debian 11/12.
* **Acceso:** Acceso SSH con usuario `root` o privilegios `sudo`.
* **Dominio o Subdominio:** Un dominio registrado (ej. `facturador.tudominio.com`) con un registro DNS de tipo **A** apuntando hacia la dirección IP pública de tu VPS.
  * *Ejemplo DNS en Cloudflare/GoDaddy:*
    * Tipo: `A`
    * Nombre: `facturador`
    * Contenido: `203.0.113.195` (IP de tu VPS)
    * TTL: Automático

---

## 🐙 2. Cómo Subir el Proyecto a tu GitHub

El proyecto ya cuenta con un archivo [`.gitignore`](file:///C:/Users/traNksed/.gemini/antigravity/scratch/facturacion-telegram-sunat/.gitignore) configurado para proteger tus credenciales, bases de datos locales y archivos temporales.

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Inicializar repositorio Git local (si no lo has hecho)
git init

# 2. Agregar todos los archivos preparados
git add .

# 3. Crear el primer commit oficial
git commit -m "feat: Facturación Electrónica SUNAT Multitenant y Marca Blanca v1.0"

# 4. Establecer la rama principal como main
git branch -M main

# 5. Conectar con tu repositorio de GitHub (crea un repo vacío en github.com previamente)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir el código a GitHub
git push -u origin main
```

---

## ⚡ 3. Despliegue en el VPS - Opción Rápida (Script Automatizado)

Hemos incluido el script automatizado [`deploy/install.sh`](file:///C:/Users/traNksed/.gemini/antigravity/scratch/facturacion-telegram-sunat/deploy/install.sh) que instala todo de forma desatendida.

### Pasos en tu VPS:

1. **Conéctate por SSH a tu VPS:**
   ```bash
   ssh root@TU_IP_VPS
   ```

2. **Clona tu repositorio en el VPS:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git /var/www/facturador-sunat
   cd /var/www/facturador-sunat
   ```

3. **Ejecuta el instalador automático:**
   ```bash
   sudo bash deploy/install.sh
   ```

4. **El script te solicitará:**
   * Tu dominio: `facturador.tudominio.com`
   * Tu email para el certificado SSL: `tuemail@tudominio.com`

5. **¡Listo!** El script se encargará automáticamente de:
   * Instalar Node.js 20 LTS, Nginx, Certbot y PM2.
   * Generar una clave secreta JWT aleatoria y segura.
   * Compilar el cliente React y preparar la base de datos.
   * Configurar Nginx con compresión Gzip, WebSockets y Reverse Proxy.
   * Emitir e instalar el certificado SSL HTTPS gratuito de Let's Encrypt.
   * Iniciar el proceso en segundo plano con PM2 e inicio automático al reiniciar el VPS.
   * Configurar el cortafuegos UFW (Puertos 22, 80, 443).

---

## 🛠️ 4. Despliegue Manual Paso a Paso (Alternativa)

Si prefieres realizar la instalación paso a paso de forma manual, sigue esta guía:

### Paso 1: Actualizar el Sistema e Instalar Paquetes Base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx
```

### Paso 2: Instalar Node.js 20 LTS y PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Paso 3: Clonar el Repositorio
```bash
sudo mkdir -p /var/www/facturador-sunat
sudo git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git /var/www/facturador-sunat
cd /var/www/facturador-sunat
sudo mkdir -p storage/comprobantes logs server/prisma
```

### Paso 4: Configurar Variables de Entorno (`server/.env`)
```bash
cd /var/www/facturador-sunat/server
cp .env.example .env
nano .env
```
Ajusta los siguientes valores en `server/.env`:
```env
NODE_ENV=production
PORT=3000
APP_URL=https://facturador.tudominio.com
DATABASE_URL="file:./prod.db"
JWT_SECRET=escribe_aqui_una_clave_aleatoria_muy_larga_de_64_caracteres
STORAGE_DIR=storage/comprobantes
```

### Paso 5: Instalar Dependencias y Compilar
```bash
# 1. Preparar servidor y base de datos
cd /var/www/facturador-sunat/server
npm install --production=false
npx prisma generate
npx prisma db push

# 2. Compilar aplicación React para producción
cd /var/www/facturador-sunat/client
npm install
npm run build
```

### Paso 6: Configurar Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/facturador-sunat
```
Pega la siguiente configuración (reemplazando `facturador.tudominio.com` por tu dominio real):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name facturador.tudominio.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Habilita el sitio:
```bash
sudo ln -sf /etc/nginx/sites-available/facturador-sunat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Paso 7: Instalar Certificado SSL HTTPS Gratuito
```bash
sudo certbot --nginx -d facturador.tudominio.com
```
*Selecciona la opción para redirigir todo el tráfico HTTP a HTTPS.*

### Paso 8: Iniciar la Aplicación con PM2
```bash
cd /var/www/facturador-sunat
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

### Paso 9: Activar Firewall UFW
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 🗄️ 5. Opciones de Almacenamiento (Storage) en el Super Admin

En el **🛡️ Super Panel de Administración**, pestaña **File Server & Almacenamiento VPS**, puedes seleccionar cómo se guardan físicamente los XML firmados, ZIPs y CDRs de SUNAT:

### Comparativa de Opciones:

| Proveedor de Almacenamiento | Rendimiento | Costo | Seguridad y Respaldo | ¿Cuándo elegirlo? |
|---|---|---|---|---|
| **🏢 Local (Mismo VPS)** | ⚡ Inmediato | $0 adicional | Depende del disco del VPS | Ideal para fase inicial, servidores pequeños o pruebas. |
| **☁️ Amazon S3 / Compatible** *(Recomendado)* | 🚀 Ultra Rápido | Centavos / mes ($0 egress en R2) | 🛡️ 99.999999999% de durabilidad | **La mejor opción para SaaS en producción.** Desacopla el almacenamiento del VPS. |
| **🔄 Híbrido (Local + S3 Dual)** | ⚡⚡ Máximo | Mismo que S3 | 🛡️ Copia local rápida + Respaldo en la Nube | Ideal para alta concurrencia y máxima seguridad. |
| **🖥️ File Server Remoto (SFTP)** | 🌐 Variable | Costo del servidor remoto | Aislamiento físico | Ideal para empresas con NAS propio o servidor de archivos interno. |

---

### ☁️ ¿Cuál es la Opción Ideal para Producción?
👉 **Cloudflare R2** o **Amazon S3**:
1. **Cloudflare R2 (API S3 Compatible):**
   * **$0 de costo de transferencia (Zero Egress Fees):** Las descargas de XML y CDR por parte de los clientes nunca te generarán cobros por ancho de banda.
   * Primeros **10 GB de almacenamiento gratis** todos los meses.
   * Compatible 100% con la API S3.
2. **MinIO (S3 Auto-hospedado):**
   * Si tu cliente o empresa no desea usar nubes públicas y tiene servidores propios, MinIO ofrece una API S3 local 100% gratuita.

---

### ⚙️ Cómo configurar Cloudflare R2 en el Super Admin:
1. En tu cuenta de Cloudflare, ve a **R2 Object Storage** > **Create bucket** (ej: `comprobantes-sunat`).
2. En **Manage R2 API Tokens**, crea un token con permisos de lectura y escritura.
3. En el Super Admin de la plataforma:
   * **Proveedor:** `Amazon S3 / S3 Compatible`
   * **Endpoint:** `https://<tu_account_id>.r2.cloudflarestorage.com`
   * **Región:** `auto` (o `us-east-1`)
   * **Bucket:** `comprobantes-sunat`
   * **Access Key ID:** `TU_R2_ACCESS_KEY`
   * **Secret Access Key:** `TU_R2_SECRET_KEY`
4. Presiona el botón **🧪 Probar Conexión S3** para verificar la comunicación en vivo y luego **💾 Guardar Configuración**.

---

## 🔄 6. Comandos de Gestión y Mantenimiento Diario en el VPS

```bash
# Ver estado de los procesos y consumo de memoria/CPU
pm2 status

# Ver logs en vivo del facturador
pm2 logs facturador-sunat

# Reiniciar la aplicación sin caída de servicio (Zero Downtime)
pm2 reload facturador-sunat

# Actualizar el sistema a la última versión de GitHub
cd /var/www/facturador-sunat
git pull
cd server && npx prisma db push
cd ../client && npm run build
pm2 reload facturador-sunat

# Ver estado de Nginx
sudo systemctl status nginx

# Renovar certificado SSL manualmente (se renueva automáticamente)
sudo certbot renew --dry-run
```
