const express = require('express');
const prisma = require('../db');
const { extractKeysFromPfx, signXml } = require('../services/xml-signer');
const { generateInvoiceXml } = require('../services/ubl-generator');
const { compressXml, sendBillToSunat } = require('../services/sunat-client');
const { generateInvoiceHtml } = require('../services/pdf-template');
const { storeInvoiceFiles } = require('../services/storage-service');
const { checkTenantQuota, incrementTenantDocCount } = require('../services/quota-service');

const router = express.Router();

/**
 * Middleware: Authenticate requests using API Key (sk_live_...)
 */
async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const headerKey = req.headers['x-api-key'];
    let rawKey = headerKey;

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
        error: 'La cuenta asociada a esta API Key se encuentra suspendida.'
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
 * Helper to determine the next invoice ID scoped to company
 */
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

/**
 * Helper to resolve company for the API request
 */
async function resolveCompanyForApi(req) {
  const companyId = req.headers['x-company-id'] || req.query.companyId;
  const companyRuc = req.headers['x-company-ruc'] || req.query.ruc;

  if (companyRuc) {
    return await prisma.company.findFirst({
      where: { userId: req.user.id, ruc: companyRuc }
    });
  }

  if (companyId) {
    return await prisma.company.findFirst({
      where: { userId: req.user.id, id: companyId }
    });
  }

  // Fallback to default or first company of user
  return await prisma.company.findFirst({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });
}

/**
 * Internal worker to process and emit a single invoice
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
    items = []
  } = invoiceData;

  const finalClienteTipoDoc = String(clienteTipoDoc || cliente?.tipoDoc || (tipoDoc === '01' ? '6' : '1')).trim();
  const finalClienteDoc = String(clienteDoc || cliente?.numDoc || cliente?.nroDoc || '').trim();
  const finalClienteNombre = String(clienteNombre || cliente?.rznSocial || cliente?.nombre || '').trim();
  const finalClienteDireccion = String(clienteDireccion || cliente?.direccion || '').trim();

  if (!finalClienteDoc) {
    throw new Error('Debe proporcionar el número de documento del cliente (numDoc).');
  }
  if (!finalClienteNombre) {
    throw new Error('Debe proporcionar la razón social o nombre del cliente (rznSocial).');
  }
  if (!items || items.length === 0) {
    throw new Error('Debe incluir al menos un ítem en la factura o boleta.');
  }

  let totalVenta = 0;
  items.forEach(item => {
    const qty = parseFloat(item.cantidad) || 1;
    const price = parseFloat(item.precioUnitario) || 0;
    totalVenta += qty * price;
  });

  const totalGravado = Number((totalVenta / 1.18).toFixed(2));
  const totalIgv = Number((totalVenta - totalGravado).toFixed(2));
  const nextId = await getNextInvoiceId(tipoDoc, serie, company.id);
  const fecha = new Date().toISOString().split('T')[0];

  // 1. Generate UBL 2.1 XML
  const rawXml = generateInvoiceXml({
    company,
    invoiceData: {
      tipoDoc,
      serie: nextId.split('-')[0],
      correlativo: nextId.split('-')[1],
      fechaEmision: fecha,
      tipoOperacion,
      moneda,
      formaPago,
      observaciones,
      cliente: {
        tipoDoc: finalClienteTipoDoc,
        numDoc: finalClienteDoc,
        rznSocial: finalClienteNombre,
        direccion: finalClienteDireccion
      },
      totalGravado,
      totalIgv,
      totalVenta,
      items
    }
  });

  // 2. Sign XML with digital certificate
  if (!company.pfxCert) {
    throw new Error(`La empresa ${company.razonSocial} (RUC ${company.ruc}) no tiene Certificado Digital (.pfx) configurado.`);
  }

  const { privateKeyPem, certificatePem } = extractKeysFromPfx(company.pfxCert, company.pfxPassword);
  const { signedXml, digestValue } = signXml(rawXml, privateKeyPem, certificatePem);

  // 3. Compress XML into ZIP
  const fileName = `${company.ruc}-${tipoDoc}-${nextId}`;
  const xmlZipBuffer = compressXml(fileName, signedXml);

  // 4. Send to SUNAT
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

  // 5. Store invoice in database
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

  // 6. Archive to File Server / S3
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
    nextId
  };
}

/**
 * GET /api/v1/external/status
 * Verifies API Key and returns tenant status & remaining doc quota
 */
router.get('/status', async (req, res) => {
  try {
    const quota = await checkTenantQuota(req.user.id);
    const company = await resolveCompanyForApi(req);

    res.json({
      success: true,
      service: 'APISUNAT PRO External REST API',
      version: 'v1.0',
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
 * POST /api/v1/external/invoices
 * Emits a single Invoice (01) or Boleta (03) via external API
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

    // 2. Resolve target company
    const company = await resolveCompanyForApi(req);
    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró ninguna empresa activa configurada para este usuario.'
      });
    }

    // 3. Process and emit
    const { savedInvoice, result, nextId } = await processEmitInvoice(company, req.body);

    // 4. Increment document quota
    await incrementTenantDocCount(req.user.id);

    res.json({
      success: result.success,
      id: nextId,
      status: savedInvoice.status,
      sunatResponseCode: result.responseCode,
      sunatMessage: result.message,
      links: {
        xmlUrl: `/api/documents/${nextId}/xml`,
        cdrUrl: result.cdrZipBuffer ? `/api/documents/${nextId}/cdr` : null,
        pdfA4Url: `/api/documents/${nextId}/pdf/a4`,
        pdfTicketUrl: `/api/documents/${nextId}/pdf/ticket`
      }
    });
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

    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < invoices.length; i++) {
      const invData = invoices[i];
      // Check quota before each emission in the batch
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
        const { savedInvoice, result, nextId } = await processEmitInvoice(company, invData);
        await incrementTenantDocCount(req.user.id);
        if (result.success) successfulCount++; else failedCount++;

        results.push({
          index: i,
          id: nextId,
          success: result.success,
          status: savedInvoice.status,
          sunatResponseCode: result.responseCode,
          sunatMessage: result.message,
          links: {
            pdfA4Url: `/api/documents/${nextId}/pdf/a4`,
            pdfTicketUrl: `/api/documents/${nextId}/pdf/ticket`,
            xmlUrl: `/api/documents/${nextId}/xml`,
            cdrUrl: result.cdrZipBuffer ? `/api/documents/${nextId}/cdr` : null
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
 * Retrieve details and files for an invoice by ID
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await resolveCompanyForApi(req);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: company ? company.id : undefined
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Comprobante no encontrado.' });
    }

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        tipoDoc: invoice.tipoDoc,
        serie: invoice.serie,
        correlativo: invoice.correlativo,
        clienteDoc: invoice.clienteDoc,
        clienteNombre: invoice.clienteNombre,
        montoTotal: invoice.montoTotal,
        moneda: invoice.moneda,
        status: invoice.status,
        sunatResponseCode: invoice.sunatResponseCode,
        sunatMessage: invoice.sunatMessage,
        createdAt: invoice.createdAt,
        links: {
          xmlUrl: `/api/documents/${invoice.id}/xml`,
          cdrUrl: invoice.cdrZip ? `/api/documents/${invoice.id}/cdr` : null,
          pdfA4Url: `/api/documents/${invoice.id}/pdf/a4`,
          pdfTicketUrl: `/api/documents/${invoice.id}/pdf/ticket`
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
