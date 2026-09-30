const axios = require('axios');
const AdmZip = require('adm-zip');

// SUNAT SOAP web service URLs
const ENDPOINTS = {
  beta: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  production: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
};

/**
 * Compresses XML content into a ZIP buffer.
 * @param {string} filename - Filename inside the zip (without extension)
 * @param {string} xmlContent - Raw XML string
 * @returns {Buffer} ZIP buffer
 */
function compressXml(filename, xmlContent) {
  const zip = new AdmZip();
  zip.addFile(`${filename}.xml`, Buffer.from(xmlContent, 'utf-8'));
  return zip.toBuffer();
}

/**
 * Sends a zipped invoice to SUNAT.
 * @param {Object} params
 * @param {string} params.ruc - Company RUC
 * @param {string} params.usuarioSol - SOL username
 * @param {string} params.claveSol - SOL password
 * @param {string} params.fileName - Name of the ZIP file (RUC-tipo-serie-correlativo)
 * @param {Buffer} params.xmlZipBuffer - Zipped XML buffer
 * @param {boolean} params.isProduction - Whether to send to production or beta
 */
async function sendBillToSunat({ ruc, usuarioSol, claveSol, fileName, xmlZipBuffer, isProduction }) {
  const endpoint = isProduction ? ENDPOINTS.production : ENDPOINTS.beta;
  const base64Zip = xmlZipBuffer.toString('base64');

  // Build raw SOAP envelope with wsse:Security
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${ruc}${usuarioSol}</wsse:Username>
        <wsse:Password>${claveSol}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${fileName}.zip</fileName>
      <contentFile>${base64Zip}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const response = await axios.post(endpoint, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      timeout: 30000 // 30s timeout
    });

    const responseXml = response.data;

    // Search for SOAP Fault first
    if (responseXml.includes('<soapenv:Fault>') || responseXml.includes('<soap:Fault>')) {
      const faultCode = responseXml.match(/<faultcode>(.*?)<\/faultcode>/)?.[1] || '';
      const faultString = responseXml.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || 'Error en SOAP';
      throw new Error(`SUNAT SOAP Fault: ${faultString} [${faultCode}]`);
    }

    // Extract applicationResponse (CDR zip base64)
    const match = responseXml.match(/<applicationResponse>(.*?)<\/applicationResponse>/) || 
                  responseXml.match(/<applicationResponse[^>]*>(.*?)<\/applicationResponse>/);
                  
    if (!match) {
      throw new Error('SUNAT respondió correctamente pero no se encontró la Constancia de Recepción (CDR) en el XML.');
    }

    const cdrZipBuffer = Buffer.from(match[1], 'base64');
    
    // Parse the CDR XML from the ZIP
    const cdrZip = new AdmZip(cdrZipBuffer);
    const cdrEntries = cdrZip.getEntries();
    const xmlEntry = cdrEntries.find(entry => entry.entryName.endsWith('.xml'));

    if (!xmlEntry) {
      throw new Error('El archivo CDR ZIP recibido no contiene un XML válido.');
    }

    const cdrXml = xmlEntry.getData().toString('utf-8');

    // Extract response code and description from CDR
    const responseCode = cdrXml.match(/<(?:cbc:)?ResponseCode[^>]*>(.*?)<\/(?:cbc:)?ResponseCode>/)?.[1] || 
                         cdrXml.match(/<ResponseCode>(.*?)<\/ResponseCode>/)?.[1] || 'unknown';

    const description = cdrXml.match(/<(?:cbc:)?Description[^>]*>(.*?)<\/(?:cbc:)?Description>/)?.[1] || 
                        cdrXml.match(/<Description>(.*?)<\/Description>/)?.[1] || 'No description';

    // Check for observations (Notes)
    const noteMatches = [...cdrXml.matchAll(/<(?:cbc:)?Note[^>]*>(.*?)<\/(?:cbc:)?Note>/g)].map(m => m[1]);
    const observations = noteMatches.join('; ') || null;

    return {
      success: responseCode === '0',
      responseCode,
      message: description,
      observations,
      cdrZipBuffer
    };
  } catch (error) {
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      const faultString = errorData.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || error.message;
      const faultCode = errorData.match(/<faultcode>(.*?)<\/faultcode>/)?.[1] || '';
      throw new Error(`Error de SUNAT: ${faultString} [Código: ${faultCode}]`);
    }
    throw error;
  }
}

module.exports = {
  compressXml,
  sendBillToSunat
};
