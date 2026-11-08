const express = require('express');
const prisma = require('../db');
const { extractKeysFromPfx, signXml } = require('../services/xml-signer');
const { generateInvoiceXml, generateCreditNoteXml } = require('../services/ubl-generator');
const { compressXml, sendBillToSunat } = require('../services/sunat-client');
const { generateInvoiceHtml } = require('../services/pdf-template');
const { storeInvoiceFiles } = require('../services/storage-service');
const { checkTenantQuota, incrementTenantDocCount } = require('../services/quota-service');
const { consultarRuc, consultarDni } = require('../services/padron-service');

const router = express.Router();

/**
 * Middleware: Authenticate requests using API Key (sk_live_...)
 * Supports:
 * - Authorization: Bearer sk_live_...
 * - Authorization: ApiKey sk_live_...
 * - x-api-key: sk_live_...
 * - Query parameter: ?api_key=sk_live_... (for direct browser file downloads/previews)
 */
async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const headerKey = req.headers['x-api-key'];
    const queryKey = req.query.api_key;
    let rawKey = headerKey || queryKey;

    if (!rawKey && authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'ApiKey')) {
        rawKey = parts[1];
      } else {
        rawKey = authHeader;
      }
    }

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida: Proporcione su API Key en el header "Authorization: Bearer sk_live_..." o "x-api-key".'
      });
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: rawKey },
      include: {
        user: {
          include: { plan: true }
        }
      }
    });

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({
        success: false,
        error: 'API Key inválida, inactiva o revocada.'
      });
    }

    if (apiKey.user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'La cuenta asociada a esta API Key se encuentra suspendida o inactiva.'
      });
    }

    if (apiKey.user.role !== 'SUPERADMIN' && apiKey.user.plan && apiKey.user.plan.hasExternalApi === false) {
      return res.status(403).json({
        success: false,
        error: `Tu plan actual (${apiKey.user.plan.name || 'Básico'}) no incluye acceso a la API Externa REST. Por favor actualiza tu suscripción en el panel para habilitar integraciones externas.`
      });
    }

    // Update last used timestamp async
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    req.user = apiKey.user;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error de autenticación API: ' + error.message });
  }
}

router.use(authenticateApiKey);

/**
 * Helper to determine the next invoice/credit note ID scoped to company
 */
async function getNextInvoiceId(tipoDoc, serieCustom, companyId) {
  let prefix = tipoDoc === '01' ? 'F001' : (tipoDoc === '03' ? 'B001' : (tipoDoc === '07' ? 'FC01' : 'FD01'));
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

/**
 * Helper to resolve company for the API request (supports multi-company via headers, query or body)
 */
async function resolveCompanyForApi(req) {
  const companyId = req.headers['x-company-id'] || req.query.companyId || req.body?.companyId;
  const companyRuc = req.headers['x-company-ruc'] || req.query.ruc || req.body?.ruc || req.body?.companyRuc;

  if (companyRuc) {
    const byRuc = await prisma.company.findFirst({
      where: { userId: req.user.id, ruc: String(companyRuc).trim() }
    });
    if (byRuc) return byRuc;
  }

  if (companyId) {
    const byId = await prisma.company.findFirst({
      where: { userId: req.user.id, id: companyId }
    });
    if (byId) return byId;
  }

  // Fallback to default company or first company created by user
  return await prisma.company.findFirst({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });
}

/**
 * Internal worker to process and emit a single invoice or credit note
 */
async function processEmitInvoice(company, invoiceData) {
  const {
    tipoDoc = '01',
    serie,
    cliente,
    clienteTipoDoc,
    clienteDoc,
    clienteNombre,
    clienteDireccion = '',
    tipoOperacion = '0101',
    moneda = 'PEN',
    formaPago = 'Contado',
    observaciones = '',
    items = [],
    docModificado,
    motivo
  } = invoiceData;

  const finalClienteTipoDoc = String(clienteTipoDoc || cliente?.tipoDoc || (tipoDoc === '01' ? '6' : '1')).trim();
  const finalClienteDoc = String(clienteDoc || cliente?.numDoc || cliente?.nroDoc || '').trim();
  const finalClienteNombre = String(clienteNombre || cliente?.rznSocial || cliente?.nombre || '').trim();
  const finalClienteDireccion = String(clienteDireccion || cliente?.direccion || '').trim();

  // Validate customer data
  if (!finalClienteDoc) {
    throw new Error('Debe proporcionar el número de documento del cliente (cliente.numDoc o clienteDoc).');
  }
  if (!finalClienteNombre) {
    throw new Error('Debe proporcionar la razón social o nombre del cliente (cliente.rznSocial o clienteNombre).');
  }
  if (!items || items.length === 0) {
    throw new Error('Debe incluir al menos un ítem en la lista "items".');
  }

  if (!company.pfxCert) {
    throw new Error(`La empresa ${company.razonSocial} (RUC ${company.ruc}) no tiene Certificado Digital (.pfx) configurado.`);
  }

  const nextId = await getNextInvoiceId(tipoDoc, serie, company.id);
  const fecha = new Date().toISOString().split('T')[0];
  const hora = new Date().toTimeString().split(' ')[0];

  let rawXml;
  let totalGravado = 0;
  let totalIgv = 0;
  let totalVenta = 0;

  if (tipoDoc === '07') {
    // -------------------------------------------------------------
    // NOTA DE CRÉDITO (07)
    // -------------------------------------------------------------
    if (!docModificado || !docModificado.id) {
      throw new Error('Para emitir una Nota de Crédito debe especificar "docModificado" con { id, tipoDoc }.');
    }
    const ncRes = generateCreditNoteXml({
      emisor: {
        ruc: company.ruc,
        razonSocial: company.razonSocial,
        direccion: company.direccion || 'LIMA - PERU'
      },
      cliente: {
        tipoDoc: finalClienteTipoDoc,
        nroDoc: finalClienteDoc,
        nombre: finalClienteNombre
      },
      id: nextId,
      fecha,
      hora,
      docModificado: {
        id: docModificado.id,
        tipoDoc: docModificado.tipoDoc || '01'
      },
      motivo: {
        codigo: motivo?.codigo || '01',
        descripcion: motivo?.descripcion || 'ANULACION DE LA OPERACION'
      },
      items
    });
    rawXml = ncRes.xml;
    totalGravado = ncRes.totalGravado;
    totalIgv = ncRes.totalIgv;
    totalVenta = ncRes.totalVenta;
  } else {
    // -------------------------------------------------------------
    // FACTURA (01) O BOLETA (03)
    // -------------------------------------------------------------
    const invRes = generateInvoiceXml({
      emisor: {
        ruc: company.ruc,
        razonSocial: company.razonSocial,
        nombreComercial: company.nombreComercial || company.razonSocial,
        direccion: company.direccion || 'LIMA - PERU'
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
      tipoOperacion,
      moneda,
      formaPago,
      observaciones,
      items
    });
    rawXml = invRes.xml;
    totalGravado = invRes.totalGravado;
    totalIgv = invRes.totalIgv;
    totalVenta = invRes.totalVenta;
  }

  // Sign XML with digital certificate
  const { privateKeyPem, certificatePem } = extractKeysFromPfx(company.pfxCert, company.pfxPassword);
  const { signedXml, digestValue } = signXml(rawXml, privateKeyPem, certificatePem);

  // Compress XML into ZIP
  const fileName = `${company.ruc}-${tipoDoc}-${nextId}`;
  const xmlZipBuffer = compressXml(fileName, signedXml);

  // Transmit to SUNAT
  let result;
  try {
    result = await sendBillToSunat({
      ruc: company.ruc,
      usuarioSol: company.usuarioSol,
      claveSol: company.claveSol,
      fileName,
      xmlZipBuffer,
      isProduction: company.isProduction
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

  // Store in Database
  const savedInvoice = await prisma.invoice.create({
    data: {
      id: nextId,
      companyId: company.id,
      tipoDoc,
      serie: nextId.split('-')[0],
      correlativo: nextId.split('-')[1],
      clienteTipoDoc: finalClienteTipoDoc,
      clienteDoc: finalClienteDoc,
      clienteNombre: finalClienteNombre,
      clienteDireccion: finalClienteDireccion,
      fechaEmision: fecha,
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

  // If Credit Note was accepted, mark original document as ANULADO
  if (tipoDoc === '07' && result.success && docModificado?.id) {
    await prisma.invoice.updateMany({
      where: { id: docModificado.id, companyId: company.id },
      data: {
        status: 'ANULADO',
        sunatMessage: `Anulado mediante Nota de Crédito ${nextId}`
      }
    }).catch(() => {});
  }

  // Store PDF / Ticket files
  try {
    const a4Html = generateInvoiceHtml(savedInvoice, company, 'a4');
    const ticketHtml = generateInvoiceHtml(savedInvoice, company, 'ticket');
    await storeInvoiceFiles({
      invoice: savedInvoice,
      config: company,
      xmlSigned: signedXml,
      xmlZipBuffer,
      cdrZipBuffer: result.cdrZipBuffer,
      htmlA4: a4Html,
      htmlTicket: ticketHtml
    });
  } catch (e) {
    console.warn('Advertencia al archivar archivos del comprobante API:', e.message);
  }

  return {
    savedInvoice,
    result,
    nextId,
    digestValue,
    xmlZipBuffer
  };
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

/**
 * GET /api/v1/external/status
 * Verifies API Key, tenant status, remaining quota, and company info
 */
router.get('/status', async (req, res) => {
  try {
    const quota = await checkTenantQuota(req.user.id);
    const company = await resolveCompanyForApi(req);

    res.json({
      success: true,
      service: 'API PROVEEDOR FACTURACIÓN MULTIEMPRESA',
      version: 'v1.2',
      tenant: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      company: company ? {
        id: company.id,
        ruc: company.ruc,
        razonSocial: company.razonSocial,
        isProduction: company.isProduction,
        hasCert: !!company.pfxCert
      } : null,
      subscription: {
        planName: quota.plan?.name || 'Plan Gratuito',
        docLimit: quota.docLimit,
        docsIssuedCount: quota.docsIssuedCount,
        remainingDocs: quota.docLimit === -1 ? 'ILIMITADO' : Math.max(0, quota.docLimit - (quota.docsIssuedCount || 0)),
        isAllowed: quota.allowed
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/companies
 * Returns all active companies under the authenticated tenant (Multiempresa)
 */
router.get('/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        ruc: true,
        razonSocial: true,
        nombreComercial: true,
        direccion: true,
        telefono: true,
        email: true,
        isProduction: true,
        isDefault: true,
        pfxCert: true,
        createdAt: true
      },
      orderBy: [{ isDefault: 'desc' }, { razonSocial: 'asc' }]
    });

    res.json({
      success: true,
      total: companies.length,
      companies: companies.map(c => ({
        id: c.id,
        ruc: c.ruc,
        razonSocial: c.razonSocial,
        nombreComercial: c.nombreComercial || c.razonSocial,
        direccion: c.direccion,
        telefono: c.telefono,
        email: c.email,
        isProduction: c.isProduction,
        isDefault: c.isDefault,
        hasCertificate: !!c.pfxCert,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/consultas/ruc/:ruc
 * Query SUNAT padrón for company details (Razón Social, Dirección, Estado, Condición)
 */
router.get('/consultas/ruc/:ruc', async (req, res) => {
  try {
    const { ruc } = req.params;
    const data = await consultarRuc(ruc);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/consultas/dni/:dni
 * Query RENIEC padrón for customer full name
 */
router.get('/consultas/dni/:dni', async (req, res) => {
  try {
    const { dni } = req.params;
    const data = await consultarDni(dni);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/external/invoices
 * Emits a single Invoice (01), Boleta (03), or Credit Note (07)
 */
router.post('/invoices', async (req, res) => {
  try {
    // 1. Check subscription & document quota
    const quota = await checkTenantQuota(req.user.id);
    if (!quota.allowed) {
      return res.status(403).json({
        success: false,
        error: quota.error
      });
    }

    // 2. Resolve target company (Multiempresa)
    const company = await resolveCompanyForApi(req);
    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró ninguna empresa configurada para este usuario. Registre al menos una empresa con RUC y certificado en el panel.'
      });
    }

    // 3. Process and emit
    const { savedInvoice, result, nextId, digestValue, xmlZipBuffer } = await processEmitInvoice(company, req.body);

    // 4. Increment document quota
    await incrementTenantDocCount(req.user.id);

    const host = `${req.protocol}://${req.get('host')}`;

    const responsePayload = {
      success: result.success,
      id: nextId,
      tipoDoc: savedInvoice.tipoDoc,
      serie: savedInvoice.serie,
      correlativo: savedInvoice.correlativo,
      status: savedInvoice.status,
      sunatResponseCode: result.responseCode,
      sunatMessage: result.message,
      digestValue,
      company: {
        ruc: company.ruc,
        razonSocial: company.razonSocial
      },
      links: {
        pdfA4Url: `${host}/receipt/${nextId}?format=a4`,
        pdfTicketUrl: `${host}/receipt/${nextId}?format=ticket`,
        xmlUrl: `${host}/api/v1/external/invoices/${nextId}/xml`,
        cdrUrl: result.cdrZipBuffer ? `${host}/api/v1/external/invoices/${nextId}/cdr` : null
      }
    };

    // If client requested base64 payload (ideal for POS & Mobile Apps)
    if (req.body.includeBase64) {
      responsePayload.xmlBase64 = xmlZipBuffer.toString('base64');
      responsePayload.cdrBase64 = result.cdrZipBuffer ? result.cdrZipBuffer.toString('base64') : null;
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/external/invoices/batch
 * Emits a batch of invoices sequentially with quota checking
 */
router.post('/invoices/batch', async (req, res) => {
  try {
    const { invoices = [] } = req.body;

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe enviar un arreglo "invoices" con al menos un comprobante.'
      });
    }

    const company = await resolveCompanyForApi(req);
    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró empresa activa configurada.'
      });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < invoices.length; i++) {
      const invData = invoices[i];
      const quota = await checkTenantQuota(req.user.id);
      if (!quota.allowed) {
        results.push({
          index: i,
          success: false,
          error: quota.error
        });
        failedCount++;
        break; // Stop batch if quota exhausted
      }

      try {
        const { savedInvoice, result, nextId, digestValue } = await processEmitInvoice(company, invData);
        await incrementTenantDocCount(req.user.id);
        if (result.success) successfulCount++; else failedCount++;

        results.push({
          index: i,
          id: nextId,
          success: result.success,
          status: savedInvoice.status,
          sunatResponseCode: result.responseCode,
          sunatMessage: result.message,
          digestValue,
          links: {
            pdfA4Url: `${host}/receipt/${nextId}?format=a4`,
            pdfTicketUrl: `${host}/receipt/${nextId}?format=ticket`,
            xmlUrl: `${host}/api/v1/external/invoices/${nextId}/xml`,
            cdrUrl: result.cdrZipBuffer ? `${host}/api/v1/external/invoices/${nextId}/cdr` : null
          }
        });
      } catch (err) {
        failedCount++;
        results.push({
          index: i,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: successfulCount > 0,
      total: invoices.length,
      successful: successfulCount,
      failed: failedCount,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/invoices/:id
 * Retrieve details and file URLs for an invoice by ID
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await resolveCompanyForApi(req);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: company ? company.id : undefined
      },
      include: { company: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Comprobante no encontrado.' });
    }

    const host = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        tipoDoc: invoice.tipoDoc,
        serie: invoice.serie,
        correlativo: invoice.correlativo,
        clienteDoc: invoice.clienteDoc,
        clienteNombre: invoice.clienteNombre,
        clienteDireccion: invoice.clienteDireccion,
        montoGravado: invoice.montoGravado,
        montoIgv: invoice.montoIgv,
        montoTotal: invoice.montoTotal,
        moneda: invoice.moneda,
        status: invoice.status,
        sunatResponseCode: invoice.sunatResponseCode,
        sunatMessage: invoice.sunatMessage,
        createdAt: invoice.createdAt,
        company: {
          ruc: invoice.company?.ruc,
          razonSocial: invoice.company?.razonSocial
        },
        links: {
          pdfA4Url: `${host}/receipt/${invoice.id}?format=a4`,
          pdfTicketUrl: `${host}/receipt/${invoice.id}?format=ticket`,
          xmlUrl: `${host}/api/v1/external/invoices/${invoice.id}/xml`,
          cdrUrl: invoice.cdrZip ? `${host}/api/v1/external/invoices/${invoice.id}/cdr` : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/invoices/:id/pdf
 * Direct stream of printable invoice HTML (A4 or Ticket 80mm)
 */
router.get('/invoices/:id/pdf', async (req, res) => {
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

    const company = invoice.company || await resolveCompanyForApi(req);
    const html = generateInvoiceHtml(invoice, company, format);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Error al generar representación impresa</h1><p>' + error.message + '</p>');
  }
});

/**
 * GET /api/v1/external/invoices/:id/xml
 * Direct download of signed UBL 2.1 XML
 */
router.get('/invoices/:id/xml', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!invoice || !invoice.xmlSigned) {
      return res.status(404).json({ success: false, error: 'XML no disponible para este comprobante.' });
    }

    const ruc = invoice.company?.ruc || 'SUNAT';
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${ruc}-${invoice.tipoDoc}-${invoice.id}.xml`);
    res.send(invoice.xmlSigned);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/external/invoices/:id/cdr
 * Direct download of SUNAT CDR ZIP file
 */
router.get('/invoices/:id/cdr', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!invoice || !invoice.cdrZip) {
      return res.status(404).json({ success: false, error: 'Constancia de recepción (CDR) no disponible.' });
    }

    const ruc = invoice.company?.ruc || 'SUNAT';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=R-${ruc}-${invoice.tipoDoc}-${invoice.id}.zip`);
    res.send(invoice.cdrZip);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/external/invoices/:id/void
 * Issues a Nota de Crédito to annul an existing invoice
 */
router.post('/invoices/:id/void', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo = 'ANULACION DE LA OPERACION', codigoMotivo = '01' } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Comprobante no encontrado.' });
    }

    if (invoice.status === 'ANULADO') {
      return res.status(400).json({ success: false, error: 'El comprobante ya fue anulado previamente.' });
    }

    const company = invoice.company || await resolveCompanyForApi(req);
    if (!company) {
      return res.status(400).json({ success: false, error: 'Empresa no encontrada.' });
    }

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(invoice.itemsJson || '[]');
    } catch {
      parsedItems = [{ descripcion: 'Anulación de comprobante', cantidad: 1, precioUnitario: invoice.montoTotal }];
    }

    // Process Nota de Crédito emission
    const ncData = {
      tipoDoc: '07',
      clienteTipoDoc: invoice.clienteTipoDoc,
      clienteDoc: invoice.clienteDoc,
      clienteNombre: invoice.clienteNombre,
      clienteDireccion: invoice.clienteDireccion,
      docModificado: {
        id: invoice.id,
        tipoDoc: invoice.tipoDoc
      },
      motivo: {
        codigo: codigoMotivo,
        descripcion: motivo
      },
      items: parsedItems
    };

    const { savedInvoice: savedNC, result, nextId } = await processEmitInvoice(company, ncData);
    await incrementTenantDocCount(req.user.id);

    const host = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: result.success,
      message: result.message,
      notaCreditoId: nextId,
      originalInvoiceId: invoice.id,
      status: savedNC.status,
      sunatResponseCode: result.responseCode,
      links: {
        pdfA4Url: `${host}/receipt/${nextId}?format=a4`,
        pdfTicketUrl: `${host}/receipt/${nextId}?format=ticket`,
        xmlUrl: `${host}/api/v1/external/invoices/${nextId}/xml`,
        cdrUrl: result.cdrZipBuffer ? `${host}/api/v1/external/invoices/${nextId}/cdr` : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;