require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const { startBot, stopBot } = require('./bot/telegram-bot');
const { extractKeysFromPfx, signXml } = require('./services/xml-signer');
const { generateInvoiceXml, generateCreditNoteXml } = require('./services/ubl-generator');
const { compressXml, sendBillToSunat } = require('./services/sunat-client');
const { generateInvoiceHtml } = require('./services/pdf-template');
const { consultarRuc, consultarDni } = require('./services/padron-service');
const { storeInvoiceFiles } = require('./services/storage-service');
const AdmZip = require('adm-zip');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const superadminRoutes = require('./routes/superadmin');
const { authenticateToken, resolveActiveCompany } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(cors());
// Set limits for Base64 certificate upload
app.use(express.json({ limit: '10mb' }));

// Mount Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/superadmin', superadminRoutes);

// Public branding endpoint for login & white-label customization
app.get('/api/public/branding', async (req, res) => {
  try {
    const platform = await prisma.platformConfig.findFirst();
    res.json({
      platformName: platform?.platformName || 'APISUNAT PRO',
      platformSubtitle: platform?.platformSubtitle || 'Plataforma SaaS Multitenant de Facturación Electrónica SUNAT',
      logoUrl: platform?.logoUrl || '',
      primaryColor: platform?.primaryColor || '#2563eb',
      allowRegistration: platform?.allowRegistration ?? true,
      telegramBotEnabled: platform?.telegramBotEnabled ?? true,
      supportEmail: platform?.supportEmail || '',
      supportPhone: platform?.supportPhone || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to determine the next invoice ID (scoped to company if provided)
async function getNextInvoiceId(tipoDoc, serieCustom, companyId) {
  let prefix = tipoDoc === '01' ? 'F001' : (tipoDoc === '03' ? 'B001' : 'FC01');
  if (serieCustom) {
    prefix = serieCustom;
  }
  const where = { tipoDoc, id: { startsWith: prefix } };
  if (companyId) {
    where.companyId = companyId;
  }
  const latestInvoice = await prisma.invoice.findFirst({
    where,
    orderBy: { createdAt: 'desc' }
  });

  if (!latestInvoice) {
    return `${prefix}-00000001`;
  }

  const parts = latestInvoice.id.split('-');
  const correlativo = parseInt(parts[1], 10);
  const nextCorrelativo = (correlativo + 1).toString().padStart(8, '0');
  return `${prefix}-${nextCorrelativo}`;
}

// ------------------- API ROUTES -------------------

// 1. GET Current System Configuration
app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.config.findFirst();
    if (!config) {
      return res.json({ configured: false });
    }
    res.json({
      configured: true,
      ruc: config.ruc,
      razonSocial: config.razonSocial,
      nombreComercial: config.nombreComercial || '',
      direccion: config.direccion,
      usuarioSol: config.usuarioSol,
      telegramToken: config.telegramToken || '',
      isProduction: config.isProduction,
      hasCert: !!config.pfxCert
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la configuración: ' + error.message });
  }
});

// 2. POST Save/Update System Configuration
app.post('/api/config', async (req, res) => {
  try {
    const {
      ruc,
      razonSocial,
      nombreComercial,
      direccion,
      usuarioSol,
      claveSol,
      pfxCertBase64, // Base64 string of certificate
      pfxPassword,
      telegramToken,
      isProduction
    } = req.body;

    const existingConfig = await prisma.config.findFirst();

    // Prepare DB operations object
    const configData = {
      ruc,
      razonSocial,
      nombreComercial,
      direccion,
      usuarioSol,
      isProduction: !!isProduction
    };

    if (claveSol) configData.claveSol = claveSol;
    if (pfxPassword) configData.pfxPassword = pfxPassword;
    if (telegramToken) configData.telegramToken = telegramToken;
    if (pfxCertBase64) {
      configData.pfxCert = Buffer.from(pfxCertBase64, 'base64');
    }

    let updatedConfig;
    if (existingConfig) {
      updatedConfig = await prisma.config.update({
        where: { id: existingConfig.id },
        data: configData
      });
    } else {
      updatedConfig = await prisma.config.create({
        data: configData
      });
    }

    // Handle Telegram Bot dynamic initialization/restart
    if (updatedConfig.telegramToken) {
      if (!existingConfig || existingConfig.telegramToken !== updatedConfig.telegramToken) {
        console.log('Detectado cambio de Token de Telegram. Reiniciando bot...');
        stopBot();
        startBot(updatedConfig.telegramToken, APP_URL);
      }
    } else {
      stopBot();
    }

    res.json({ success: true, message: 'Configuración guardada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar la configuración: ' + error.message });
  }
});

// 3. POST Test Credentials and Certificate Decryption
app.post('/api/config/test', async (req, res) => {
  try {
    const { ruc, usuarioSol, claveSol, pfxCertBase64, pfxPassword, isProduction } = req.body;
    
    let certBuffer = null;
    let certPass = pfxPassword;

    // Retrieve from DB if not uploaded during test
    if (pfxCertBase64) {
      certBuffer = Buffer.from(pfxCertBase64, 'base64');
    } else {
      const config = await prisma.config.findFirst();
      if (config) {
        certBuffer = config.pfxCert;
        if (!certPass) certPass = config.pfxPassword;
      }
    }

    if (!certBuffer) {
      return res.status(400).json({ error: 'Se requiere cargar un certificado digital (.pfx) para la prueba.' });
    }

    // Step A: Test certificate decryption
    const keys = extractKeysFromPfx(certBuffer, certPass);

    // Step B: Test soap connection with SUNAT
    // We send a dummy zip containing a random name to force a validation check.
    // If it returns "El usuario y/o clave SOL son incorrectos" (code 0102) we know authentication failed.
    // If it returns anything else (like file format error, invalid filename, etc.) we know login succeeded!
    try {
      const dummyZip = compressXml('test-file', '<test></test>');
      await sendBillToSunat({
        ruc,
        usuarioSol,
        claveSol,
        fileName: `${ruc}-01-F001-00000000`,
        xmlZipBuffer: dummyZip,
        isProduction: !!isProduction
      });
    } catch (soapError) {
      const errMsg = soapError.message;
      if (errMsg.includes('incorrectos') || errMsg.includes('0102')) {
        return res.status(401).json({ error: 'Credenciales SOL incorrectas: ' + errMsg });
      }
      // If the error is about invalid format or files, it means we logged in successfully!
      console.log('SUNAT SOAP Login OK (Handled exception):', errMsg);
    }

    res.json({
      success: true,
      message: 'Prueba exitosa: El certificado es válido y las credenciales SOL se conectaron correctamente a SUNAT.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. GET Document List (Multi-tenant scoped)
app.get('/api/documents', async (req, res) => {
  try {
    const companyId = req.query.companyId || req.headers['x-company-id'];
    const where = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    // Do not send heavy buffers to client list
    const clientList = invoices.map(inv => ({
      id: inv.id,
      companyId: inv.companyId,
      tipoDoc: inv.tipoDoc,
      serie: inv.serie,
      correlativo: inv.correlativo,
      clienteTipoDoc: inv.clienteTipoDoc,
      clienteDoc: inv.clienteDoc,
      clienteNombre: inv.clienteNombre,
      clienteDireccion: inv.clienteDireccion,
      montoGravado: inv.montoGravado,
      montoIgv: inv.montoIgv,
      montoTotal: inv.montoTotal,
      status: inv.status,
      sunatResponseCode: inv.sunatResponseCode,
      sunatMessage: inv.sunatMessage,
      hasXml: !!inv.xmlSigned,
      hasCdr: !!inv.cdrZip,
      createdAt: inv.createdAt
    }));

    res.json(clientList);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar los documentos: ' + error.message });
  }
});

// 4.1 GET Consulta de RUC o DNI para auto-completado
app.get('/api/consultar/:tipo/:numero', async (req, res) => {
  try {
    const { tipo, numero } = req.params;
    let data;
    if (tipo === '6' || tipo === 'ruc' || numero.length === 11) {
      data = await consultarRuc(numero);
    } else if (tipo === '1' || tipo === 'dni' || numero.length === 8) {
      data = await consultarDni(numero);
    } else {
      return res.status(400).json({ error: 'Tipo de documento no soportado. Usa RUC (6) o DNI (1).' });
    }
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4.2 GET Next Document Number for a Series (Multi-tenant scoped)
app.get('/api/documents/next-id/:tipoDoc/:serie?', async (req, res) => {
  try {
    const { tipoDoc, serie } = req.params;
    const companyId = req.query.companyId || req.headers['x-company-id'];
    const nextId = await getNextInvoiceId(tipoDoc, serie, companyId);
    res.json({ nextId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST Create/Emit Invoice Manually (Multi-tenant)
app.post('/api/documents', async (req, res) => {
  try {
    const { 
      tipoDoc = '01', 
      clienteTipoDoc, 
      clienteDoc, 
      clienteNombre, 
      clienteDireccion = '',
      serie,
      correlativo,
      fechaEmision,
      fechaVencimiento,
      tipoOperacion = '0101',
      moneda = 'PEN',
      formaPago = 'Contado',
      cuotas = [],
      cuotaMonto,
      cuotaFecha,
      observaciones = '',
      items = [],
      companyId,
      cliente
    } = req.body;

    // Robust extraction: support both nested (cliente.numDoc / cliente.rznSocial) and flat properties
    const finalClienteTipoDoc = String(clienteTipoDoc || cliente?.tipoDoc || (tipoDoc === '01' ? '6' : '1')).trim();
    const finalClienteDoc = String(clienteDoc || cliente?.numDoc || cliente?.nroDoc || '').trim();
    const finalClienteNombre = String(clienteNombre || cliente?.rznSocial || cliente?.nombre || '').trim();
    const finalClienteDireccion = String(clienteDireccion || cliente?.direccion || '').trim();

    if (!finalClienteDoc) {
      return res.status(400).json({ error: 'Debe ingresar el número de documento del cliente (RUC o DNI).' });
    }
    if (!finalClienteNombre) {
      return res.status(400).json({ error: 'Debe ingresar la razón social o nombre del cliente.' });
    }
    if (finalClienteTipoDoc === '6' && finalClienteDoc.length !== 11) {
      return res.status(400).json({ error: 'El RUC del cliente debe tener exactamente 11 dígitos numéricos.' });
    }
    if (finalClienteTipoDoc === '1' && finalClienteDoc.length !== 8) {
      return res.status(400).json({ error: 'El DNI del cliente debe tener exactamente 8 dígitos numéricos.' });
    }

    const targetCompanyId = companyId || req.headers['x-company-id'];
    let company = null;
    if (targetCompanyId) {
      company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst({ where: { isDefault: true } }) ||
                await prisma.company.findFirst();
    }

    let config = company;
    if (!config || !config.pfxCert) {
      const legacyConfig = await prisma.config.findFirst();
      if (legacyConfig && legacyConfig.pfxCert) {
        config = legacyConfig;
      } else {
        return res.status(400).json({ error: 'La empresa seleccionada no cuenta con Certificado Digital cargado.' });
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Debe ingresar al menos un ítem para emitir el comprobante.' });
    }

    let nextId;
    if (serie && correlativo) {
      nextId = `${serie}-${String(correlativo).padStart(8, '0')}`;
    } else {
      nextId = await getNextInvoiceId(tipoDoc, serie, company?.id);
    }

    const now = new Date();
    const fecha = fechaEmision || now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    // Format credit installments if Credit payment term is used
    let finalCuotas = Array.isArray(cuotas) ? [...cuotas] : [];
    if (formaPago === 'Credito' && finalCuotas.length === 0 && cuotaMonto) {
      finalCuotas = [{
        monto: parseFloat(cuotaMonto),
        fecha: cuotaFecha || fecha
      }];
    }

    const xmlData = {
      emisor: {
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        direccion: config.direccion
      },
      cliente: {
        tipoDoc: finalClienteTipoDoc,
        nroDoc: finalClienteDoc,
        nombre: finalClienteNombre,
        direccion: finalClienteDireccion
      },
      id: nextId,
      tipoDoc,
      fecha,
      hora,
      fechaVencimiento: fechaVencimiento || undefined,
      tipoOperacion,
      moneda,
      formaPago,
      cuotas: finalCuotas,
      observaciones,
      items
    };

    // 1. Generate XML
    const { xml, totalGravado, totalIgv, totalVenta } = generateInvoiceXml(xmlData);

    // 2. Sign XML
    const { privateKeyPem, certPem } = extractKeysFromPfx(config.pfxCert, config.pfxPassword);
    const { signedXml, digestValue } = signXml(xml, privateKeyPem, certPem);

    // 3. Compress ZIP
    const fileName = `${config.ruc}-${tipoDoc}-${nextId}`;
    const xmlZipBuffer = compressXml(fileName, signedXml);

    // 4. Send to SUNAT
    let result;
    try {
      result = await sendBillToSunat({
        ruc: config.ruc,
        usuarioSol: config.usuarioSol,
        claveSol: config.claveSol,
        fileName,
        xmlZipBuffer,
        isProduction: config.isProduction
      });
    } catch (sunatError) {
      result = {
        success: false,
        responseCode: 'ERROR',
        message: sunatError.message,
        observations: null,
        cdrZipBuffer: null
      };
    }

    // 5. Store invoice in database linked to company
    const savedInvoice = await prisma.invoice.create({
      data: {
        id: nextId,
        companyId: company ? company.id : null,
        tipoDoc,
        serie: nextId.split('-')[0],
        correlativo: nextId.split('-')[1],
        clienteTipoDoc: finalClienteTipoDoc,
        clienteDoc: finalClienteDoc,
        clienteNombre: finalClienteNombre,
        clienteDireccion: finalClienteDireccion,
        fechaEmision: fecha,
        fechaVencimiento: fechaVencimiento || null,
        tipoOperacion,
        moneda,
        formaPago,
        observaciones,
        montoGravado: totalGravado,
        montoIgv: totalIgv,
        montoTotal: totalVenta,
        itemsJson: JSON.stringify(items),
        xmlSigned: signedXml,
        xmlZip: xmlZipBuffer,
        cdrZip: result.cdrZipBuffer,
        status: result.success ? 'ACEPTADO' : 'RECHAZADO',
        sunatResponseCode: result.responseCode,
        sunatMessage: result.message,
        sunatObservations: digestValue
      }
    });

    // 6. Automatically archive all document assets to VPS/Local File Server
    try {
      const a4Html = generateInvoiceHtml(savedInvoice, config, 'a4');
      const ticketHtml = generateInvoiceHtml(savedInvoice, config, 'ticket');
      await storeInvoiceFiles({
        invoice: savedInvoice,
        config,
        xmlSigned: signedXml,
        xmlZipBuffer,
        cdrZipBuffer: result.cdrZipBuffer,
        htmlA4: a4Html,
        htmlTicket: ticketHtml
      });
    } catch (archiveErr) {
      console.warn('Advertencia al archivar en el File Server:', archiveErr.message);
    }

    res.json({
      success: result.success,
      id: nextId,
      invoice: savedInvoice
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al emitir comprobante: ' + error.message });
  }
});

// 5.1 POST Anular Comprobante mediante Nota de Crédito (Tipo 07)
app.post('/api/documents/:id/anular', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoCodigo = '01', motivoDescripcion = 'ANULACION DE LA OPERACION' } = req.body || {};

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (invoice.status === 'ANULADO') {
      return res.status(400).json({ error: 'Este comprobante ya se encuentra anulado.' });
    }

    let config = invoice.company;
    if (!config || !config.pfxCert) {
      config = await prisma.company.findFirst({ where: { isDefault: true } }) || 
               await prisma.config.findFirst();
    }

    if (!config || !config.pfxCert) {
      return res.status(400).json({ error: 'Configuración o certificado no disponible.' });
    }

    // Serie de la Nota de Crédito (FC01 para Factura, BC01 para Boleta)
    const isFactura = invoice.tipoDoc === '01';
    const ncSerie = isFactura ? 'FC01' : 'BC01';
    const ncId = await getNextInvoiceId('07', ncSerie, config.id);

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    const ncData = {
      emisor: {
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        direccion: config.direccion
      },
      cliente: {
        tipoDoc: invoice.clienteTipoDoc,
        nroDoc: invoice.clienteDoc,
        nombre: invoice.clienteNombre
      },
      id: ncId,
      fecha,
      hora,
      docModificado: {
        id: invoice.id,
        tipoDoc: invoice.tipoDoc
      },
      motivo: {
        codigo: motivoCodigo,
        descripcion: motivoDescripcion
      },
      items: JSON.parse(invoice.itemsJson || '[]')
    };

    // Generar XML de Nota de Crédito UBL 2.1
    const { xml, totalGravado, totalIgv, totalVenta } = generateCreditNoteXml(ncData);

    // Firmar XML con el certificado
    const { privateKeyPem, certPem } = extractKeysFromPfx(config.pfxCert, config.pfxPassword);
    const { signedXml, digestValue } = signXml(xml, privateKeyPem, certPem);

    // Comprimir en ZIP
    const fileName = `${config.ruc}-07-${ncId}`;
    const xmlZipBuffer = compressXml(fileName, signedXml);

    // Enviar a SUNAT
    let result;
    try {
      result = await sendBillToSunat({
        ruc: config.ruc,
        usuarioSol: config.usuarioSol,
        claveSol: config.claveSol,
        fileName,
        xmlZipBuffer,
        isProduction: config.isProduction
      });
    } catch (sunatErr) {
      result = {
        success: false,
        responseCode: 'ERROR',
        message: sunatErr.message,
        observations: null,
        cdrZipBuffer: null
      };
    }

    // Guardar Nota de Crédito en la base de datos
    const savedNC = await prisma.invoice.create({
      data: {
        id: ncId,
        tipoDoc: '07',
        clienteTipoDoc: invoice.clienteTipoDoc,
        clienteDoc: invoice.clienteDoc,
        clienteNombre: invoice.clienteNombre,
        montoGravado: totalGravado,
        montoIgv: totalIgv,
        montoTotal: totalVenta,
        itemsJson: invoice.itemsJson,
        xmlSigned: signedXml,
        xmlZip: xmlZipBuffer,
        cdrZip: result.cdrZipBuffer,
        status: result.success ? 'ACEPTADO' : 'RECHAZADO',
        sunatResponseCode: result.responseCode,
        sunatMessage: result.message,
        sunatObservations: digestValue
      }
    });

    // Si SUNAT aceptó la Nota de Crédito, marcar el comprobante original como ANULADO
    if (result.success) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'ANULADO',
          sunatMessage: `Anulado mediante Nota de Crédito ${ncId}`
        }
      });
    }

    res.json({
      success: result.success,
      ncId,
      notaCredito: savedNC,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al anular comprobante: ' + error.message });
  }
});

// 6. GET Render Printable Invoice HTML View (A4 o Ticket 80mm)
app.get('/receipt/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'a4';
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });
    if (!invoice) {
      return res.status(404).send('<h1>Comprobante no encontrado</h1>');
    }

    let config = invoice.company;
    if (!config) {
      config = await prisma.company.findFirst({ where: { isDefault: true } }) || 
               await prisma.config.findFirst();
    }
    if (!config) {
      return res.status(400).send('<h1>Configuración del emisor no encontrada</h1>');
    }

    const html = generateInvoiceHtml(invoice, config, format);
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Error al generar representación impresa</h1><p>' + error.message + '</p>');
  }
});

// 7. GET Download XML or CDR Zip
app.get('/api/documents/:id/download/:fileType', async (req, res) => {
  try {
    const { id, fileType } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    let config = invoice.company;
    if (!config) {
      config = await prisma.company.findFirst({ where: { isDefault: true } }) || 
               await prisma.config.findFirst();
    }
    if (!config) {
      return res.status(404).json({ error: 'Configuración de emisor no encontrada' });
    }

    const fileNameBase = `${config.ruc}-${invoice.tipoDoc}-${invoice.id}`;

    if (fileType === 'xml') {
      if (!invoice.xmlSigned) {
        return res.status(400).json({ error: 'El XML no fue guardado en este comprobante' });
      }
      res.setHeader('Content-Type', 'text/xml');
      res.setHeader('Content-Disposition', `attachment; filename=${fileNameBase}.xml`);
      return res.send(invoice.xmlSigned);
    } else if (fileType === 'cdr') {
      if (!invoice.cdrZip) {
        return res.status(400).json({ error: 'No existe constancia de recepción (CDR) para este comprobante' });
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=R-${fileNameBase}.zip`);
      return res.send(invoice.cdrZip);
    } else if (fileType === 'cdr-xml') {
      if (!invoice.cdrZip) {
        return res.status(400).json({ error: 'No existe constancia de recepción (CDR) para este comprobante' });
      }
      try {
        const zip = new AdmZip(invoice.cdrZip);
        const zipEntries = zip.getEntries();
        const xmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.xml'));
        if (!xmlEntry) {
          return res.status(404).json({ error: 'No se encontró XML dentro del archivo CDR' });
        }
        const xmlContent = zip.readAsText(xmlEntry);
        res.setHeader('Content-Type', 'text/xml');
        res.setHeader('Content-Disposition', `attachment; filename=R-${fileNameBase}.xml`);
        return res.send(xmlContent);
      } catch (err) {
        return res.status(500).json({ error: 'Error al descomprimir CDR: ' + err.message });
      }
    } else {
      res.status(400).json({ error: 'Tipo de archivo inválido. Use "xml", "cdr" o "cdr-xml"' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al descargar archivo: ' + error.message });
  }
});

// Serve static assets from React client build
const path = require('path');
app.use(express.static(path.join(__dirname, '../../client/dist')));

// SPA Wildcard Route to serve frontend index.html for undefined routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/receipt')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// ------------------- SERVER STARTUP -------------------

app.listen(PORT, async () => {
  console.log(`Server HTTP escuchando en ${APP_URL}`);
  
  // Auto-boot Telegram Bot if Token exists
  try {
    const config = await prisma.config.findFirst();
    if (config && config.telegramToken) {
      console.log('Cargando Bot de Telegram...');
      startBot(config.telegramToken, APP_URL);
    } else {
      console.log('Bot de Telegram no iniciado: Falta configurar Token en base de datos.');
    }
  } catch (dbError) {
    console.error('Error al verificar configuración para Bot de Telegram:', dbError.message);
  }
});
