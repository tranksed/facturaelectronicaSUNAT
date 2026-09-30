/**
 * Generates UBL 2.1 XML for an Invoice (Factura/Boleta) to SUNAT.
 */
function generateInvoiceXml(data) {
  const { 
    emisor, 
    cliente, 
    id, 
    tipoDoc, 
    fecha, 
    hora, 
    items,
    tipoOperacion = '0101',
    moneda = 'PEN',
    fechaVencimiento,
    formaPago = 'Contado',
    cuotas = [],
    observaciones
  } = data;

  // Process items and calculate totals
  let totalGravado = 0;
  let totalIgv = 0;
  let totalVenta = 0;

  const xmlItems = items.map((item, index) => {
    const qty = Number(item.cantidad) || 1;
    const priceWithTax = Number(item.precioUnitario) || 0;
    
    const priceWithoutTax = Number((priceWithTax / 1.18).toFixed(4));
    const lineValueWithoutTax = Number((priceWithoutTax * qty).toFixed(2));
    const lineIgv = Number((lineValueWithoutTax * 0.18).toFixed(2));
    const lineTotal = Number((lineValueWithoutTax + lineIgv).toFixed(2));

    totalGravado += lineValueWithoutTax;
    totalIgv += lineIgv;
    totalVenta += lineTotal;

    const lineId = index + 1;

    return `
  <cac:InvoiceLine>
    <cbc:ID>${lineId}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${qty.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${moneda}">${lineValueWithoutTax.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${moneda}">${priceWithTax.toFixed(4)}</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${moneda}">${lineIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${moneda}">${lineValueWithoutTax.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${moneda}">${lineIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.descripcion}]]></cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${moneda}">${priceWithoutTax.toFixed(4)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('');

  totalGravado = Number(totalGravado.toFixed(2));
  totalIgv = Number(totalIgv.toFixed(2));
  totalVenta = Number(totalVenta.toFixed(2));

  // Payment terms block (mandatory for Facturas according to RS 193-2020)
  let paymentTermsXml = '';
  if (formaPago === 'Credito') {
    const pendingAmount = totalVenta;
    paymentTermsXml = `
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Credito</cbc:PaymentMeansID>
    <cbc:Amount currencyID="${moneda}">${pendingAmount.toFixed(2)}</cbc:Amount>
  </cac:PaymentTerms>`;

    if (cuotas && cuotas.length > 0) {
      cuotas.forEach((cuota, idx) => {
        const cuotaNum = String(idx + 1).padStart(3, '0');
        paymentTermsXml += `
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Cuota${cuotaNum}</cbc:PaymentMeansID>
    <cbc:Amount currencyID="${moneda}">${Number(cuota.monto).toFixed(2)}</cbc:Amount>
    <cbc:PaymentDueDate>${cuota.fechaVencimiento || fechaVencimiento || fecha}</cbc:PaymentDueDate>
  </cac:PaymentTerms>`;
      });
    } else {
      paymentTermsXml += `
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Cuota001</cbc:PaymentMeansID>
    <cbc:Amount currencyID="${moneda}">${pendingAmount.toFixed(2)}</cbc:Amount>
    <cbc:PaymentDueDate>${fechaVencimiento || fecha}</cbc:PaymentDueDate>
  </cac:PaymentTerms>`;
    }
  } else {
    paymentTermsXml = `
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
  </cac:PaymentTerms>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- The ds:Signature element will be appended here by xml-signer.js -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${id}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  ${fechaVencimiento ? `<cbc:DueDate>${fechaVencimiento}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode listID="${tipoOperacion}">${tipoDoc}</cbc:InvoiceTypeCode>
  ${observaciones ? `<cbc:Note><![CDATA[${observaciones}]]></cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${moneda}</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${id}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${emisor.razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${emisor.direccion}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cliente.tipoDoc}">${cliente.nroDoc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${cliente.nombre}]]></cbc:RegistrationName>
        ${cliente.direccion ? `<cac:RegistrationAddress><cac:AddressLine><cbc:Line><![CDATA[${cliente.direccion}]]></cbc:Line></cac:AddressLine></cac:RegistrationAddress>` : ''}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${paymentTermsXml}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${moneda}">${totalIgv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${moneda}">${totalGravado.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${moneda}">${totalIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${moneda}">${totalGravado.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${moneda}">${totalGravado.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${moneda}">${totalVenta.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${moneda}">${totalVenta.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${xmlItems}
</Invoice>`;

  return {
    xml,
    totalGravado,
    totalIgv,
    totalVenta
  };
}

/**
 * Generates UBL 2.1 XML for a Nota de Crédito (Tipo 07) to SUNAT.
 */
function generateCreditNoteXml(data) {
  const { emisor, cliente, id, fecha, hora, docModificado, motivo, items } = data;

  let totalGravado = 0;
  let totalIgv = 0;
  let totalVenta = 0;

  const xmlItems = items.map((item, index) => {
    const qty = item.cantidad;
    const priceWithTax = item.precioUnitario;
    
    const priceWithoutTax = Number((priceWithTax / 1.18).toFixed(4));
    const lineValueWithoutTax = Number((priceWithoutTax * qty).toFixed(2));
    const lineIgv = Number((lineValueWithoutTax * 0.18).toFixed(2));
    const lineTotal = Number((lineValueWithoutTax + lineIgv).toFixed(2));

    totalGravado += lineValueWithoutTax;
    totalIgv += lineIgv;
    totalVenta += lineTotal;

    const lineId = index + 1;

    return `
  <cac:CreditNoteLine>
    <cbc:ID>${lineId}</cbc:ID>
    <cbc:CreditedQuantity unitCode="NIU">${qty.toFixed(2)}</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">${lineValueWithoutTax.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${priceWithTax.toFixed(4)}</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${lineIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${lineValueWithoutTax.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${lineIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.descripcion}]]></cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">${priceWithoutTax.toFixed(4)}</cbc:PriceAmount>
    </cac:Price>
  </cac:CreditNoteLine>`;
  }).join('');

  totalGravado = Number(totalGravado.toFixed(2));
  totalIgv = Number(totalIgv.toFixed(2));
  totalVenta = Number(totalVenta.toFixed(2));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- The ds:Signature element will be appended here by xml-signer.js -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${id}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${docModificado.id}</cbc:ReferenceID>
    <cbc:ResponseCode>${motivo.codigo || '01'}</cbc:ResponseCode>
    <cbc:Description><![CDATA[${motivo.descripcion || 'ANULACION DE LA OPERACION'}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${docModificado.id}</cbc:ID>
      <cbc:DocumentTypeCode>${docModificado.tipoDoc}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:Signature>
    <cbc:ID>${id}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${emisor.razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${emisor.direccion}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cliente.tipoDoc}">${cliente.nroDoc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${cliente.nombre}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${totalIgv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${totalGravado.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${totalIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${totalGravado.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="PEN">${totalGravado.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${totalVenta.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${totalVenta.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${xmlItems}
</CreditNote>`;

  return {
    xml,
    totalGravado,
    totalIgv,
    totalVenta
  };
}

module.exports = {
  generateInvoiceXml,
  generateCreditNoteXml
};
