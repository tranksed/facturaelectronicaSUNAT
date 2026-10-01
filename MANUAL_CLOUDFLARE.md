# ☁️ GUÍA OFICIAL: INTEGRACIÓN CON CLOUDFLARE Y SSL
## Sistema de Facturación Electrónica SUNAT Multitenant

Cloudflare es la solución más recomendada para proteger, acelerar y dotar de SSL a tu Facturador SUNAT sin lidiar con renovaciones complejas ni problemas con el puerto 80.

---

## 🌟 Ventajas de Usar Cloudflare

1. **Oculta la IP real de tu VPS:** Los atacantes y escáneres solo ven las IPs de Cloudflare, protegiendo tu servidor contra ataques directos.
2. **SSL Gratuito Permanente:** Cloudflare emite y renueva automáticamente certificados SSL públicos (Edge Certificates) sin necesidad de Certbot.
3. **Funciona con Puertos Personalizados:** Si no puedes usar los puertos 80/443 en tu VPS, Cloudflare permite enrutar tráfico seguro hacia puertos alternativos.
4. **Protección DDoS y WAF:** Bloquea bots maliciosos antes de que lleguen a saturar la CPU de tu VPS.

---

## 🔌 1. Puertos Compatibles con Cloudflare (Proxy Naranja Activado)

Cuando activas la **nube naranja (Proxy status: Proxied)** en Cloudflare, el tráfico debe circular obligatoriamente por uno de los puertos autorizados por su red global:

| Tipo de Tráfico | Puertos Compatibles con Cloudflare | Recomendados |
|---|---|---|
| **HTTPS (Cifrado)** | `443`, `2053`, `2083`, `2087`, `2096`, `8443` | **`443`** o **`8443`** |
| **HTTP (Plano)** | `80`, `8080`, `8880`, `2052`, `2082`, `2086`, `2095` | **`80`** o **`8080`** |

> [!WARNING]
> Si configuras Nginx en un puerto no admitido (ej: `3000` o `9000`) con la nube naranja activada, Cloudflare arrojará un error 521 (Web server is down). Usa siempre uno de los puertos listados arriba (como `8443` o `8080`).

---

## ⚙️ 2. Paso 1: Configurar el Registro DNS en Cloudflare

1. Ingresa a tu panel de [Cloudflare](https://dash.cloudflare.com/) y selecciona tu dominio.
2. Ve a la sección **DNS** > **Records**.
3. Haz clic en **Add record**:
   * **Type:** `A`
   * **Name:** `facturador` (o `@` si usas el dominio raíz)
   * **IPv4 address:** `IP_DE_TU_VPS` (ej: `203.0.113.195`)
   * **Proxy status:** **Proxied (Nube Naranja Activada)**
   * **TTL:** `Auto`
4. Guarda el registro.

---

## 🔒 3. Elección del Método de SSL en Cloudflare

Tienes dos modalidades de implementación:

---

### Método A: Cloudflare Flexible SSL (El más Rápido — 0 Certificados en el VPS)

En este modo, el usuario se conecta a Cloudflare por **HTTPS seguro**. Luego, Cloudflare se conecta a tu VPS por **HTTP** en el puerto que elijas (ej: `80` o `8080`).

#### 1. Configuración en Cloudflare:
* Ve a **SSL/TLS** > **Overview**.
* Selecciona el modo: **Flexible**.

#### 2. Configuración en tu VPS:
Al ejecutar el instalador `sudo bash deploy/install.sh`, selecciona:
* **Opción 2:** `Cloudflare Proxy / Flexible SSL`
* **Puerto:** `80` (o `8080` si el 80 está ocupado).
* El script configurará Nginx automáticamente sin necesidad de Certbot.

---

### Método B: Cloudflare Full (Strict) con Origin Certificate (Máxima Seguridad — 15 Años de Validez)

En este modo, el tráfico está cifrado de extremo a extremo:
`Usuario <--HTTPS--> Cloudflare <--HTTPS Cifrado--> VPS`

Cloudflare te entrega un certificado oficial gratuito con **15 años de vigencia** para instalarlo en Nginx.

#### 1. Crear el Origin Certificate en Cloudflare:
1. En Cloudflare, ve a **SSL/TLS** > **Origin Server**.
2. Haz clic en **Create Certificate**.
3. Deja seleccionadas las opciones predeterminadas:
   * *Private key type:* `RSA (2048)`
   * *Hostnames:* `*.tudominio.com`, `tudominio.com`
   * *Certificate Validity:* `15 years`
4. Haz clic en **Create**.
5. Cloudflare te mostrará dos cuadros de texto:
   * **Origin Certificate** (Certificado público)
   * **Private Key** (Clave privada)

#### 2. Guardar los archivos en tu VPS:
Abre tu consola SSH en el VPS y ejecuta:

```bash
# 1. Guardar el certificado
sudo nano /etc/ssl/cloudflare-origin.crt
# (Pega el contenido del cuadro "Origin Certificate" y guarda con Ctrl+O, Enter, Ctrl+X)

# 2. Guardar la clave privada
sudo nano /etc/ssl/cloudflare-origin.key
# (Pega el contenido del cuadro "Private Key" y guarda)

# 3. Asignar permisos seguros a la clave
sudo chmod 600 /etc/ssl/cloudflare-origin.key
```

#### 3. Configurar en el Instalador:
Al ejecutar `sudo bash deploy/install.sh`, selecciona:
* **Opción 3:** `Cloudflare Origin Certificate`
* **Puerto:** `443` (o `8443`).
* El script vinculará automáticamente `/etc/ssl/cloudflare-origin.crt` y `/etc/ssl/cloudflare-origin.key` en Nginx.

#### 4. Activar Full (Strict) en Cloudflare:
* En Cloudflare, ve a **SSL/TLS** > **Overview**.
* Cambia el modo a: **Full (strict)**.

---

## 🛠️ 4. Reglas Críticas de Cloudflare para Facturación Electrónica

Para garantizar que Cloudflare no interfiera con las emisiones a SUNAT ni bloquee la subida de certificados digitales `.pfx`:

### A. Desactivar Caché en Rutas Dinámicas (Cache Rule)
SUNAT requiere que las respuestas no provengan de un caché antiguo.
1. En Cloudflare, ve a **Caching** > **Cache Rules** > **Create rule**.
2. **Rule name:** `Bypass Facturador API`
3. **When incoming requests match:**
   * Field: `URI Path` | Operator: `starts with` | Value: `/api/`
   * O agrega: `URI Path` | `starts with` | Value: `/receipt/`
4. **Cache eligibility:** Selecciona **Bypass cache**.
5. Haz clic en **Deploy**.

---

### B. Tamaño Máximo de Subida (Para Certificados PFX)
1. En Cloudflare, ve a **Network**.
2. Verifica que **Maximum Upload Size** esté en `100 MB` (valor predeterminado gratuito). Esto asegura que la subida de certificados `.pfx` nunca arroje un error HTTP 413.

---

### C. Habilitar WebSockets
1. En **Network**, verifica que **WebSockets** esté activado (`ON`). Permite actualizaciones en tiempo real y comunicación fluida con bots.

---

## 📋 Resumen de Puertos y URLs de Acceso

| Si configuraste Nginx en | Modo Cloudflare | Tu URL en el Navegador será |
|---|---|---|
| **Puerto 443** | Full o Full (Strict) | `https://facturador.tudominio.com` |
| **Puerto 80** | Flexible | `https://facturador.tudominio.com` *(Cloudflare convierte el tráfico a HTTPS)* |
| **Puerto 8443** | Full o Full (Strict) | `https://facturador.tudominio.com:8443` |
| **Puerto 8080** | Flexible | `https://facturador.tudominio.com:8080` |
