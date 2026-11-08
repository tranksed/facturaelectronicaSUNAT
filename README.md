# 🇵🇪 Facturador SUNAT UBL 2.1 — API Proveedor & SaaS Multitenant

<p align="center">
  <img src="https://img.shields.io/badge/SUNAT-UBL%202.1%20Oficial-blue?style=for-the-badge&logo=peru" alt="SUNAT UBL 2.1" />
  <img src="https://img.shields.io/badge/API-REST%20Multiempresa-8A2BE2?style=for-the-badge" alt="REST API" />
  <img src="https://img.shields.io/badge/Node.js-20%20LTS-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/MercadoPago-Checkout%20Pro-009EE3?style=for-the-badge&logo=mercadopago" alt="Mercado Pago" />
  <img src="https://img.shields.io/badge/Storage-S3%20%7C%20R2%20%7C%20Local-FF9900?style=for-the-badge&logo=amazon-s3" alt="S3 Storage" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="MIT License" />
</p>

Plataforma SaaS completa, moderna y robusta de **Facturación Electrónica para Perú (SUNAT)** con arquitectura **Multitenant**, soporte de **Marca Blanca**, **API Proveedor Multiempresa** para conectar sistemas externos (**POS, Odoo, Apps móviles, CRM, SaaS y WHMCS**), pasarelas de pago (**Mercado Pago, Izipay, Culqi, PayPal**), visor de impresión **A4 y Ticket (80mm)**, y conexión directa con los Web Services oficiales de SUNAT (**sin PSE/OSE intermediarios ni cobros por comprobante**).

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

## 🌟 Otras Características Destacadas

* 🏢 **Multitenant & Multi-RUC:** Una sola cuenta de cliente puede registrar y administrar múltiples empresas emisoras independientes.
* 🎨 **Marca Blanca Total (White-Label):** Personaliza nombre del SaaS, logotipo, colores corporativos, enlaces de soporte y política de registro público.
* ⚡ **Conexión Directa a SUNAT:** Emisión y validación directa mediante Web Services SOAP de SUNAT (Beta y Producción) sin intermediarios ni costos por documento.
* 🗄️ **Almacenamiento Multi-Destino:** Compatible con disco local del VPS, **Cloudflare R2** ($0 costo por descarga), **AWS S3** o **MinIO**.
* 📬 **Buzón SOL (SUNAT) & Casilla SUNAFIL:** Monitoreo multi-empresa de notificaciones tributarias e inspectivas laborales vía Clave SOL.
* 🌓 **Diseño Dividido (Split-Screen) Esterilizado:** Portada moderna inspirada en CloudPeru con arte vectorial, tarjeta fiscal en vivo y formulario de acceso limpio.

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

El script configurará automáticamente Node.js 20 LTS, Nginx, Certbot SSL (Let's Encrypt), PM2 y migraciones de base de datos.

### 2. Actualización Rápida en 1 Comando:
Cada vez que se suban mejoras al repositorio de GitHub, actualiza tu servidor en segundos sin perder datos:
```bash
cd /var/www/facturador-sunat
bash deploy/update.sh
```

---

## 🔑 Accesos de Demostración Sembrados

| Rol | Correo | Contraseña | Capacidades |
|---|---|---|---|
| **🛡️ Super Administrador** | `admin@facturador.com` | `Admin12345*` | Gestión global, planes, pasarelas de pago, inquilinos, almacenamiento S3 y marca blanca. |
| **🏢 Cliente / Empresa** | `cliente@codegames.com` | `Cliente123*` | Emisión UBL 2.1, generación de API Keys, visor A4/Ticket, descargas y configuración multi-RUC. |

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo comercialmente.
