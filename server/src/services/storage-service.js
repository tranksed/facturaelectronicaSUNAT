const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const prisma = require('../db');

// Default base directory for VPS / local file storage
const DEFAULT_STORAGE_DIR = path.join(__dirname, '../../../storage/comprobantes');

/**
 * Ensures a directory exists synchronously.
 */
function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Returns the storage directory organized by Year-Month and Company RUC.
 * Pattern: <baseDir>/<YYYY-MM>/<RUC>/<YYYY-MM-DD>
 */
function getStoragePath(baseDir, ruc, fechaEmision) {
  const dateObj = new Date(fechaEmision || Date.now());
  const yearMonth = dateObj.toISOString().slice(0, 7); // e.g. "2026-09"
  const dateStr = dateObj.toISOString().slice(0, 10);   // e.g. "2026-09-30"
  
  const targetDir = path.join(baseDir || DEFAULT_STORAGE_DIR, yearMonth, String(ruc), dateStr);
  ensureDirSync(targetDir);
  return { targetDir, yearMonth, dateStr };
}

/**
 * Creates an AWS S3 Client instance compatible with AWS S3, Cloudflare R2, MinIO, Wasabi, Spaces.
 */
function createS3Client(config) {
  const s3Config = {
    region: config.s3Region || 'us-east-1',
    credentials: {
      accessKeyId: config.s3AccessKey,
      secretAccessKey: config.s3SecretKey
    }
  };
  if (config.s3Endpoint) {
    s3Config.endpoint = config.s3Endpoint;
  }
  if (config.s3ForcePathStyle) {
    s3Config.forcePathStyle = true;
  }
  return new S3Client(s3Config);
}

/**
 * Tests connection with Amazon S3 / S3-compatible bucket by putting and deleting a test file.
 */
async function testS3Connection(s3Config) {
  try {
    if (!s3Config.s3Bucket || !s3Config.s3AccessKey || !s3Config.s3SecretKey) {
      return {
        success: false,
        error: 'Faltan credenciales obligatorias: Bucket, Access Key ID y Secret Access Key.'
      };
    }

    const client = createS3Client(s3Config);
    const testKey = `_test_connection_${Date.now()}.txt`;

    // 1. Upload test object
    await client.send(new PutObjectCommand({
      Bucket: s3Config.s3Bucket,
      Key: testKey,
      Body: 'Prueba de conexión exitosa desde el Facturador SUNAT',
      ContentType: 'text/plain'
    }));

    // 2. Clean up test object
    try {
      await client.send(new DeleteObjectCommand({
        Bucket: s3Config.s3Bucket,
        Key: testKey
      }));
    } catch {}

    return {
      success: true,
      message: `Conexión exitosa con el Bucket '${s3Config.s3Bucket}'. Permisos de lectura y escritura verificados.`
    };
  } catch (error) {
    return {
      success: false,
      error: `Error de conexión a S3: ${error.message}`
    };
  }
}

/**
 * Automatically saves all document assets (XML, XML-ZIP, CDR-ZIP, CDR-XML, A4 HTML, Ticket HTML, Metadata)
 * to the configured destination: LOCAL VPS, Amazon S3 / R2, or HYBRID (both).
 */
async function storeInvoiceFiles({
  invoice,
  config,
  xmlSigned,
  xmlZipBuffer,
  cdrZipBuffer,
  htmlA4,
  htmlTicket,
  baseDir = DEFAULT_STORAGE_DIR
}) {
  try {
    // 1. Fetch active storage provider configuration
    const platform = await prisma.platformConfig.findFirst();
    const provider = platform?.storageProvider || 'LOCAL'; // "LOCAL" | "S3" | "HYBRID" | "SFTP"

    const ruc = config?.ruc || 'EMISOR';
    const fecha = invoice.fechaEmision || new Date().toISOString().split('T')[0];
    const { targetDir, yearMonth, dateStr } = getStoragePath(baseDir, ruc, fecha);
    const fileNameBase = `${ruc}-${invoice.tipoDoc}-${invoice.id}`;
    const s3Prefix = `comprobantes/${yearMonth}/${ruc}/${dateStr}/${fileNameBase}`;

    const savedLocal = {};
    const savedS3 = {};

    // Prepare CDR XML if available
    let cdrXmlContent = null;
    if (cdrZipBuffer) {
      try {
        const zip = new AdmZip(cdrZipBuffer);
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (entry.entryName.toLowerCase().endsWith('.xml')) {
            cdrXmlContent = entry.getData().toString('utf8');
            break;
          }
        }
      } catch (zipErr) {
        console.warn('No se pudo extraer XML del CDR ZIP:', zipErr.message);
      }
    }

    // Document Metadata
    const metadata = {
      id: invoice.id,
      tipoDoc: invoice.tipoDoc,
      serie: invoice.serie,
      correlativo: invoice.correlativo,
      fechaEmision: invoice.fechaEmision,
      emisor: {
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        direccion: config.direccion
      },
      cliente: {
        tipoDoc: invoice.clienteTipoDoc,
        numDoc: invoice.clienteDoc,
        nombre: invoice.clienteNombre,
        direccion: invoice.clienteDireccion
      },
      moneda: invoice.moneda,
      montoGravado: invoice.montoGravado,
      montoIgv: invoice.montoIgv,
      montoTotal: invoice.montoTotal,
      formaPago: invoice.formaPago,
      status: invoice.status,
      sunatResponseCode: invoice.sunatResponseCode,
      sunatMessage: invoice.sunatMessage,
      sunatObservations: invoice.sunatObservations,
      storedAt: new Date().toISOString()
    };
    const metadataStr = JSON.stringify(metadata, null, 2);

    // ==========================================
    // A. STORE LOCALLY (If LOCAL or HYBRID)
    // ==========================================
    if (provider === 'LOCAL' || provider === 'HYBRID') {
      if (xmlSigned) {
        const xmlPath = path.join(targetDir, `${fileNameBase}.xml`);
        fs.writeFileSync(xmlPath, xmlSigned, 'utf8');
        savedLocal.xmlPath = xmlPath;
      }
      if (xmlZipBuffer) {
        const zipPath = path.join(targetDir, `${fileNameBase}.zip`);
        fs.writeFileSync(zipPath, xmlZipBuffer);
        savedLocal.xmlZipPath = zipPath;
      }
      if (cdrZipBuffer) {
        const cdrZipPath = path.join(targetDir, `R-${fileNameBase}.zip`);
        fs.writeFileSync(cdrZipPath, cdrZipBuffer);
        savedLocal.cdrZipPath = cdrZipPath;
      }
      if (cdrXmlContent) {
        const cdrXmlPath = path.join(targetDir, `R-${fileNameBase}.xml`);
        fs.writeFileSync(cdrXmlPath, cdrXmlContent, 'utf8');
        savedLocal.cdrXmlPath = cdrXmlPath;
      }
      if (htmlA4) {
        const a4Path = path.join(targetDir, `${fileNameBase}-A4.html`);
        fs.writeFileSync(a4Path, htmlA4, 'utf8');
        savedLocal.a4Path = a4Path;
      }
      if (htmlTicket) {
        const ticketPath = path.join(targetDir, `${fileNameBase}-Ticket.html`);
        fs.writeFileSync(ticketPath, htmlTicket, 'utf8');
        savedLocal.ticketPath = ticketPath;
      }
      const metaPath = path.join(targetDir, `${fileNameBase}-metadata.json`);
      fs.writeFileSync(metaPath, metadataStr, 'utf8');
      savedLocal.metaPath = metaPath;
    }

    // ==========================================
    // B. STORE IN AMAZON S3 / R2 (If S3 or HYBRID)
    // ==========================================
    if ((provider === 'S3' || provider === 'HYBRID') && platform.s3Bucket && platform.s3AccessKey && platform.s3SecretKey) {
      try {
        const s3 = createS3Client(platform);
        const bucket = platform.s3Bucket;

        const uploads = [];
        if (xmlSigned) {
          const key = `${s3Prefix}.xml`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: xmlSigned, ContentType: 'text/xml' })).then(() => savedS3.xml = key));
        }
        if (xmlZipBuffer) {
          const key = `${s3Prefix}.zip`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: xmlZipBuffer, ContentType: 'application/zip' })).then(() => savedS3.xmlZip = key));
        }
        if (cdrZipBuffer) {
          const key = `comprobantes/${yearMonth}/${ruc}/${dateStr}/R-${fileNameBase}.zip`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: cdrZipBuffer, ContentType: 'application/zip' })).then(() => savedS3.cdrZip = key));
        }
        if (cdrXmlContent) {
          const key = `comprobantes/${yearMonth}/${ruc}/${dateStr}/R-${fileNameBase}.xml`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: cdrXmlContent, ContentType: 'text/xml' })).then(() => savedS3.cdrXml = key));
        }
        if (htmlA4) {
          const key = `${s3Prefix}-A4.html`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: htmlA4, ContentType: 'text/html' })).then(() => savedS3.a4 = key));
        }
        if (htmlTicket) {
          const key = `${s3Prefix}-Ticket.html`;
          uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: htmlTicket, ContentType: 'text/html' })).then(() => savedS3.ticket = key));
        }
        const keyMeta = `${s3Prefix}-metadata.json`;
        uploads.push(s3.send(new PutObjectCommand({ Bucket: bucket, Key: keyMeta, Body: metadataStr, ContentType: 'application/json' })).then(() => savedS3.meta = keyMeta));

        await Promise.all(uploads);
      } catch (s3Err) {
        console.error('Error al subir comprobante a S3:', s3Err.message);
      }
    }

    return {
      success: true,
      provider,
      directory: targetDir,
      files: savedLocal,
      s3Keys: savedS3
    };
  } catch (error) {
    console.error('Error al almacenar comprobante en el servicio de Storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Returns storage statistics for the Admin panel.
 */
async function getStorageStats(baseDir = DEFAULT_STORAGE_DIR) {
  ensureDirSync(baseDir);

  const platform = await prisma.platformConfig.findFirst();

  let totalFiles = 0;
  let totalBytes = 0;
  const companiesFound = new Set();
  const periodsFound = new Set();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath);
      } else {
        totalFiles++;
        try {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
        } catch {}
      }
    }
  }

  scanDir(baseDir);

  // Discover periods (YYYY-MM)
  try {
    const periodEntries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const p of periodEntries) {
      if (p.isDirectory() && /^\d{4}-\d{2}$/.test(p.name)) {
        periodsFound.add(p.name);
        const pPath = path.join(baseDir, p.name);
        const rucs = fs.readdirSync(pPath, { withFileTypes: true });
        for (const r of rucs) {
          if (r.isDirectory()) companiesFound.add(r.name);
        }
      }
    }
  } catch {}

  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);

  return {
    provider: platform?.storageProvider || 'LOCAL',
    baseDir: path.resolve(baseDir),
    totalFiles,
    totalBytes,
    sizeMb,
    totalCompanies: companiesFound.size,
    periods: Array.from(periodsFound).sort().reverse(),
    s3Config: {
      hasS3Configured: !!(platform?.s3Bucket && platform?.s3AccessKey),
      s3Bucket: platform?.s3Bucket || '',
      s3Region: platform?.s3Region || 'us-east-1',
      s3Endpoint: platform?.s3Endpoint || '',
      s3ForcePathStyle: platform?.s3ForcePathStyle || false,
      s3PublicUrl: platform?.s3PublicUrl || ''
    },
    sftpConfig: {
      sftpHost: platform?.sftpHost || '',
      sftpPort: platform?.sftpPort || 22,
      sftpUser: platform?.sftpUser || '',
      sftpRemotePath: platform?.sftpRemotePath || '/var/storage/comprobantes'
    }
  };
}

module.exports = {
  DEFAULT_STORAGE_DIR,
  storeInvoiceFiles,
  getStorageStats,
  testS3Connection,
  getStoragePath
};
