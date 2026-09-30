/**
 * Utility to convert numbers to Spanish word representation (up to millions)
 */
function numeroALetras(num) {
  const cents = Math.round((num - Math.floor(num)) * 100);
  const entero = Math.floor(num);

  const unidades = ['CON', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenasDec = ['VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertirGrupo(n) {
    let result = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        result += 'CIEN';
      } else {
        result += centenas[c - 1] + ' ';
      }
    }

    if (d > 0) {
      if (d === 1) {
        result += decenas[u] + ' ';
        return result.trim();
      } else if (d === 2 && u === 0) {
        result += 'VEINTE ';
      } else if (d === 2) {
        result += 'VEINTI' + unidades[u] + ' ';
        return result.trim();
      } else {
        result += decenasDec[d - 2] + ' ';
      }
    }

    if (u > 0 && d !== 1 && d !== 2) {
      if (d > 0) {
        result += 'Y ' + unidades[u] + ' ';
      } else {
        result += unidades[u] + ' ';
      }
    }

    return result.trim();
  }

  if (entero === 0) {
    return `SON CERO Y ${cents.toString().padStart(2, '0')}/100 SOLES`;
  }

  let resultWords = '';
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    if (millones === 1) {
      resultWords += 'UN MILLON ';
    } else {
      resultWords += convertirGrupo(millones) + ' MILLONES ';
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      resultWords += 'UN MIL ';
    } else {
      resultWords += convertirGrupo(miles) + ' MIL ';
    }
  }

  if (resto > 0) {
    resultWords += convertirGrupo(resto) + ' ';
  }

  const centsFormatted = cents.toString().padStart(2, '0');
  return `SON ${resultWords.trim()} Y ${centsFormatted}/100 SOLES`;
}

/**
 * Generates beautiful HTML string of the invoice print representation (A4 or Ticket 80mm).
 * @param {Object} invoice - Invoice record
 * @param {Object} config - Company config
 * @param {string} format - "a4" | "ticket" | "ticket80mm"
 */
function generateInvoiceHtml(invoice, config, format = 'a4') {
  const isTicket = format.toLowerCase().includes('ticket');
  const items = JSON.parse(invoice.itemsJson || '[]');
  
  const fechaFormatted = new Date(invoice.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let docTypeName = 'FACTURA ELECTRÓNICA';
  if (invoice.tipoDoc === '03') docTypeName = 'BOLETA DE VENTA ELECTRÓNICA';
  if (invoice.tipoDoc === '07') docTypeName = 'NOTA DE CRÉDITO ELECTRÓNICA';
  if (invoice.tipoDoc === '08') docTypeName = 'NOTA DE DÉBITO ELECTRÓNICA';

  const clientDocName = invoice.clienteTipoDoc === '6' ? 'RUC' : 'DNI';
  const totalInWords = numeroALetras(invoice.montoTotal);

  // QR Code string content adhering to SUNAT RS 000193-2020:
  // RucEmisor|TipoDoc|Serie|Correlativo|Igv|Total|Fecha|TipoDocCliente|NroDocCliente|Hash|
  const parts = invoice.id.split('-');
  const serie = parts[0] || 'F001';
  const correlativo = parts[1] || '00000001';
  const fechaDate = new Date(invoice.createdAt).toISOString().split('T')[0];
  const hashVal = invoice.sunatObservations || '';

  const qrDataString = `${config.ruc}|${invoice.tipoDoc}|${serie}|${correlativo}|${invoice.montoIgv.toFixed(2)}|${invoice.montoTotal.toFixed(2)}|${fechaDate}|${invoice.clienteTipoDoc}|${invoice.clienteDoc}|${hashVal}|`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrDataString)}`;

  // Extract custom bank accounts
  let bankAccounts = [];
  try {
    if (typeof config.bankAccountsJson === 'string') {
      bankAccounts = JSON.parse(config.bankAccountsJson || '[]');
    } else if (Array.isArray(config.bankAccounts)) {
      bankAccounts = config.bankAccounts;
    }
  } catch (e) {
    bankAccounts = [];
  }

  const bankAccountsTicketHtml = bankAccounts.length > 0 ? `
    <div class="divider"></div>
    <div style="font-size: 10px; margin-bottom: 4px;" class="bold text-center">CUENTAS BANCARIAS:</div>
    ${bankAccounts.map(b => `
      <div style="font-size: 10px; margin-bottom: 2px;">
        <strong>${b.bank || b.banco} (${b.currency || b.moneda || 'PEN'}):</strong> ${b.account || b.cuenta}<br/>
        ${b.cci ? `<span style="color:#555;">CCI: ${b.cci}</span><br/>` : ''}
      </div>
    `).join('')}
  ` : '';

  const bankAccountsA4Html = bankAccounts.length > 0 ? `
    <div style="margin-top: 18px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 8px; text-transform: uppercase;">Cuentas Bancarias Autorizadas:</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="color: #64748b; border-bottom: 1px solid #cbd5e1; text-align: left;">
            <th style="padding: 4px 8px;">Banco</th>
            <th style="padding: 4px 8px;">Moneda</th>
            <th style="padding: 4px 8px;">N° de Cuenta</th>
            <th style="padding: 4px 8px;">CCI (Interbancario)</th>
          </tr>
        </thead>
        <tbody>
          ${bankAccounts.map(b => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 8px; font-weight: bold; color: #1e293b;">${b.bank || b.banco}</td>
              <td style="padding: 6px 8px;">${b.currency || b.moneda || 'PEN'}</td>
              <td style="padding: 6px 8px; font-family: monospace;">${b.account || b.cuenta}</td>
              <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${b.cci || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  if (isTicket) {
    // ---------------- TICKET 80mm (POS Thermal Printer Format) ----------------
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTypeName} - ${invoice.id} (Ticket)</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm;
    }
    body {
      font-family: 'Courier New', Courier, monospace, Arial, sans-serif;
      font-size: 12px;
      color: #000;
      margin: 0;
      padding: 10px;
      background: #f0f2f5;
    }
    .ticket-container {
      max-width: 76mm;
      margin: 0 auto;
      background: #fff;
      padding: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .company-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .company-info {
      font-size: 10px;
      margin: 4px 0;
    }
    .doc-box {
      border: 1px solid #000;
      padding: 6px;
      margin: 8px 0;
      text-align: center;
    }
    .doc-box .ruc { font-size: 12px; font-weight: bold; }
    .doc-box .type { font-size: 11px; font-weight: bold; margin: 2px 0; }
    .doc-box .number { font-size: 13px; font-weight: bold; }
    .info-line {
      font-size: 11px;
      margin-bottom: 3px;
    }
    .table-ticket {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .table-ticket th {
      border-bottom: 1px dashed #000;
      padding: 4px 0;
    }
    .table-ticket td {
      padding: 4px 0;
      vertical-align: top;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .words-box {
      font-size: 10px;
      font-style: italic;
      margin: 6px 0;
    }
    .actions-bar {
      max-width: 76mm;
      margin: 0 auto 10px auto;
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .btn {
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      border: 1px solid #3182ce;
      background: #3182ce;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-secondary {
      background: #fff;
      color: #3182ce;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket-container { box-shadow: none; padding: 0; max-width: 100%; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Ticket</button>
    <a href="?format=a4" class="btn btn-secondary">📄 Ver en A4</a>
  </div>

  <div class="ticket-container">
    <div class="text-center">
      ${config.logoBase64 && config.mostrarLogoTicket !== false ? `
        <div style="margin-bottom: 6px;">
          <img src="${config.logoBase64}" alt="Logo" style="max-height: 48px; max-width: 140px; object-fit: contain;" />
        </div>
      ` : ''}
      <div class="company-title">${config.nombreComercial || config.razonSocial}</div>
      ${config.nombreComercial && config.razonSocial !== config.nombreComercial ? `<div class="bold" style="font-size:10px; color:#444;">${config.razonSocial}</div>` : ''}
      <div class="company-info">${config.direccion}</div>
      ${config.contacto ? `<div class="company-info" style="color: #444;">${config.contacto}</div>` : ''}
    </div>

    <div class="doc-box">
      <div class="ruc">R.U.C. ${config.ruc}</div>
      <div class="type">${docTypeName}</div>
      <div class="number">${invoice.id}</div>
    </div>

    <div class="info-line"><strong>Fecha:</strong> ${fechaFormatted}</div>
    <div class="info-line"><strong>Cliente:</strong> ${invoice.clienteNombre}</div>
    <div class="info-line"><strong>${clientDocName}:</strong> ${invoice.clienteDoc}</div>
    <div class="info-line"><strong>Moneda:</strong> SOLES (PEN)</div>
    <div class="info-line"><strong>Estado:</strong> ${invoice.status}</div>

    <div class="divider"></div>

    <table class="table-ticket">
      <thead>
        <tr>
          <th style="width: 15%; text-align: left;">Cant</th>
          <th style="width: 55%; text-align: left;">Descrip.</th>
          <th style="width: 30%; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td>${it.cantidad.toFixed(0)}</td>
            <td>${it.descripcion}</td>
            <td class="text-right">S/. ${(it.cantidad * it.precioUnitario).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="totals-line">
      <span>Op. Gravada:</span>
      <span>S/. ${invoice.montoGravado.toFixed(2)}</span>
    </div>
    <div class="totals-line">
      <span>I.G.V. (18%):</span>
      <span>S/. ${invoice.montoIgv.toFixed(2)}</span>
    </div>
    <div class="totals-line bold" style="font-size: 13px;">
      <span>TOTAL:</span>
      <span>S/. ${invoice.montoTotal.toFixed(2)}</span>
    </div>

    <div class="divider"></div>

    <div class="words-box">${totalInWords}</div>
    ${bankAccountsTicketHtml}
    ${config.piePagina ? `<div class="divider"></div><div style="font-size:10px; color:#444; text-align:center; font-style:italic;">${config.piePagina}</div>` : ''}

    <div class="text-center" style="margin-top: 10px;">
      <img src="${qrCodeUrl}" alt="QR SUNAT" style="width: 100px; height: 100px;" />
      <div style="font-size: 9px; color: #555; margin-top: 4px;">
        Representación impresa de ${docTypeName}<br/>
        Consulte su validez en www.sunat.gob.pe
      </div>
      ${hashVal ? `<div style="font-size: 8px; font-family: monospace; word-break: break-all; margin-top: 4px;">Hash: ${hashVal}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  // ---------------- STANDARD A4 FORMAT ----------------
  const itemRows = items.map((item, idx) => {
    const qty = item.cantidad;
    const priceWithTax = item.precioUnitario;
    const total = qty * priceWithTax;
    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${item.descripcion}</td>
        <td class="text-center">${qty.toFixed(2)}</td>
        <td class="text-right">S/. ${priceWithTax.toFixed(2)}</td>
        <td class="text-right">S/. ${total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTypeName} - ${invoice.id}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 20px;
      font-size: 14px;
      line-height: 1.5;
      background-color: #f5f7fb;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid #e1e8ed;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .company-details {
      width: 60%;
      vertical-align: top;
    }
    .company-name {
      font-size: 22px;
      font-weight: bold;
      color: #1a365d;
      margin-bottom: 5px;
    }
    .company-address {
      color: #718096;
      font-size: 13px;
      line-height: 1.4;
    }
    .ruc-box-cell {
      width: 40%;
      vertical-align: top;
    }
    .ruc-box {
      border: 2px solid #1a365d;
      border-radius: 8px;
      text-align: center;
      padding: 20px;
      background-color: #f7fafc;
    }
    .ruc-box h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      color: #2d3748;
      letter-spacing: 1px;
    }
    .ruc-box h1 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #1a365d;
    }
    .ruc-box h3 {
      margin: 0;
      font-size: 18px;
      color: #e53e3e;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-label {
      font-weight: bold;
      color: #4a5568;
      width: 25%;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background-color: #1a365d;
      color: #ffffff;
      text-align: left;
      padding: 12px 10px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .items-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals-table {
      width: 350px;
      float: right;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .totals-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-label {
      font-weight: bold;
      color: #4a5568;
    }
    .totals-value {
      font-weight: bold;
      color: #1a365d;
      font-size: 15px;
    }
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
    .words-box {
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 30px;
      font-style: italic;
      color: #4a5568;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      border-top: 2px solid #e2e8f0;
      padding-top: 20px;
    }
    .qr-cell {
      width: 25%;
      vertical-align: middle;
      padding-top: 20px;
    }
    .footer-text-cell {
      width: 75%;
      vertical-align: top;
      padding-left: 20px;
      padding-top: 20px;
      font-size: 12px;
      color: #718096;
    }
    .hash-code {
      font-family: monospace;
      background: #edf2f7;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 5px;
      font-size: 11px;
      color: #2d3748;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      margin-top: 10px;
    }
    .status-aceptado {
      background-color: #c6f6d5;
      color: #22543d;
    }
    .status-rechazado {
      background-color: #fed7d7;
      color: #742a2a;
    }
    .status-error {
      background-color: #feebc8;
      color: #7b341e;
    }
    .actions-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-print {
      background-color: #3182ce;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary {
      background-color: #edf2f7;
      color: #2d3748;
      border: 1px solid #cbd5e0;
    }
    @media print {
      body {
        background-color: #fff;
        padding: 0;
      }
      .invoice-card {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      .actions-bar {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <a href="?format=ticket" class="btn-print btn-secondary">🧾 Formato Ticket (80mm)</a>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir Formato A4</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td class="company-details">
          ${config.logoBase64 ? `
            <div style="margin-bottom: 10px;">
              <img src="${config.logoBase64}" alt="Logo" style="max-height: 65px; max-width: 220px; object-fit: contain;" />
            </div>
          ` : ''}
          <div class="company-name">${config.nombreComercial || config.razonSocial}</div>
          <div class="company-address">
            ${config.nombreComercial && config.razonSocial !== config.nombreComercial ? `<strong>${config.razonSocial}</strong><br>` : ''}
            ${config.direccion}<br>
            ${config.contacto ? `<span>${config.contacto}</span><br>` : ''}
            Lima, Perú
          </div>
        </td>
        <td class="ruc-box-cell">
          <div class="ruc-box">
            <h2>R.U.C. ${config.ruc}</h2>
            <h1>${docTypeName}</h1>
            <h3>${invoice.id}</h3>
          </div>
        </td>
      </tr>
    </table>

    <table class="info-table">
      <tr>
        <td class="info-label">Fecha de Emisión:</td>
        <td>${fechaFormatted}</td>
        <td class="info-label">Moneda:</td>
        <td>SOLES (PEN)</td>
      </tr>
      <tr>
        <td class="info-label">Señor(es):</td>
        <td colspan="3">${invoice.clienteNombre}</td>
      </tr>
      <tr>
        <td class="info-label">${clientDocName}:</td>
        <td colspan="3">${invoice.clienteDoc}</td>
      </tr>
      <tr>
        <td class="info-label">Estado SUNAT:</td>
        <td colspan="3">
          <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
          ${invoice.sunatMessage ? `<br><small style="color: #718096; margin-top:5px; display:inline-block">${invoice.sunatMessage}</small>` : ''}
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 8%">Item</th>
          <th style="width: 52%">Descripción</th>
          <th class="text-center" style="width: 12%">Cant.</th>
          <th class="text-right" style="width: 13%">P. Unit</th>
          <th class="text-right" style="width: 15%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="clearfix">
      <div class="words-box">
        ${totalInWords}
      </div>

      <table class="totals-table">
        <tr>
          <td class="totals-label">Op. Gravada:</td>
          <td class="text-right totals-value">S/. ${invoice.montoGravado.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="totals-label">I.G.V. (18%):</td>
          <td class="text-right totals-value">S/. ${invoice.montoIgv.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f7fafc;">
          <td class="totals-label" style="font-size: 16px;">Importe Total:</td>
          <td class="text-right totals-value" style="font-size: 18px; color: #1a365d;">S/. ${invoice.montoTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${bankAccountsA4Html}

    ${config.piePagina ? `
      <div style="margin-top: 15px; padding: 10px 14px; background: #fdf8f6; border-left: 3px solid #ea580c; font-size: 12px; color: #7c2d12; border-radius: 4px;">
        ${config.piePagina}
      </div>
    ` : ''}

    <table class="footer-table">
      <tr>
        <td class="qr-cell">
          <img src="${qrCodeUrl}" alt="Código QR SUNAT" style="display: block; width: 120px; height: 120px;">
        </td>
        <td class="footer-text-cell">
          Representación impresa de la ${docTypeName} autorizada por SUNAT.<br>
          Esta factura/boleta puede ser consultada en el portal de comprobantes utilizando la información de RUC y número de comprobante.<br>
          ${hashVal ? `Código Hash de la Firma: <br><span class="hash-code">${hashVal}</span>` : ''}
          ${invoice.sunatObservations && invoice.sunatObservations !== hashVal ? `<br><br><strong>Observaciones de SUNAT:</strong> ${invoice.sunatObservations}` : ''}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

module.exports = {
  generateInvoiceHtml
};
