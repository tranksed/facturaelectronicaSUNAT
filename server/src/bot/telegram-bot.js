const { Telegraf, session, Markup } = require('telegraf');
const prisma = require('../db');
const { generateInvoiceXml } = require('../services/ubl-generator');
const { extractKeysFromPfx, signXml } = require('../services/xml-signer');
const { compressXml, sendBillToSunat } = require('../services/sunat-client');
const { consultarRuc, consultarDni } = require('../services/padron-service');

let botInstance = null;

/**
 * Helper to determine the next invoice ID from the database.
 * Series: F001 for Facturas, B001 for Boletas.
 * @param {string} tipoDoc - "01" (Factura) or "03" (Boleta)
 */
async function getNextInvoiceId(tipoDoc) {
  const prefix = tipoDoc === '01' ? 'F001' : 'B001';
  
  // Find highest ID starting with the prefix
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      tipoDoc,
      id: {
        startsWith: prefix
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!latestInvoice) {
    return `${prefix}-00000001`;
  }

  // Extract number and increment
  const parts = latestInvoice.id.split('-');
  const correlativo = parseInt(parts[1], 10);
  const nextCorrelativo = (correlativo + 1).toString().padStart(8, '0');
  return `${prefix}-${nextCorrelativo}`;
}

/**
 * Initializes and starts the Telegram Bot.
 * @param {string} token - Telegram Bot Token
 * @param {string} appUrl - Base URL of the backend (for receipt links)
 */
function startBot(token, appUrl) {
  if (botInstance) {
    try {
      botInstance.stop('Restarting');
    } catch (e) {
      console.log('Error stopping existing bot:', e.message);
    }
  }

  const bot = new Telegraf(token);
  botInstance = bot;

  // Use standard in-memory session middleware
  bot.use(session());

  // Command handlers
  bot.start(async (ctx) => {
    ctx.session = {}; // Clear session
    const config = await prisma.config.findFirst();
    if (!config) {
      return ctx.reply('⚠️ El sistema no está configurado. Por favor, ingresa al Dashboard Web para registrar tus credenciales.');
    }
    
    ctx.reply(
      `👋 ¡Bienvenido al Bot de Facturación SUNAT!\n` +
      `Empresa: *${config.razonSocial}*\n` +
      `RUC: *${config.ruc}*\n\n` +
      `Puedes usar los siguientes comandos:\n` +
      `/emitir - Emitir una Factura o Boleta electrónica.\n` +
      `/config - Consultar el estado actual de la empresa.\n` +
      `/ayuda - Mostrar este mensaje de ayuda.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('ayuda', (ctx) => {
    ctx.reply(
      `📌 *Guía de Comandos:*\n` +
      `/emitir - Inicia el flujo paso a paso de emisión.\n` +
      `/config - Muestra tu RUC, Razón Social y entorno de SUNAT (Beta/Producción).\n` +
      `/cancelar - Cancela la emisión en curso.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('config', async (ctx) => {
    const config = await prisma.config.findFirst();
    if (!config) {
      return ctx.reply('⚠️ No hay configuración en la base de datos.');
    }
    ctx.reply(
      `🏢 *Configuración Actual:*\n` +
      `• *Razón Social:* ${config.razonSocial}\n` +
      `• *RUC:* ${config.ruc}\n` +
      `• *Dirección:* ${config.direccion}\n` +
      `• *Usuario SOL:* ${config.usuarioSol}\n` +
      `• *Entorno:* ${config.isProduction ? '🔴 Producción' : '🟢 Beta / Pruebas'}\n` +
      `• *Certificado:* ${config.pfxCert ? '✅ Cargado' : '❌ Falta cargar'}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('cancelar', (ctx) => {
    ctx.session = {};
    ctx.reply('❌ Proceso de emisión cancelado.');
  });

  // Flow triggering
  bot.command('emitir', async (ctx) => {
    const config = await prisma.config.findFirst();
    if (!config || !config.pfxCert) {
      return ctx.reply('⚠️ No puedes emitir comprobantes. Configura tu RUC, credenciales y certificado digital (.pfx) en el Dashboard Web primero.');
    }

    ctx.session = { step: 'SELECT_DOC_TYPE' };

    return ctx.reply(
      '📄 Seleccione el tipo de comprobante que desea emitir:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Factura (RUC)', 'tipo_01'),
          Markup.button.callback('Boleta (DNI/RUC)', 'tipo_03')
        ],
        [Markup.button.callback('❌ Cancelar', 'cancel_flow')]
      ])
    );
  });

  // Handle Button Callbacks
  bot.action('cancel_flow', (ctx) => {
    ctx.session = {};
    ctx.answerCbQuery('Flujo cancelado');
    ctx.editMessageText('❌ Proceso de emisión cancelado.');
  });

  bot.action(/tipo_(01|03)/, (ctx) => {
    const tipo = ctx.match[1];
    ctx.session.docType = tipo;
    ctx.session.step = 'INPUT_CUSTOMER_DOC';
    ctx.answerCbQuery();

    if (tipo === '01') {
      ctx.editMessageText('🧾 Has seleccionado: *FACTURA*.\nPor favor, ingresa el *RUC* del cliente (11 dígitos):', { parse_mode: 'Markdown' });
    } else {
      ctx.editMessageText('🧾 Has seleccionado: *BOLETA*.\nPor favor, ingresa el *DNI* (8 dígitos) o *RUC* (11 dígitos) del cliente:', { parse_mode: 'Markdown' });
    }
  });

  // Handle Text inputs
  bot.on('text', async (ctx) => {
    if (!ctx.session || !ctx.session.step) {
      return;
    }

    const text = ctx.message.text.trim();

    switch (ctx.session.step) {
      case 'INPUT_CUSTOMER_DOC': {
        const isDigits = /^\d+$/.test(text);
        if (!isDigits || (text.length !== 8 && text.length !== 11)) {
          return ctx.reply('⚠️ Documento inválido. Ingrese solo números (DNI: 8 dígitos, RUC: 11 dígitos):');
        }

        if (ctx.session.docType === '01' && text.length !== 11) {
          return ctx.reply('⚠️ Para una Factura, el documento del cliente debe ser un RUC de 11 dígitos. Ingrese nuevamente:');
        }

        ctx.session.customerDoc = text;
        ctx.session.customerTipoDoc = text.length === 11 ? '6' : '1';

        await ctx.reply('🔍 Consultando base de datos oficial de SUNAT/RENIEC...');

        try {
          let padronData;
          if (ctx.session.customerTipoDoc === '6') {
            padronData = await consultarRuc(text);
          } else {
            padronData = await consultarDni(text);
          }

          if (padronData && padronData.nombre) {
            ctx.session.customerName = padronData.nombre;
            ctx.session.customerDireccion = padronData.direccion || '';
            ctx.session.step = 'INPUT_ITEM_DESC';

            await ctx.reply(
              `✅ *Datos encontrados:*\n` +
              `• *Nombre / Razón Social:* ${padronData.nombre}\n` +
              (padronData.direccion ? `• *Dirección Fiscal:* ${padronData.direccion}\n` : '') +
              (padronData.condicion ? `• *Condición:* ${padronData.condicion} (${padronData.estado})\n` : '') +
              `\n📦 Ahora ingrese la *Descripción* del producto o servicio vendido:`,
              { parse_mode: 'Markdown' }
            );
            break;
          }
        } catch (lookupErr) {
          console.log('No se pudo autocompletar documento:', lookupErr.message);
        }

        // If not found, ask manually
        ctx.session.step = 'INPUT_CUSTOMER_NAME';
        ctx.reply(`Cliente Documento: ${text}\n\nIngresa el *Nombre o Razón Social* del cliente:`, { parse_mode: 'Markdown' });
        break;
      }

      case 'INPUT_CUSTOMER_NAME': {
        if (text.length < 3) {
          return ctx.reply('⚠️ El nombre es demasiado corto. Escriba el nombre del cliente:');
        }
        ctx.session.customerName = text;
        ctx.session.step = 'INPUT_ITEM_DESC';
        ctx.reply('📦 Ingrese la *Descripción* del producto o servicio vendido:', { parse_mode: 'Markdown' });
        break;
      }

      case 'INPUT_ITEM_DESC': {
        if (text.length < 3) {
          return ctx.reply('⚠️ Descripción demasiado corta. Ingrese una descripción válida:');
        }
        ctx.session.itemDesc = text;
        ctx.session.step = 'INPUT_ITEM_PRICE';
        ctx.reply('💰 Ingrese el *Precio Total de Venta* (incluyendo IGV 18%) en Soles. Ej: 45.00 o 120:');
        break;
      }

      case 'INPUT_ITEM_PRICE': {
        const price = parseFloat(text.replace(',', '.'));
        if (isNaN(price) || price <= 0) {
          return ctx.reply('⚠️ Precio inválido. Ingrese un valor numérico positivo mayor a 0:');
        }

        ctx.session.itemPrice = price;
        ctx.session.step = 'CONFIRM_ISSUANCE';

        // Calculate breakdown
        const total = price;
        const subtotal = Number((total / 1.18).toFixed(2));
        const igv = Number((total - subtotal).toFixed(2));

        ctx.session.totalVenta = total;
        ctx.session.totalGravado = subtotal;
        ctx.session.totalIgv = igv;

        const docName = ctx.session.docType === '01' ? 'Factura' : 'Boleta';

        ctx.reply(
          `📝 *Resumen del Comprobante:*\n\n` +
          `• *Tipo:* ${docName}\n` +
          `• *Cliente:* ${ctx.session.customerName} (${ctx.session.customerDoc})\n` +
          `• *Producto/Servicio:* 1 x ${ctx.session.itemDesc}\n` +
          `• *Valor Neto:* S/. ${subtotal.toFixed(2)}\n` +
          `• *I.G.V (18%):* S/. ${igv.toFixed(2)}\n` +
          `• *Total a Pagar:* *S/. ${total.toFixed(2)}*\n\n` +
          `¿Confirmas la emisión electrónica de este comprobante?`,
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Emitir Comprobante', 'confirm_emit')],
            [Markup.button.callback('❌ Cancelar', 'cancel_flow')]
          ], { parse_mode: 'Markdown' })
        );
        break;
      }

      default:
        break;
    }
  });

  bot.action('confirm_emit', async (ctx) => {
    if (!ctx.session || ctx.session.step !== 'CONFIRM_ISSUANCE') {
      return ctx.answerCbQuery('Sesión vencida.');
    }

    ctx.answerCbQuery();
    ctx.editMessageText('⏳ Procesando... Generando XML de Facturación...');

    try {
      const config = await prisma.config.findFirst();
      if (!config) throw new Error('No se encontró la configuración del emisor.');

      const nextId = await getNextInvoiceId(ctx.session.docType);
      const docName = ctx.session.docType === '01' ? 'Factura' : 'Boleta';

      // 1. Generate UBL XML
      const now = new Date();
      const fecha = now.toISOString().split('T')[0];
      const hora = now.toTimeString().split(' ')[0];

      const xmlData = {
        emisor: {
          ruc: config.ruc,
          razonSocial: config.razonSocial,
          direccion: config.direccion
        },
        cliente: {
          tipoDoc: ctx.session.customerTipoDoc,
          nroDoc: ctx.session.customerDoc,
          nombre: ctx.session.customerName,
          direccion: ctx.session.customerDireccion || ''
        },
        id: nextId,
        tipoDoc: ctx.session.docType,
        fecha,
        hora,
        items: [
          {
            descripcion: ctx.session.itemDesc,
            cantidad: 1,
            precioUnitario: ctx.session.totalVenta
          }
        ]
      };

      const { xml, totalGravado, totalIgv, totalVenta } = generateInvoiceXml(xmlData);

      // 2. Extract keys and Sign XML
      const { privateKeyPem, certPem } = extractKeysFromPfx(config.pfxCert, config.pfxPassword);
      const { signedXml, digestValue } = signXml(xml, privateKeyPem, certPem);

      // 3. Compress XML
      const fileName = `${config.ruc}-${ctx.session.docType}-${nextId}`;
      const xmlZipBuffer = compressXml(fileName, signedXml);

      ctx.editMessageText(`⏳ Comprobante ${nextId} firmado. Enviando a SUNAT (${config.isProduction ? 'Producción' : 'Beta'})...`);

      // 4. Send to SUNAT SOAP Web Service
      const result = await sendBillToSunat({
        ruc: config.ruc,
        usuarioSol: config.usuarioSol,
        claveSol: config.claveSol,
        fileName,
        xmlZipBuffer,
        isProduction: config.isProduction
      });

      // 5. Store invoice in SQLite database
      const savedInvoice = await prisma.invoice.create({
        data: {
          id: nextId,
          tipoDoc: ctx.session.docType,
          clienteTipoDoc: ctx.session.customerTipoDoc,
          clienteDoc: ctx.session.customerDoc,
          clienteNombre: ctx.session.customerName,
          montoGravado: totalGravado,
          montoIgv: totalIgv,
          montoTotal: totalVenta,
          itemsJson: JSON.stringify(xmlData.items),
          xmlSigned: signedXml,
          xmlZip: xmlZipBuffer,
          cdrZip: result.cdrZipBuffer,
          status: result.success ? 'ACEPTADO' : 'RECHAZADO',
          sunatResponseCode: result.responseCode,
          sunatMessage: result.message,
          sunatObservations: digestValue // Store signature hash inside observations field for print reference
        }
      });

      // 6. Respond to user with A4 and Ticket formats
      const receiptUrlA4 = `${appUrl}/receipt/${nextId}?format=a4`;
      const receiptUrlTicket = `${appUrl}/receipt/${nextId}?format=ticket`;
      
      let replyMsg = `🎉 *¡Comprobante ${nextId} Emitido con Éxito!*\n\n` +
        `• *Estado:* ${savedInvoice.status}\n` +
        `• *SUNAT Mensaje:* ${result.message}\n`;
      
      if (result.observations) {
        replyMsg += `• *Observaciones:* ${result.observations}\n`;
      }

      await ctx.editMessageText(replyMsg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.url('🧾 Ver Ticket (80mm)', receiptUrlTicket),
            Markup.button.url('📄 Ver Formato A4', receiptUrlA4)
          ]
        ])
      });

      // Send files (Signed XML and CDR Zip) to Telegram chat
      await ctx.replyWithDocument(
        { source: Buffer.from(signedXml, 'utf-8'), filename: `${fileName}.xml` },
        { caption: `📄 XML Firmado de la ${docName} ${nextId}` }
      );
      
      await ctx.replyWithDocument(
        { source: result.cdrZipBuffer, filename: `R-${fileName}.zip` },
        { caption: `✅ CDR (Constancia de Recepción) de SUNAT` }
      );

    } catch (error) {
      console.error('Error emitting invoice:', error);
      ctx.editMessageText(`❌ *Error al emitir el comprobante:*\n${error.message}`, { parse_mode: 'Markdown' });
    } finally {
      ctx.session = {}; // Reset session
    }
  });

  // Launch Bot in background
  bot.launch()
    .then(() => console.log('Telegram Bot successfully launched via long-polling.'))
    .catch(err => console.error('Failed to launch Telegram Bot:', err.message));

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

/**
 * Stops the Telegram Bot if running.
 */
function stopBot() {
  if (botInstance) {
    try {
      botInstance.stop('Manual Stop');
      botInstance = null;
      console.log('Telegram Bot manually stopped.');
    } catch (e) {
      console.log('Error stopping bot:', e.message);
    }
  }
}

module.exports = {
  startBot,
  stopBot
};
