# 🇵🇪 Facturador SUNAT UBL 2.1 — Plataforma SaaS Multitenant & Marca Blanca

<p align="center">
  <img src="https://img.shields.io/badge/SUNAT-UBL%202.1%20Oficial-blue?style=for-the-badge&logo=peru" alt="SUNAT UBL 2.1" />
  <img src="https://img.shields.io/badge/Node.js-20%20LTS-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Storage-S3%20%7C%20R2%20%7C%20Local-FF9900?style=for-the-badge&logo=amazon-s3" alt="S3 Storage" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="MIT License" />
</p>

Plataforma SaaS completa, moderna y robusta de **Facturación Electrónica para Perú (SUNAT)** con arquitectura **Multitenant**, soporte de **Marca Blanca**, visor de impresión **A4 y Ticket (80mm)**, conexión directa con los Web Services oficiales de SUNAT (**sin PSE/OSE ni cobros por comprobante**) y almacenamiento multi-destino (**Disco Local, Amazon S3, Cloudflare R2 o MinIO**).

---

## 🌟 Características Principales

* 🏢 **Arquitectura Multitenant Real:** Una sola cuenta de registro de cliente puede administrar múltiples empresas emisoras (RUCs independientes) con sus propios certificados digitales `.pfx` y credenciales SOL.
* 🛡️ **Super Panel de Administración:** Panel centralizado para supervisar usuarios, suspender/reactivar clientes, ver estadísticas globales y configurar integraciones.
* 🎨 **Marca Blanca Total (White-Label):** Personaliza nombre de la plataforma, eslogan, logo, paleta de colores corporativos e información de soporte en tiempo real.
* ⚡ **Conexión Directa a SUNAT:** Emisión y validación directa mediante Web Services SOAP de SUNAT (Beta y Producción). Firma digital electrónica con algoritmo XML-DSig RSA-SHA256.
* 📄 **Visualización de Alta Fidelidad:**
  * **Formato A4 Oficial:** Membrete corporativo, detalle de ítems, totales tributarios, código QR y cuentas bancarias (CCI).
  * **Formato Ticket (80mm):** Diseñado para ticketeras térmicas de punto de venta.
* 💾 **Descargas en Tiempo Real:**
  * Archivo XML firmado UBL 2.1 (`{RUC}-01-{ID}.xml`).
  * Archivo ZIP original emitido por SUNAT (`R-{RUC}-01-{ID}.zip`).
  * Constancia CDR en XML extraída directamente en memoria (`R-{RUC}-01-{ID}.xml`).
* 🗄️ **Almacenamiento Multi-Destino Configurable:**
  * **Disco Local del VPS:** Carpetas organizadas automáticamente por `YYYY-MM / RUC / YYYY-MM-DD`.
  * **Amazon S3 / S3-Compatible:** Integración oficial con **Cloudflare R2** ($0 costo por descarga), **AWS S3**, **MinIO** on-premise y **DigitalOcean Spaces**.
  * **Modo Híbrido (Dual Sync):** Copia local para máxima velocidad + Réplica en la nube para respaldo permanente.
* 🌓 **Modo Oscuro / Modo Claro:** Diseño esterilizado con selector instantáneo y persistencia en `localStorage`.
* 🔍 **Autocompletado Rápido:** Consulta en vivo de RUC (SUNAT) y DNI (RENIEC) para llenado automático de nombres y dirección fiscal.
* ❌ **Anulaciones con Nota de Crédito:** Generación y envío automático de Notas de Crédito UBL 2.1 (tipo `07`) ante SUNAT.
* 🤖 **Integración con Bot de Telegram:** Consulta de comprobantes y emisión rápida desde chats de Telegram.

---

## 📊 Dimensionamiento de Recursos de Hardware (VPS)

Calculado según el consumo promedio de **~35 KB** por cada comprobante emitido (XML firmado + ZIP enviado + CDR ZIP + CDR XML + A4 HTML + Ticket HTML + Metadata JSON):

| Nivel de Carga | Facturas / Día | Facturas / Semana | Facturas / Mes | CPU Recomendada | RAM Mínima | Disco / Storage | Base de Datos | Costo Aprox. VPS |
|---|---|---|---|---|---|---|---|---|
| **🌱 Inicial / Micro** | Hasta 300 | Hasta ~2,100 | Hasta ~9,000 | **1 vCPU** | **1 GB - 2 GB** | 25 GB SSD | SQLite | ~$3.50 a $6 USD/mes |
| **🏢 Pyme / Medio** | Hasta 2,500 | Hasta ~17,500 | Hasta ~75,000 | **2 vCPU** | **4 GB** | 50 GB NVMe o S3 | SQLite / Postgres | ~$10 a $18 USD/mes |
| **🏬 Retail / Alto** | Hasta 15,000 | Hasta ~105,000 | Hasta ~450,000 | **4 vCPU** | **8 GB** | S3 / Cloudflare R2 | PostgreSQL | ~$24 a $40 USD/mes |
| **🚀 Enterprise / SaaS** | 50,000 a 200,000+ | 350,000+ | 1.5M a 6M+ | **8+ vCPU** (Cluster) | **16 GB - 32 GB** | S3 / Cloudflare R2 | PostgreSQL Cluster | ~$60 a $120 USD/mes |

### 💾 Proyección de Espacio en Disco (Almacenamiento Local):
* **100 comprobantes/día:** ~105 MB/mes → **~1.26 GB al año**.
* **1,000 comprobantes/día:** ~1.05 GB/mes → **~12.6 GB al año**.
* **5,000 comprobantes/día:** ~5.25 GB/mes → **~63.0 GB al año** *(Recomendado activar Cloudflare R2 o S3)*.
* **20,000 comprobantes/día:** ~21.0 GB/mes → **~252 GB al año** *(Obligatorio usar Cloudflare R2 / S3)*.

> [!TIP]
> **Recomendación para Producción:** Conecta **Cloudflare R2** desde el panel de Super Admin. Almacenar 100,000 facturas cuesta menos de **$0.15 USD al mes** y las descargas de los clientes tienen **$0 costo de transferencia (Zero Egress)**. El disco de tu servidor VPS nunca se saturará.

---

## 🚀 Despliegue en Servidor VPS (Producción)

Hemos preparado un script de instalación desatendida para **Ubuntu 22.04 / 24.04 LTS o Debian 11/12**:

### 1. Conéctate a tu VPS y clona el repositorio:
```bash
ssh root@TU_IP_VPS
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git /var/www/facturador-sunat
cd /var/www/facturador-sunat
```

### 2. Ejecuta el instalador automático:
```bash
sudo bash deploy/install.sh
```

El script configurará automáticamente:
* Node.js 20 LTS, Nginx, Certbot SSL y PM2.
* Generación de claves seguras JWT en `server/.env`.
* Migraciones de base de datos con Prisma y build de React con Vite.
* Configuración de Nginx Reverse Proxy con Gzip y WebSockets.
* Emisión e instalación de **Certificado SSL HTTPS gratuito de Let's Encrypt**.
* Inicio en segundo plano con PM2 e inicio automático al reiniciar el servidor.

> Para ver la guía detallada de instalación manual, consulta [MANUAL_PRODUCCION_VPS.md](MANUAL_PRODUCCION_VPS.md).

---

## 💻 Instalación y Desarrollo Local

### 1. Requisitos:
* Node.js 20 LTS o superior.
* Git.

### 2. Pasos:
```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd facturacion-telegram-sunat

# 2. Configurar e iniciar el Backend
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
node src/seed.js        # Siembra usuarios y empresas de prueba iniciales
npm run dev             # Servidor escuchando en http://localhost:3000

# 3. En otra terminal, iniciar el Frontend
cd ../client
npm install
npm run dev             # Aplicación escuchando en http://localhost:5173
```

---

## 🔑 Accesos de Demostración Sembrados

| Rol | Correo | Contraseña | Capacidades |
|---|---|---|---|
| **🛡️ Super Administrador** | `admin@facturador.com` | `Admin12345*` | Control total, gestión de inquilinos, métricas y configuración de Storage S3 / Marca Blanca. |
| **🏢 Cliente / Empresa** | `cliente@codegames.com` | `Cliente123*` | Emisión UBL 2.1, visor A4/Ticket, descargas de XML/CDR y configuración de empresa emisora. |

---

## 📂 Estructura del Proyecto

```text
facturacion-telegram-sunat/
 ├── client/                  # Frontend SPA en React + Vite
 │    ├── src/
 │    │    ├── components/    # Modales, Vistas de SuperAdmin, Configuración e Iconos SVG
 │    │    ├── App.jsx        # Dashboard, Emisión tipo APISUNAT y Listado
 │    │    └── index.css      # Sistema de diseño con variables de tema Claro/Oscuro
 ├── server/                  # Backend REST en Node.js + Express
 │    ├── prisma/             # Modelos de base de datos y migraciones
 │    ├── src/
 │    │    ├── bot/           # Integración con Telegraf (Telegram Bot)
 │    │    ├── middleware/    # Autenticación JWT y control de roles
 │    │    ├── routes/        # Endpoints modulares (Auth, Companies, SuperAdmin)
 │    │    └── services/      # Generador UBL 2.1, Firmador XML, Cliente SUNAT y Storage S3
 ├── deploy/                  # Archivos para puesta en producción
 │    ├── install.sh          # Script de despliegue automático en 1 comando
 │    ├── nginx.conf          # Plantilla Nginx con Reverse Proxy y SSL
 │    └── ecosystem.config.js # Configuración PM2 en modo cluster
 ├── storage/                 # Directorio local de comprobantes (preservado con .gitkeep)
 ├── MANUAL_PRODUCCION_VPS.md # Guía exhaustiva de despliegue y dimensionamiento
 └── README.md                # Presentación oficial del proyecto
```

---

## ⚙️ Variables de Entorno (`server/.env`)

```env
NODE_ENV=production
PORT=3000
APP_URL=https://facturador.tudominio.com
DATABASE_URL="file:./prod.db"
JWT_SECRET=tu_clave_secreta_jwt_muy_segura_de_produccion_2026
STORAGE_DIR=storage/comprobantes
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo para proyectos personales o comerciales.
