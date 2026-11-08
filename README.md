# 🇵🇪 Facturador SUNAT UBL 2.1 — API Proveedor & SaaS Multitenant

<p align="center">
  <img src="https://img.shields.io/badge/SUNAT-UBL%202.1%20Oficial-blue?style=for-the-badge&logo=peru" alt="SUNAT UBL 2.1" />
  <img src="https://img.shields.io/badge/API-REST%20Multiempresa-8A2BE2?style=for-the-badge" alt="REST API" />
  <img src="https://img.shields.io/badge/Telegram%20Bot-Telegraf-2CA5E0?style=for-the-badge&logo=telegram" alt="Telegram Bot" />
  <img src="https://img.shields.io/badge/Node.js-20%20LTS-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/MercadoPago-Checkout%20Pro-009EE3?style=for-the-badge&logo=mercadopago" alt="Mercado Pago" />
  <img src="https://img.shields.io/badge/Storage-S3%20%7C%20R2%20%7C%20Local-FF9900?style=for-the-badge&logo=amazon-s3" alt="S3 Storage" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="MIT License" />
</p>

Plataforma SaaS completa, moderna y robusta de **Facturación Electrónica para Perú (SUNAT)** con arquitectura **Multitenant**, soporte de **Marca Blanca**, **API Proveedor Multiempresa** para conectar sistemas externos (**POS, Odoo, Apps móviles, CRM, SaaS y WHMCS**), asistente conversacional oficial con **Bot de Telegram**, motor de monetización con pasarelas de pago (**Mercado Pago, Izipay, Culqi, PayPal**), visor de impresión **A4 y Ticket (80mm)**, conexión directa con los Web Services oficiales de SUNAT (**sin PSE/OSE ni cobros por comprobante**) y almacenamiento multi-destino (**Disco Local, Amazon S3, Cloudflare R2 o MinIO**).

---

## 🌟 Características Principales

* 🏢 **Arquitectura Multitenant Real:** Una sola cuenta de registro de cliente puede administrar múltiples empresas emisoras (RUCs independientes) con sus propios certificados digitales `.pfx` y credenciales SOL.
* 🛡️ **Super Panel de Administración:** Panel centralizado para supervisar usuarios, suspender/reactivar clientes, gestionar planes, pasarelas de pago, ver estadísticas globales y configurar integraciones.
* 🎨 **Marca Blanca Total (White-Label):** Personaliza nombre de la plataforma, eslogan, logo, paleta de colores corporativos e información de soporte en tiempo real.
* ⚡ **Conexión Directa a SUNAT:** Emisión y validación directa mediante Web Services SOAP de SUNAT (Beta y Producción). Firma digital electrónica con algoritmo XML-DSig RSA-SHA256 sin intermediarios ni cobros por documento.
* 📄 **Visualización de Alta Fidelidad:**
  * **Formato A4 Oficial:** Membrete corporativo, detalle de ítems, totales tributarios, código QR y cuentas bancarias (CCI).
  * **Formato Ticket (80mm):** Diseñado para ticketeras térmicas de punto de venta (POS).
* 💾 **Descargas en Tiempo Real:**
  * Archivo XML firmado UBL 2.1 (`{RUC}-01-{ID}.xml`).
  * Archivo ZIP original emitido por SUNAT (`R-{RUC}-01-{ID}.zip`).
  * Constancia CDR en XML extraída directamente en memoria (`R-{RUC}-01-{ID}.xml`).
* 🗄️ **Almacenamiento Multi-Destino Configurable:**
  * **Disco Local del VPS:** Carpetas organizadas automáticamente por `YYYY-MM / RUC / YYYY-MM-DD`.
  * **Amazon S3 / S3-Compatible:** Integración oficial con **Cloudflare R2** ($0 costo por descarga), **AWS S3**, **MinIO** on-premise y **DigitalOcean Spaces**.
  * **Modo Híbrido (Dual Sync):** Copia local para máxima velocidad + Réplica en la nube para respaldo permanente.
* 📬 **Consulta Masiva al Buzón SOL (SUNAT):** Monitoreo y sincronización multi-empresa mediante Clave SOL de notificaciones tributarias, resoluciones coactivas y esquelas de citación con alertas de plazos legales de descargo.
* ⚖️ **Consulta Masiva Casilla Electrónica SUNAFIL:** Control preventivo multi-RUC de requerimientos inspectivos laborales, comités de SST, planillas y cartas inductivas vía autenticación Clave SOL.
* 📖 **Guía Visual de Integración Interactiva:** Módulo gráfico integrado paso a paso para la obtención del Certificado CDT gratuito de SUNAT, creación de Usuario Secundario SOL y resolución de errores (1033, 1034, 0306).
* 🌓 **Modo Oscuro / Modo Claro:** Diseño esterilizado con selector instantáneo y persistencia en `localStorage`.
* 🔐 **Gestión y Cambio de Contraseñas:** Autoservicio de cambio de clave para usuarios y SuperAdmin en el encabezado, más restablecimiento administrativo directo con generador seguro en el panel Super Admin.
* 🔍 **Autocompletado Rápido:** Consulta en vivo de RUC (SUNAT) y DNI (RENIEC) para llenado automático de nombres y dirección fiscal.
* ❌ **Anulaciones con Nota de Crédito:** Generación y envío automático de Notas de Crédito UBL 2.1 (tipo `07`) ante SUNAT.
* 🤖 **Integración con Bot de Telegram:** Asistente interactivo guiado para consultar empresas y emitir Facturas y Boletas oficiales directamente desde chats de Telegram.
* 🔌 **API Proveedor Multiempresa:** Conecta sistemas externos (POS, Odoo, Apps, CRM, SaaS, WHMCS) mediante JSON con SDKs en C#, Python, Java, JS y PHP.
* 💳 **Pasarelas de Pago Integradas:** Suscripciones con **Mercado Pago Checkout Pro (con Webhook IPN)**, Izipay, Culqi y PayPal con activación automática de cuotas de documentos.

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

## 🏗️ Arquitectura del API Proveedor (Multiempresa)

Cualquier sistema cliente o lenguaje de programación se conecta enviando un payload en formato `JSON` autenticado con Bearer API Key. La plataforma valida, calcula impuestos, genera el XML UBL 2.1, firma con el Certificado Digital CDT, comprime en ZIP, transmite a SUNAT y retorna la respuesta oficial (CDR) con enlaces a PDF (A4 y Ticket de 80mm):

```mermaid
flowchart TD
    subgraph SistemasClientes["Sistemas Clientes (vía JSON)"]
        POS["🏪 POS (Cajas / Retail)"]
        CRM["💼 CRM (Ventas / Leads)"]
        APP["📱 APPs Móviles (Flutter / RN)"]
        ODOO["🏢 Odoo ERP (v14 a v18)"]
        SAAS["☁️ SaaS (Suscripciones)"]
        WHMCS["🌐 WHMCS (Hosting / Dominios)"]
        OTROS["🧩 Otros (E-commerce / ERPs)"]
    end

    subgraph CoreAPI["API FACTURACIÓN MULTIEMPRESA"]
        direction TB
        V["1. Validar Catálogos & Esquemas"]
        G["2. Generar XML UBL 2.1"]
        F["3. Firmar con Certificado Digital CDT (.pfx)"]
        C["4. Calcular Base Imponible & IGV 18%"]
        Z["5. Comprimir archivo XML.zip"]
        E["6. Transmitir a Web Services SUNAT"]
        R["7. Leer CDR de Respuesta Oficial"]
        S["8. Almacenar PDF (A4 y Ticket 80mm), XML y CDR"]
    end

    subgraph ServidorSunat["Servidor Oficial SUNAT"]
        SV["Validar Estructura & Verificar Firma"] --> SR["Devolver Respuesta CDR (XML Firmado)"]
    end

    SistemasClientes -->|POST /invoices (JSON)| CoreAPI
    CoreAPI -->|SOAP / REST UBL 2.1| ServidorSunat
    ServidorSunat -->|CDR ZIP Oficial Aceptado| CoreAPI
```

### 💻 Lenguajes y Entornos Compatibles:
* **Lenguajes:** C#, Python, Java, JavaScript / TypeScript / Node.js, PHP, cURL / Bash.
* **Infraestructura:** VPS Linux (Ubuntu / Debian), Contenedores Docker, AWS, Google Cloud Platform, Microsoft Azure, Servidores Dedicados y Hosting Compartido.

---

## 🤖 Asistente & Emisión Oficial vía Bot de Telegram

La plataforma incluye un **Bot de Telegram conversacional nativo** desarrollado con **Telegraf**, que permite a dueños de negocio, administradores y vendedores emitir comprobantes oficiales con validez fiscal directamente desde su celular o app de Telegram:

```text
 📱 Usuario en Telegram                🤖 Bot de Facturación SUNAT
         │                                       │
         ├────── /emitir ───────────────────────>│
         │<───── Selecciona Factura o Boleta ────┤
         ├────── RUC o DNI ─────────────────────>│ ──> Consulta Padrón SUNAT/RENIEC
         │<───── Confirma Cliente y Dirección ───┤
         ├────── Descripción y Precio ──────────>│ ──> Calcula Base + IGV 18%
         │<───── Resumen con Botón de Emisión ───┤
         ├────── [ ✅ Emitir Comprobante ] ─────>│ ──> Firma CDT + Envío a SUNAT
         │<───── ✅ CDR ACEPTADO + Archivos ─────┤
         │       • Adjunta XML UBL 2.1 firmado   │
         │       • Adjunta ZIP CDR oficial       │
         │       • Botones: Ticket 80mm y PDF A4 │
```

### 📌 Comandos Disponibles en Telegram:
* `/start`: Mensaje de bienvenida, verificación de empresa emisora activa y menú de opciones.
* `/emitir`: Inicia el flujo guiado e interactivo de emisión con botones en línea.
* `/config`: Consulta el RUC emisor, Razón Social, usuario SOL, entorno activo (**Beta** o **Producción**) y estado del Certificado Digital CDT.
* `/ayuda`: Muestra la guía rápida de comandos y ayuda tributaria.
* `/cancelar`: Cancela cualquier proceso de emisión en curso y reinicia la sesión.

### 🌟 Capacidades Clave del Bot:
1. **Autocompletado con Padrón Oficial:** Al ingresar el número de RUC (11 dígitos) o DNI (8 dígitos), el bot consulta en milisegundos la base de datos oficial y autocompleta la Razón Social y Dirección Fiscal sin que tengas que escribirla.
2. **Desglose Fiscal Automático:** Ingresas únicamente el precio total en soles y el bot calcula el Valor Neto, IGV (18%) y total a pagar.
3. **Entrega Inmediata de Comprobantes en el Chat:**
   * 📄 **Archivo XML firmado UBL 2.1** enviado como documento adjunto listo para descargar.
   * 🛡️ **Archivo ZIP del CDR de SUNAT** enviado como documento adjunto.
   * 🧾 **Botón interactivo Ticket (80mm)** para imprimir directamente en ticketeras térmicas.
   * 📄 **Botón interactivo Formato A4** para visualizar y compartir el comprobante completo.
4. **Configuración en Servidor:**
   Basta con definir la variable en tu archivo `server/.env`:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
   ```
   También puedes activarlo o pausarlo con un solo clic desde el panel de SuperAdmin.

---

## 🚀 Endpoints de la API Externa REST (`/api/v1/external`)

Autenticación mediante header `Authorization: Bearer sk_live_...` o `x-api-key: sk_live_...`:

| Método | Endpoint | Descripción | Ideal para |
|---|---|---|---|
| `POST` | `/api/v1/external/invoices` | Emite una **Factura (01)**, **Boleta (03)** o **Nota de Crédito (07)** en SUNAT. | POS, Odoo, Apps, CRM |
| `POST` | `/api/v1/external/invoices/batch` | Emisión masiva de comprobantes en un solo request HTTP con control de cuota. | Cierres de mes, SaaS |
| `GET` | `/api/v1/external/consultas/ruc/:ruc` | Consulta en padrón SUNAT en tiempo real (Razón Social, Dirección, Estado, Condición). | Autocompletar clientes en POS y CRM |
| `GET` | `/api/v1/external/consultas/dni/:dni` | Consulta en padrón RENIEC en tiempo real (Nombres y Apellidos completos). | Emisión de Boleta rápida |
| `GET` | `/api/v1/external/companies` | Lista todas las empresas (RUCs) activas bajo la cuenta (**Multiempresa**). | POS multi-sucursal, Odoo multi-company |
| `GET` | `/api/v1/external/invoices/:id` | Consulta estado, detalles tributarios y URLs de descarga de un comprobante emitido. | Auditoría y consulta de ventas |
| `GET` | `/api/v1/external/invoices/:id/pdf` | Render directo de representación impresa (`?format=ticket` o `?format=a4`). | Impresoras térmicas de 80mm |
| `GET` | `/api/v1/external/invoices/:id/xml` | Descarga directa del archivo XML UBL 2.1 firmado. | Contabilidad externa |
| `GET` | `/api/v1/external/invoices/:id/cdr` | Descarga directa del archivo ZIP del CDR de SUNAT. | Sustento tributario |
| `POST` | `/api/v1/external/invoices/:id/void` | Emite automáticamente una Nota de Crédito de anulación en SUNAT. | Devoluciones y cancelaciones |
| `GET` | `/api/v1/external/status` | Verifica validez de API Key, cuota de comprobantes restante y empresa activa. | Health-check de integraciones |

---

## 🔌 Guías de Integración por Sistema

### 1. 🏪 Puntos de Venta (POS & Cajas Registradoras)
* Emite tickets en formato térmico de 80mm vía endpoint directo `/receipt/:id?format=ticket`.
* Boleta rápida sin documento o con DNI para compras menores a S/ 700.
* Parámetro `includeBase64: true` en el payload para imprimir localmente vía Bluetooth o impresoras de red.
* Búsqueda en vivo de RUC y DNI para que el cajero no digite nombres manualmente.

### 2. 🏢 Odoo ERP (v14, v15, v16, v17, v18)
* Funciona mediante una **Acción Automatizada (Automated Action)** en Python sobre el modelo `account.move`.
* Al pulsar *"Confirmar / Validar Factura"* en Odoo, el script envía el payload JSON a la API y recibe el ID oficial de SUNAT y enlace al PDF, anotándolos en el chatter de Odoo.

### 3. 📱 Aplicaciones Móviles (Flutter / React Native)
* Emisión móvil para repartidores, transportistas y vendedores en ruta desde Android o iOS.
* Respuestas ultra rápidas (< 900 ms) y retorno de XML / CDR en Base64 para sincronización offline.

### 4. 🌐 WHMCS (Hosting & Dominios)
* Hook oficial en PHP para WHMCS (`/includes/hooks/sunat_billing.php`).
* Detecta el pago de órdenes (`InvoicePaid`), distingue automáticamente entre RUC (Factura) y DNI (Boleta), maneja soles (PEN) o dólares (USD) y anota la serie en la factura de WHMCS.

---

## 💳 Sistema de Planes SaaS & Pasarelas de Pago

La plataforma incluye un motor de monetización SaaS administrado exclusivamente por el SuperAdmin:

* **Planes de Suscripción:**
  * **Plan Gratuito:** 30 días de prueba, hasta 30 comprobantes/mes, 1 usuario.
  * **Plan Starter:** Hasta 100 comprobantes/mes, 2 usuarios.
  * **Plan Emprendedor:** Hasta 300 comprobantes/mes, 3 usuarios.
  * **Plan Corporativo:** Comprobantes ilimitados, hasta 8 usuarios.
* **Integraciones de Pasarelas de Pago:**
  * **Mercado Pago Checkout Pro:** Redirección automática a pasarela segura con tarjeta, saldo y Yape, creación dinámica de preferencia y **Webhook IPN público** para activación instantánea de planes.
  * **Izipay, Culqi y PayPal:** Configuración centralizada de credenciales desde el SuperAdmin.
  * Ocultamiento dinámico: si el SuperAdmin desactiva una pasarela, desaparece automáticamente de las opciones del cliente final.
* **Salud de Suscripción:** Panel de estado en tiempo real para el cliente con barra de progreso de documentos emitidos y recordatorio de renovación solo cuando el plan está por vencer o vencido.

---

## 🇵🇪 Guía de Sincronización con SUNAT (¿De dónde obtener los datos?)

Para que una empresa emita comprobantes con valor fiscal real directo a SUNAT, debe ingresar 3 elementos clave en el menú **🏢 Mi Empresa**:

1. **Certificado Digital Tributario (`.pfx` / `.p12`):**
   * **Gratuito (Mypes):** Si estás en Régimen Mype, Especial o General con ventas menores a 300 UIT anuales, solicítalo gratis en SUNAT SOL:
     👉 *Empresas > Comprobantes de Pago > Certificado Digital Tributario - CDT > Solicitar CDT*.
   * **Comercial:** Adquiérelo con proveedores INDECOPI (*Reniec, Llama.pe, Camerfirma, Avansi*) y regístralo en SUNAT SOL.
2. **Usuario Secundario SOL y Clave SOL:**
   * SUNAT prohíbe usar la clave principal del representante legal para emitir.
   * Créalo en SUNAT SOL: *Menú superior derecho > Administración de Usuarios Secundarios > Crear Usuario*.
   * Asigna los permisos en: *Tributarios > Comprobantes de Pago > SEE - Desde los Sistemas del Contribuyente* (Factura, Boleta, Notas, Consultas).
3. **Entorno de Emisión:**
   * **Beta:** Usa `MODDATOS` / `moddatos` para pruebas sin impacto tributario.
   * **Producción:** Usa tu usuario secundario y certificado real para comprobantes con plena validez legal.

> 📖 **Manual Detallado Paso a Paso:** Consulta la guía completa con capturas de pantalla, rutas de menú y solución a errores de SUNAT en [MANUAL_INTEGRACION_SUNAT.md](MANUAL_INTEGRACION_SUNAT.md). También puedes abrir la guía interactiva dentro del sistema con el botón **"📖 ¿Cómo obtener estos datos? (Guía SUNAT)"** en la pantalla de *Mi Empresa*.

---

## 🚀 Despliegue en Servidor VPS Linux

### 1. Instalación Inicial (Primer despliegue):
```bash
# Conéctate a tu VPS (Ubuntu 22.04 / 24.04 LTS o Debian 11/12)
ssh root@TU_IP_VPS
git clone https://github.com/tranksed/facturaelectronicaSUNAT.git /var/www/facturador-sunat
cd /var/www/facturador-sunat

# Ejecuta el instalador automático desatendido
sudo bash deploy/install.sh
```

El script configurará automáticamente:
* Node.js 20 LTS, Nginx, Certbot SSL y PM2.
* Generación de claves seguras JWT en `server/.env`.
* Migraciones de base de datos con Prisma y build de React con Vite.
* Configuración de Nginx Reverse Proxy con Gzip y WebSockets.
* Emisión e instalación de **Certificado SSL HTTPS gratuito de Let's Encrypt**.
* Inicio en segundo plano con PM2 e inicio automático al reiniciar el servidor.

### 2. Actualización Rápida en 1 Comando:
Cada vez que se suban mejoras al repositorio de GitHub, actualiza tu servidor en segundos sin perder datos:
```bash
cd /var/www/facturador-sunat
bash deploy/update.sh
```

> Para ver la guía detallada de instalación manual, consulta [MANUAL_PRODUCCION_VPS.md](MANUAL_PRODUCCION_VPS.md).

---

## 💻 Instalación y Desarrollo Local

### 1. Requisitos:
* Node.js 20 LTS o superior.
* Git.

### 2. Pasos:
```bash
# 1. Clonar el repositorio
git clone https://github.com/tranksed/facturaelectronicaSUNAT.git
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
| **🛡️ Super Administrador** | `admin@facturador.com` | `Admin12345*` | Control total, gestión de inquilinos, planes, pasarelas de pago, métricas y configuración de Storage S3 / Marca Blanca. |
| **🏢 Cliente / Empresa** | `cliente@codegames.com` | `Cliente123*` | Emisión UBL 2.1, generación de API Keys, visor A4/Ticket, descargas de XML/CDR y configuración multi-RUC. |

---

## 📂 Estructura del Proyecto

```text
facturacion-telegram-sunat/
 ├── client/                  # Frontend SPA en React + Vite
 │    ├── src/
 │    │    ├── components/    # Modales, Vistas de SuperAdmin, API Hub, Configuración e Iconos SVG
 │    │    ├── App.jsx        # Dashboard, Emisión tipo APISUNAT y Listado
 │    │    └── index.css      # Sistema de diseño con variables de tema Claro/Oscuro y Split Hero
 ├── server/                  # Backend REST en Node.js + Express
 │    ├── prisma/             # Modelos de base de datos y migraciones
 │    ├── src/
 │    │    ├── bot/           # Integración con Telegraf (Telegram Bot Oficial)
 │    │    ├── middleware/    # Autenticación JWT y control de roles
 │    │    ├── routes/        # Endpoints modulares (Auth, Companies, External API, SuperAdmin, Subscriptions)
 │    │    └── services/      # Generador UBL 2.1, Firmador XML, Cliente SUNAT, Padrón y Storage S3
 ├── deploy/                  # Archivos para puesta en producción
 │    ├── install.sh          # Script de despliegue automático con soporte multi-puerto y SSL
 │    ├── update.sh           # Script de actualización segura en un solo paso
 │    ├── nginx.conf          # Plantilla Nginx con Reverse Proxy y SSL
 │    └── ecosystem.config.js # Configuración PM2 en modo cluster
 ├── storage/                 # Directorio local de comprobantes (preservado con .gitkeep)
 ├── MANUAL_INTEGRACION_SUNAT.md # Guía paso a paso: Certificado Digital y Usuario Secundario SOL
 ├── MANUAL_PRODUCCION_VPS.md # Guía exhaustiva de despliegue y dimensionamiento
 ├── MANUAL_CLOUDFLARE.md     # Guía oficial de integración con Cloudflare y SSL
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
TELEGRAM_BOT_TOKEN="tu_token_de_bot_father_telegram"
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo comercialmente.
