import React, { useState, useEffect } from 'react';
import {
  IconCode,
  IconKey,
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconDownload,
  IconServer,
  IconAlertTriangle,
  IconZap,
  IconBuilding,
  IconFileText,
  IconSearch,
  IconExternalLink,
  LoaderCircleIcon
} from './Icons';

export default function ApiKeysPanel({ API_URL, authToken, currentUser }) {
  const [keys, setKeys] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('Punto de Venta (POS)');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [message, setMessage] = useState(null);

  // System selection: 'pos' | 'odoo' | 'app' | 'crm' | 'saas' | 'whmcs'
  const [activeSystemTab, setActiveSystemTab] = useState('pos');

  // Programming language selection: 'php' | 'js' | 'python' | 'csharp' | 'java' | 'curl'
  const [activeLangTab, setActiveLangTab] = useState('php');

  // Live API Sandbox / Tester state
  const [sandboxDocType, setSandboxDocType] = useState('01');
  const [sandboxCustomerDoc, setSandboxCustomerDoc] = useState('20608974512');
  const [sandboxCustomerName, setSandboxCustomerName] = useState('CORPORACIÓN DIGITAL DEL PERÚ S.A.C.');
  const [sandboxItemDesc, setSandboxItemDesc] = useState('Servicio de Consultoría y Desarrollo Cloud');
  const [sandboxItemPrice, setSandboxItemPrice] = useState(118.00);
  const [sandboxCompanyRuc, setSandboxCompanyRuc] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxLookupLoading, setSandboxLookupLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState(null);

  const hostUrl = window.location.origin;
  const activeApiKey = newlyCreatedKey?.key || (keys[0] ? keys[0].maskedKey : 'sk_live_TU_API_KEY');
  const realApiKeyValue = newlyCreatedKey?.key || (keys[0] ? 'sk_live_...' : 'sk_live_CREA_UNA_API_KEY');

  useEffect(() => {
    fetchKeys();
    fetchCompanies();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  };

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tenant/apikeys`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setKeys(data);
      }
    } catch (e) {
      console.error('Error fetching API keys:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCompanies(data);
        if (data.length > 0 && !sandboxCompanyRuc) {
          const defaultComp = data.find(c => c.isDefault) || data[0];
          setSandboxCompanyRuc(defaultComp.ruc);
        }
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/tenant/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewlyCreatedKey(data.apiKey);
        setIsModalOpen(false);
        setNewKeyName('Sistema Externo');
        fetchKeys();
      } else {
        showMsg(data.error || 'Error al crear API Key', 'error');
      }
    } catch (e) {
      showMsg('Error de red al crear API Key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de revocar la clave "${name}"? Cualquier sistema externo conectado (POS, Odoo, WHMCS, CRM, App) perderá acceso inmediatamente.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/tenant/apikeys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message);
        fetchKeys();
      } else {
        showMsg(data.error || 'Error al revocar clave', 'error');
      }
    } catch (e) {
      showMsg('Error al revocar API Key', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMsg('¡Código copiado al portapapeles!');
  };

  // Live Padron RUC/DNI lookup in Sandbox
  const handleSandboxLookup = async () => {
    const num = sandboxCustomerDoc.trim();
    if (!num) return;
    setSandboxLookupLoading(true);
    try {
      const endpoint = num.length === 11 ? `ruc/${num}` : `dni/${num}`;
      const res = await fetch(`${API_URL}/api/v1/external/consultas/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${newlyCreatedKey?.key || (keys[0] ? keys[0].maskedKey : '')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setSandboxCustomerName(data.data.nombre || data.data.razonSocial || '');
        showMsg(`Datos encontrados: ${data.data.nombre || data.data.razonSocial}`);
      } else {
        showMsg(data.error || 'No se encontraron datos en el padrón.', 'error');
      }
    } catch (e) {
      showMsg('Error consultando padrón: ' + e.message, 'error');
    } finally {
      setSandboxLookupLoading(false);
    }
  };

  // Live Sandbox Invoice Emission Test
  const handleRunSandboxEmission = async (e) => {
    e.preventDefault();
    setSandboxLoading(true);
    setSandboxResult(null);

    const payload = {
      ruc: sandboxCompanyRuc || undefined,
      tipoDoc: sandboxDocType,
      cliente: {
        tipoDoc: sandboxDocType === '01' ? '6' : (sandboxCustomerDoc.length === 11 ? '6' : '1'),
        numDoc: sandboxCustomerDoc.trim(),
        rznSocial: sandboxCustomerName.trim()
      },
      moneda: 'PEN',
      formaPago: 'Contado',
      observaciones: `Prueba en vivo desde API Sandbox Developer Hub (${new Date().toLocaleDateString()})`,
      items: [
        {
          descripcion: sandboxItemDesc.trim(),
          cantidad: 1,
          precioUnitario: parseFloat(sandboxItemPrice) || 100
        }
      ],
      includeBase64: false
    };

    try {
      // Use the first active key if newly created is not available
      const keyToUse = newlyCreatedKey?.key || (keys[0] ? keys[0].maskedKey : '');
      const res = await fetch(`${API_URL}/api/v1/external/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyToUse}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSandboxResult({
        status: res.status,
        payload,
        response: data
      });
      if (res.ok && data.success) {
        showMsg(`¡Comprobante ${data.id} emitido y aceptado por SUNAT!`);
      } else {
        showMsg(`Respuesta: ${data.sunatMessage || data.error || 'Error'}`, 'error');
      }
    } catch (e) {
      setSandboxResult({
        status: 500,
        payload,
        response: { success: false, error: 'Error de conexión: ' + e.message }
      });
    } finally {
      setSandboxLoading(false);
    }
  };

  // =========================================================================
  // MULTI-LANGUAGE CODE SNIPPETS
  // =========================================================================

  const getSampleJson = () => {
    return JSON.stringify({
      ruc: sandboxCompanyRuc || "20601234567",
      tipoDoc: "01",
      serie: "F001",
      cliente: {
        tipoDoc: "6",
        numDoc: "20554123891",
        rznSocial: "EMPRESA CLIENTE S.A.C.",
        direccion: "AV. JAVIER PRADO ESTE 450, SAN ISIDRO, LIMA",
        email: "facturacion@cliente.com"
      },
      moneda: "PEN",
      formaPago: "Contado",
      observaciones: "Venta emitida vía API Facturación Multiempresa",
      items: [
        {
          descripcion: "Servicio Profesional de Consultoría Cloud",
          cantidad: 1,
          precioUnitario: 118.00
        }
      ]
    }, null, 2);
  };

  const codeSnippets = {
    php: `<?php
// Ejemplo en PHP (cURL nativo / Guzzle)
$apiUrl = "${hostUrl}/api/v1/external/invoices";
$apiKey = "${realApiKeyValue}";

$payload = ${getSampleJson()};

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);
if ($result['success']) {
    echo "Comprobante emitido: " . $result['id'] . "\\n";
    echo "Estado SUNAT: " . $result['status'] . "\\n";
    echo "PDF Ticket 80mm: " . $result['links']['pdfTicketUrl'] . "\\n";
    echo "PDF Formato A4: " . $result['links']['pdfA4Url'] . "\\n";
    echo "Descarga CDR: " . $result['links']['cdrUrl'] . "\\n";
} else {
    echo "Error: " . ($result['sunatMessage'] ?? $result['error']) . "\\n";
}`,

    js: `// Ejemplo en JavaScript / Node.js (Fetch o Axios)
const apiUrl = "${hostUrl}/api/v1/external/invoices";
const apiKey = "${realApiKeyValue}";

const invoiceData = ${getSampleJson()};

async function emitirComprobante() {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${apiKey}\`
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();
    console.log("Respuesta SUNAT:", result);

    if (result.success) {
      console.log(\`✅ \${result.id} Aceptado por SUNAT (Código: \${result.sunatResponseCode})\`);
      console.log("Ticket para impresora POS:", result.links.pdfTicketUrl);
      console.log("PDF A4:", result.links.pdfA4Url);
      console.log("XML UBL 2.1:", result.links.xmlUrl);
      console.log("CDR SUNAT:", result.links.cdrUrl);
    }
  } catch (error) {
    console.error("Error al emitir comprobante:", error.message);
  }
}

emitirComprobante();`,

    python: `# Ejemplo en Python (Requests) - Ideal para Odoo, Django, Flask, FastAPI
import requests
import json

api_url = "${hostUrl}/api/v1/external/invoices"
api_key = "${realApiKeyValue}"

payload = ${getSampleJson().replace('true', 'True').replace('false', 'False')}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

response = requests.post(api_url, json=payload, headers=headers)
data = response.json()

if data.get("success"):
    print(f"✅ Comprobante {data['id']} emitido correctamente")
    print(f"Estado SUNAT: {data['status']} - {data.get('sunatMessage')}")
    print(f"PDF Ticket: {data['links']['pdfTicketUrl']}")
    print(f"XML Firmado: {data['links']['xmlUrl']}")
    print(f"CDR SUNAT: {data['links']['cdrUrl']}")
else:
    print(f"❌ Error al emitir: {data.get('error') or data.get('sunatMessage')}")`,

    csharp: `// Ejemplo en C# / .NET (HttpClient) - Ideal para Sistemas POS Windows y Desktop
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var apiUrl = "${hostUrl}/api/v1/external/invoices";
        var apiKey = "${realApiKeyValue}";

        var jsonString = @"${getSampleJson().replace(/"/g, '""')}";

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

        var content = new StringContent(jsonString, Encoding.UTF8, "application/json");
        var response = await client.PostAsync(apiUrl, content);
        var resultJson = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"Respuesta HTTP {response.StatusCode}: {resultJson}");
    }
}`,

    java: `// Ejemplo en Java (java.net.http.HttpClient) - Ideal para Backend Java y Spring Boot
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SunatInvoiceClient {
    public static void main(String[] args) throws Exception {
        String apiUrl = "${hostUrl}/api/v1/external/invoices";
        String apiKey = "${realApiKeyValue}";
        String jsonPayload = """
${getSampleJson()}
        """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Respuesta SUNAT (" + response.statusCode() + "):");
        System.out.println(response.body());
    }
}`,

    curl: `# Ejemplo cURL (Línea de comandos / Bash / Cron)
curl -X POST "${hostUrl}/api/v1/external/invoices" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${realApiKeyValue}" \\
  -d '${JSON.stringify(JSON.parse(getSampleJson()))}'`
  };

  // =========================================================================
  // MULTI-SYSTEM GUIDES (POS, ODOO, APPS, CRM, SAAS, WHMCS)
  // =========================================================================

  const systemGuides = {
    pos: {
      title: 'Puntos de Venta (POS) & Cajas Registradoras',
      desc: 'Ideal para comercios, minimarkets, farmacias y restaurantes. Permite emitir tickets de 80mm al instante y consultar RUC/DNI en tiempo real para agilizar la cola de clientes.',
      highlights: [
        'Impresión directa en formato Ticket térmico de 80mm vía URL directa o HTML.',
        'Soporte de Boleta Rápida (con o sin DNI para ventas menores a S/ 700).',
        'Opción includeBase64: true para imprimir sin conexión o vía Bluetooth.',
        'Búsqueda automática de Razón Social y Nombres digitando solo el RUC o DNI.'
      ],
      code: `// Flujo Rápido para POS en JavaScript
// 1. Cuando el cajero tipea el DNI o RUC, autocompletar:
async function buscarCliente(doc) {
  const endpoint = doc.length === 11 ? "ruc" : "dni";
  const res = await fetch(\`${hostUrl}/api/v1/external/consultas/\${endpoint}/\${doc}\`, {
    headers: { "Authorization": "Bearer ${realApiKeyValue}" }
  });
  const data = await res.json();
  if (data.success) return data.data.nombre;
}

// 2. Al presionar "Cobrar e Imprimir Ticket":
async function emitirTicketPOS(items, clienteDoc, clienteNombre, total) {
  const res = await fetch("${hostUrl}/api/v1/external/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${realApiKeyValue}"
    },
    body: JSON.stringify({
      tipoDoc: clienteDoc.length === 11 ? "01" : "03", // 01 Factura, 03 Boleta
      serie: clienteDoc.length === 11 ? "F001" : "B001",
      cliente: {
        tipoDoc: clienteDoc.length === 11 ? "6" : "1",
        numDoc: clienteDoc,
        rznSocial: clienteNombre
      },
      moneda: "PEN",
      formaPago: "Contado",
      items: items // [{ descripcion: "Hamburguesa Doble", cantidad: 2, precioUnitario: 18.50 }]
    })
  });
  const result = await res.json();
  // Abre e imprime automáticamente el ticket en la impresora térmica:
  window.open(result.links.pdfTicketUrl, "_blank");
}`
    },

    odoo: {
      title: 'Integración Odoo ERP (v14 / v15 / v16 / v17 / v18)',
      desc: 'Conecta Odoo con nuestra API de Facturación SUNAT mediante una Acción Automatizada en Python. Al validar una factura de cliente en Odoo, se envía automáticamente el JSON, se recibe el CDR y se adjunta el comprobante.',
      highlights: [
        'Cero modificaciones en el core de Odoo: funciona como Acción Automatizada.',
        'Sincroniza Facturas (01), Boletas (03) y Notas de Crédito (07).',
        'Guarda el ID del comprobante oficial y el estado de SUNAT en las notas de Odoo.',
        'Compatible con Odoo Community y Odoo Enterprise.'
      ],
      code: `# Script Python para Acción Automatizada en Odoo (Modelo: account.move)
# Disparador: Al Actualizar / Estado pasa a 'posted' (Validado)

import requests
import json

if record.move_type in ['out_invoice', 'out_refund'] and record.state == 'posted':
    api_url = "${hostUrl}/api/v1/external/invoices"
    api_key = "${realApiKeyValue}"

    partner = record.partner_id
    doc_num = partner.vat or ''
    is_ruc = len(doc_num) == 11
    tipo_doc = '01' if is_ruc else '03'
    if record.move_type == 'out_refund':
        tipo_doc = '07' # Nota de crédito

    items = []
    for line in record.invoice_line_ids:
        if line.display_type in ['line_section', 'line_note']:
            continue
        items.append({
            'descripcion': line.name or line.product_id.name or 'Item',
            'cantidad': float(line.quantity),
            'precioUnitario': float(line.price_unit * 1.18) # Precio con IGV
        })

    payload = {
        'tipoDoc': tipo_doc,
        'cliente': {
            'tipoDoc': '6' if is_ruc else '1',
            'numDoc': doc_num,
            'rznSocial': partner.name,
            'direccion': partner.street or ''
        },
        'moneda': record.currency_id.name,
        'formaPago': 'Contado',
        'observaciones': f"Factura Odoo {record.name}",
        'items': items
    }

    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'}
    try:
        res = requests.post(api_url, json=payload, headers=headers, timeout=15)
        data = res.json()
        if data.get('success'):
            record.message_post(body=f"✅ SUNAT Emitido: {data['id']} - Estado: {data['status']}<br><a href='{data['links']['pdfA4Url']}' target='_blank'>Ver PDF SUNAT</a>")
    except Exception as e:
        record.message_post(body=f"⚠️ Error enviando a SUNAT API: {str(e)}")`
    },

    app: {
      title: 'Aplicaciones Móviles (Flutter, React Native, iOS, Android)',
      desc: 'Permite a vendedores en ruta, repartidores, técnicos y apps móviles emitir facturas y boletas electrónicas en segundos desde smartphones o tablets.',
      highlights: [
        'Retorno de XML y CDR en base64 para almacenamiento offline o firma móvil.',
        'Soporte de visualización web directa del comprobante sin necesidad de visor PDF nativo.',
        'Endpoints ultra ligeros con tiempos de respuesta menores a 900ms.',
        'Multi-RUC: un solo repartidor o vendedor puede emitir para distintas sucursales.'
      ],
      code: `// Ejemplo en Dart / Flutter para App Móvil
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<Map<String, dynamic>> emitirFacturaApp({
  required String rucEmpresa,
  required String clienteRuc,
  required String clienteNombre,
  required List<Map<String, dynamic>> items,
}) async {
  final url = Uri.parse('${hostUrl}/api/v1/external/invoices');
  final response = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${realApiKeyValue}',
    },
    body: jsonEncode({
      'ruc': rucEmpresa,
      'tipoDoc': '01',
      'cliente': {
        'tipoDoc': '6',
        'numDoc': clienteRuc,
        'rznSocial': clienteNombre,
      },
      'items': items,
      'includeBase64': true, // Retorna base64 para guardar offline
    }),
  );

  return jsonDecode(response.body);
}`
    },

    crm: {
      title: 'CRM & Sistemas de Gestión (HubSpot, Zoho, Salesforce)',
      desc: 'Automatiza la facturación en cuanto tu equipo comercial cierra una venta o gana un negocio ("Deal Won"), eliminando el trabajo manual de digitación.',
      highlights: [
        'Disparo mediante Webhooks al cambiar de etapa en el embudo comercial.',
        'Sincroniza el PDF y CDR directamente en el registro del cliente en el CRM.',
        'Reduce a cero los errores humanos en números de RUC y montos.',
        'Compatibilidad total con Make (Integromat), Zapier y n8n.'
      ],
      code: `// Ejemplo para Webhook de CRM (Node.js / Cloud Function)
exports.onDealWon = async (req, res) => {
  const deal = req.body.deal;
  const clientRuc = deal.custom_fields.ruc;
  const clientName = deal.company_name;

  const invoicePayload = {
    tipoDoc: "01",
    cliente: {
      tipoDoc: "6",
      numDoc: clientRuc,
      rznSocial: clientName
    },
    moneda: deal.currency || "PEN",
    formaPago: "Contado",
    observaciones: \`Venta CRM Deal #\${deal.id} - Cerrado por \${deal.owner_name}\`,
    items: [
      {
        descripcion: deal.product_name || "Servicio Contratado",
        cantidad: 1,
        precioUnitario: deal.amount
      }
    ]
  };

  const response = await fetch("${hostUrl}/api/v1/external/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${realApiKeyValue}"
    },
    body: JSON.stringify(invoicePayload)
  });

  const sunatDoc = await response.json();
  res.json({ ok: true, invoiceId: sunatDoc.id, pdf: sunatDoc.links.pdfA4Url });
};`
    },

    saas: {
      title: 'Plataformas SaaS & Cobranza Recurrente',
      desc: 'Diseñado para software como servicio (SaaS), membresías, gimnasios, colegios y empresas de servicios con cobros mensuales masivos.',
      highlights: [
        'Endpoint masivo /batch para procesar miles de recibos mensuales en un solo ciclo.',
        'Control inteligente de cuotas por tenant para evitar cortes de servicio.',
        'Generación de comprobantes al completarse el pago con Mercado Pago, Culqi, Izipay o PayPal.',
        'Cálculo automático de base imponible e IGV (18%).'
      ],
      code: `// Emisión Masiva de Recibos Mensuales SaaS (/batch)
const subscriptionInvoices = [
  {
    tipoDoc: "01",
    cliente: { tipoDoc: "6", numDoc: "20601111111", rznSocial: "CLIENTE A S.A.C." },
    items: [{ descripcion: "Plan SaaS Pro - Mes Mayo 2026", cantidad: 1, precioUnitario: 118.00 }]
  },
  {
    tipoDoc: "03",
    cliente: { tipoDoc: "1", numDoc: "71234567", rznSocial: "PEDRO CASTILLO" },
    items: [{ descripcion: "Membresía Mensual Cloud", cantidad: 1, precioUnitario: 59.00 }]
  }
];

const batchRes = await fetch("${hostUrl}/api/v1/external/invoices/batch", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${realApiKeyValue}"
  },
  body: JSON.stringify({ invoices: subscriptionInvoices })
});

const batchData = await batchRes.json();
console.log(\`Procesados: \${batchData.successful} exitosos de \${batchData.total}\`);`
    },

    whmcs: {
      title: 'WHMCS (Hosting & Dominios)',
      desc: 'Hook PHP oficial para WHMCS. Detecta el evento InvoicePaid y emite Factura o Boleta según el RUC o DNI configurado en la cuenta del cliente.',
      highlights: [
        'Detección automática de RUC (11 dígitos -> Factura 01) o DNI (8 dígitos -> Boleta 03).',
        'Soporte multimoneda nativo (soles PEN o dólares USD).',
        'Anotación de la serie SUNAT y estado en las notas internas de la factura en WHMCS.',
        'Evita facturaciones duplicadas verificando notas previas.'
      ],
      code: `<?php
/**
 * WHMCS Hook: Emisión Automática de Facturación Electrónica SUNAT
 * Copiar en: /includes/hooks/sunat_billing.php
 */
if (!defined("WHMCS")) die("Acceso denegado");
use WHMCS\\Database\\Capsule;

define('SUNAT_API_URL', '${hostUrl}');
define('SUNAT_API_KEY', '${realApiKeyValue}');

add_hook('InvoicePaid', 1, function($vars) {
    $invoiceId = $vars['invoiceid'];
    $invoice = Capsule::table('tblinvoices')->where('id', $invoiceId)->first();
    if (!$invoice || strpos($invoice->notes ?? '', '[SUNAT:') !== false) return;

    $client = Capsule::table('tblclients')->where('id', $invoice->userid)->first();
    $docNumero = trim($client->tax_id ?? '');
    if (empty($docNumero)) return;

    $isRuc = (strlen($docNumero) === 11);
    $tipoDoc = $isRuc ? '01' : '03';
    $razonSocial = trim($client->companyname ?: ($client->firstname . ' ' . $client->lastname));

    $payload = [
        'tipoDoc' => $tipoDoc,
        'cliente' => [
            'tipoDoc' => $isRuc ? '6' : '1',
            'numDoc' => $docNumero,
            'rznSocial' => $razonSocial,
            'direccion' => trim($client->address1 . ' ' . $client->city),
            'email' => $client->email
        ],
        'moneda' => ($invoice->currency == 2) ? 'USD' : 'PEN',
        'formaPago' => 'Contado',
        'observaciones' => "Pago Factura WHMCS #{$invoiceId}",
        'items' => [
            ['descripcion' => "Servicios de Hosting - Factura #{$invoiceId}", 'cantidad' => 1, 'precioUnitario' => floatval($invoice->total)]
        ]
    ];

    $ch = curl_init(SUNAT_API_URL . '/api/v1/external/invoices');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer ' . SUNAT_API_KEY]);
    $response = curl_exec($ch);
    $resData = json_decode($response, true);
    curl_close($ch);

    if (!empty($resData['id'])) {
        Capsule::table('tblinvoices')->where('id', $invoiceId)->update([
            'notes' => ($invoice->notes ?? '') . "\\n[SUNAT: " . $resData['id'] . " - " . $resData['status'] . "]"
        ]);
    }
});`
    }
  };

  return (
    <div className="section-container animate-fade-in">
      {/* =========================================================================
          ENCABEZADO PRINCIPAL
          ========================================================================= */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <IconCode size={24} style={{ color: 'var(--primary)' }} />
              <span>API Facturación Multiempresa & Integraciones</span>
            </h2>
            <span className="status-badge status-accepted" style={{ fontSize: '11px', padding: '3px 8px' }}>
              PROVEEDOR ACTIVO
            </span>
          </div>
          <p className="section-subtitle" style={{ marginTop: '4px' }}>
            Conecta sistemas externos (<strong>POS, CRM, Odoo, Apps móviles, SaaS, WHMCS y otros</strong>) mediante JSON con validación UBL 2.1, firma digital CDT y respuesta CDR instantánea.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <IconPlus size={16} />
          <span>Generar Nueva API Key</span>
        </button>
      </div>

      {message && (
        <div className={`alert-banner ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ margin: '14px 0' }}>
          {message.text}
        </div>
      )}

      {/* Clave recién generada */}
      {newlyCreatedKey && (
        <div className="glass-card" style={{ padding: '18px 20px', margin: '16px 0', border: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IconCheck size={20} style={{ color: '#10b981' }} />
            <strong style={{ color: '#065f46', fontSize: '15px' }}>
              ¡API Key "{newlyCreatedKey.name}" generada con éxito!
            </strong>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
            ⚠️ Copia y guarda esta clave ahora mismo. Por seguridad, no volverá a mostrarse completa en pantalla.
          </p>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={newlyCreatedKey.key}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #10b981',
                width: '100%',
                background: '#fff',
                color: '#111827'
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => copyToClipboard(newlyCreatedKey.key)}
            >
              Copiar Clave
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIAGRAMA DE ARQUITECTURA VISUAL (IDÉNTICO AL DIAGRAMA DEL USUARIO)
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', background: 'radial-gradient(ellipse at 50% 20%, rgba(37, 99, 235, 0.06), transparent 70%), var(--bg-card)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary)' }}>
            ARQUITECTURA DE INTEGRACIÓN
          </span>
          <h3 style={{ margin: '4px 0 6px 0', fontSize: '18px', color: 'var(--text-primary)' }}>
            Diagrama de Conexión API Proveedor (Multiempresa)
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto' }}>
            Cualquier sistema externo se comunica enviando <code>JSON</code> y la plataforma orquesta el cálculo, firma UBL 2.1, transmisión a SUNAT y entrega de CDR y PDF.
          </p>
        </div>

        {/* Cajas superiores: Sistemas clientes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '10px', marginBottom: '14px' }}>
          {[
            { name: 'POS', desc: 'Punto de Venta', icon: '🏪' },
            { name: 'CRM', desc: 'Ventas & Leads', icon: '💼' },
            { name: 'APP', desc: 'Móvil / Web', icon: '📱' },
            { name: 'ODOO', desc: 'ERP Odoo', icon: '🏢' },
            { name: 'SAAS', desc: 'Suscripciones', icon: '☁️' },
            { name: 'WHMCS', desc: 'Hosting', icon: '🌐' },
            { name: 'OTROS', desc: 'E-commerce', icon: '🧩' }
          ].map(sys => (
            <div
              key={sys.name}
              style={{
                background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '10px 8px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '2px' }}>{sys.icon}</div>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>{sys.name}</strong>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sys.desc}</span>
            </div>
          ))}
        </div>

        {/* Flechas hacia abajo con badge JSON */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '6px 0 14px 0' }}>
          <span style={{ width: '40px', height: '1px', background: 'var(--border-color)' }}></span>
          <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '3px 12px', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
            ▼ Payload JSON (POST /invoices) ▼
          </span>
          <span style={{ width: '40px', height: '1px', background: 'var(--border-color)' }}></span>
        </div>

        {/* Bloque Central: API Facturación + SUNAT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
          {/* Tarjeta Central: Motor de Facturación */}
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 8px 24px -6px var(--primary-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '14.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconServer size={18} style={{ color: 'var(--primary)' }} />
                <span>API FACTURACIÓN (Multiempresa)</span>
              </strong>
              <span style={{ fontSize: '10px', background: 'var(--primary)', color: '#fff', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                CÓDIGO FUENTE
              </span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>✓ <strong>Validar</strong> datos tributarios y catálogos SUNAT</li>
              <li>✓ <strong>Generar XML</strong> estándar UBL 2.1 oficial</li>
              <li>✓ <strong>Firmar</strong> con Certificado Digital CDT (.pfx)</li>
              <li>✓ <strong>Calcular</strong> Gravado, IGV (18%), ISC y Totales</li>
              <li>✓ <strong>Comprimir</strong> en archivo XML.zip</li>
              <li>✓ <strong>Enviar XML</strong> vía Web Services SUNAT</li>
              <li>✓ <strong>Leer CDR</strong> de respuesta oficial</li>
              <li>✓ <strong>Almacenar</strong> PDF (A4 y Ticket 80mm), XML y CDR</li>
            </ul>
          </div>

          {/* Tarjeta Derecha: Servidor SUNAT */}
          <div style={{
            background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '14.5px', color: 'var(--text-primary)' }}>
                  🏛️ SERVIDOR SUNAT
                </strong>
                <span className="status-badge status-accepted" style={{ fontSize: '10px' }}>
                  PRODUCCIÓN / BETA
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>✓ <strong>Validar</strong> estructura y reglas de negocio</li>
                <li>✓ <strong>Verificar</strong> firma digital del emisor</li>
                <li>✓ <strong>Devolver respuesta CDR (xml)</strong> con código y firma de SUNAT</li>
              </ul>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              ☁️ <strong>Despliegue compatible:</strong> VPS Linux, Docker, AWS, Google Cloud, Azure, Servidor Local, Hosting Compartido.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          API KEYS TABLE
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconKey size={18} />
            <span>Tus Claves de Acceso API (Secret Keys)</span>
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Autenticación vía header <code>Authorization: Bearer sk_live_...</code>
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nombre / Identificador</th>
                <th>Prefijo de Clave</th>
                <th>Último Uso</th>
                <th>Fecha de Creación</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {keys.length > 0 ? (
                keys.map(k => (
                  <tr key={k.id}>
                    <td><strong>{k.name}</strong></td>
                    <td><code>{k.maskedKey}</code></td>
                    <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Sin actividad aún'}</td>
                    <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td><span className="status-badge status-accepted">ACTIVA</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-action-icon btn-action-delete"
                        onClick={() => handleDeleteKey(k.id, k.name)}
                        title="Revocar API Key"
                      >
                        <IconTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    No tienes ninguna API Key activa. Haz clic en "Generar Nueva API Key" para empezar a conectar tus sistemas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE LIVE API SANDBOX / TESTER
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconZap size={20} style={{ color: '#f59e0b' }} />
              <span>🧪 Sandbox de Prueba en Vivo (Emisión Real por API)</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Prueba la emisión instantánea de un comprobante con tu API Key y verifica en vivo el retorno de SUNAT (CDR, PDF A4 y Ticket 80mm).
            </p>
          </div>
        </div>

        <form onSubmit={handleRunSandboxEmission}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            {/* Empresa emisora */}
            <div className="form-group-field">
              <label className="form-label">Empresa Emisora (RUC)</label>
              <select
                className="input-field"
                value={sandboxCompanyRuc}
                onChange={(e) => setSandboxCompanyRuc(e.target.value)}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.ruc}>
                    {c.ruc} - {c.razonSocial} {c.isDefault ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Documento */}
            <div className="form-group-field">
              <label className="form-label">Tipo de Comprobante</label>
              <select
                className="input-field"
                value={sandboxDocType}
                onChange={(e) => {
                  setSandboxDocType(e.target.value);
                  if (e.target.value === '03' && sandboxCustomerDoc.length === 11) {
                    setSandboxCustomerDoc('72849102');
                    setSandboxCustomerName('JUAN CARLOS PEREZ GOMEZ');
                  } else if (e.target.value === '01' && sandboxCustomerDoc.length !== 11) {
                    setSandboxCustomerDoc('20608974512');
                    setSandboxCustomerName('CORPORACIÓN DIGITAL DEL PERÚ S.A.C.');
                  }
                }}
              >
                <option value="01">Factura Electrónica (01 - F001)</option>
                <option value="03">Boleta de Venta Electrónica (03 - B001)</option>
              </select>
            </div>

            {/* Documento Cliente con Consulta Padrón */}
            <div className="form-group-field">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{sandboxDocType === '01' ? 'RUC Cliente (11 dígitos)' : 'DNI / RUC Cliente'}</span>
                <button
                  type="button"
                  onClick={handleSandboxLookup}
                  disabled={sandboxLookupLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {sandboxLookupLoading ? 'Buscando...' : '🔍 Buscar Padrón'}
                </button>
              </label>
              <input
                type="text"
                className="input-field"
                value={sandboxCustomerDoc}
                onChange={(e) => setSandboxCustomerDoc(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group-field">
              <label className="form-label">Razón Social o Nombre del Cliente</label>
              <input
                type="text"
                className="input-field"
                value={sandboxCustomerName}
                onChange={(e) => setSandboxCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Descripción del Ítem o Servicio</label>
              <input
                type="text"
                className="input-field"
                value={sandboxItemDesc}
                onChange={(e) => setSandboxItemDesc(e.target.value)}
                required
              />
            </div>

            <div className="form-group-field" style={{ maxWidth: '160px' }}>
              <label className="form-label">Precio Total (Inc. IGV)</label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                value={sandboxItemPrice}
                onChange={(e) => setSandboxItemPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ⚡ La petición se enviará al endpoint <code>POST /api/v1/external/invoices</code> usando tu API Key activa.
            </span>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sandboxLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {sandboxLoading ? (
                <>
                  <LoaderCircleIcon className="animate-spin" width={16} height={16} />
                  <span>Transmitiendo a SUNAT...</span>
                </>
              ) : (
                <>
                  <IconZap size={16} />
                  <span>Emitir Comprobante de Prueba</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sandbox Live Response Box */}
        {sandboxResult && (
          <div style={{
            marginTop: '20px',
            padding: '18px',
            borderRadius: '10px',
            background: sandboxResult.response.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${sandboxResult.response.success ? '#10b981' : '#ef4444'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-badge ${sandboxResult.response.success ? 'status-accepted' : 'status-rejected'}`}>
                  {sandboxResult.response.success ? 'HTTP 200 OK · ACEPTADO POR SUNAT' : 'ERROR DE EMISIÓN'}
                </span>
                {sandboxResult.response.id && (
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {sandboxResult.response.id}
                  </strong>
                )}
              </div>

              {sandboxResult.response.links && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href={sandboxResult.response.links.pdfTicketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '11.5px', padding: '5px 10px' }}
                  >
                    🖨️ Ticket 80mm
                  </a>
                  <a
                    href={sandboxResult.response.links.pdfA4Url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '11.5px', padding: '5px 10px' }}
                  >
                    📄 PDF A4
                  </a>
                  <a
                    href={sandboxResult.response.links.xmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '11.5px', padding: '5px 10px' }}
                  >
                    📦 XML UBL
                  </a>
                  {sandboxResult.response.links.cdrUrl && (
                    <a
                      href={sandboxResult.response.links.cdrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '5px 10px' }}
                    >
                      🛡️ CDR SUNAT
                    </a>
                  )}
                </div>
              )}
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-primary)' }}>
              <strong>Mensaje SUNAT:</strong> {sandboxResult.response.sunatMessage || sandboxResult.response.error || 'Procesado'}
            </p>

            <details style={{ marginTop: '10px' }}>
              <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                Ver Payload JSON Completo (Request & Response)
              </summary>
              <pre style={{ marginTop: '8px', padding: '12px', background: '#0f172a', color: '#f8fafc', borderRadius: '6px', fontSize: '11.5px', overflowX: 'auto' }}>
                {JSON.stringify(sandboxResult, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* =========================================================================
          GUÍAS DE INTEGRACIÓN POR SISTEMA (POS, ODOO, APPS, CRM, SAAS, WHMCS)
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: 'var(--text-primary)' }}>
            Guías de Conexión según tu Sistema
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecciona el tipo de plataforma que deseas conectar a la API para ver la arquitectura recomendada y el código listo para copiar:
          </p>
        </div>

        {/* Pestañas de Sistemas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { id: 'pos', name: '🏪 POS (Puntos de Venta)', badge: 'Retail / Cajas' },
            { id: 'odoo', name: '🏢 Odoo ERP', badge: 'v14 - v18' },
            { id: 'app', name: '📱 Apps Móviles', badge: 'Flutter / RN' },
            { id: 'crm', name: '💼 CRM & Ventas', badge: 'HubSpot / Zoho' },
            { id: 'saas', name: '☁️ SaaS Recurrente', badge: 'Batch / Mensual' },
            { id: 'whmcs', name: '🌐 WHMCS Hosting', badge: 'PHP Hook' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`btn ${activeSystemTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12.5px', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveSystemTab(tab.id)}
            >
              <span>{tab.name}</span>
              <span style={{
                fontSize: '10px',
                opacity: 0.85,
                background: activeSystemTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Contenido del Sistema Activo */}
        <div className="animate-fade-in" style={{ background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                {systemGuides[activeSystemTab].title}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '720px' }}>
                {systemGuides[activeSystemTab].desc}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => copyToClipboard(systemGuides[activeSystemTab].code)}
            >
              <IconCopy size={14} />
              <span>Copiar Código de Integración</span>
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Puntos clave de esta integración:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {systemGuides[activeSystemTab].highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>

          <pre style={{
            margin: 0,
            padding: '16px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '12px',
            overflowX: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: 1.45
          }}>
            {systemGuides[activeSystemTab].code}
          </pre>
        </div>
      </div>

      {/* =========================================================================
          SDK Y GENERADOR DE CÓDIGO MULTILENGUAJE (PHP, JS, PYTHON, C#, JAVA, CURL)
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)' }}>
              SDKs & Ejemplos en Lenguajes de Programación
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Ejemplos listos para copiar en <strong>C#, Python, Java, JavaScript, PHP y cURL</strong>:
            </p>
          </div>

          {/* Selector de Lenguaje */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'php', name: 'PHP' },
              { id: 'js', name: 'JavaScript / Node' },
              { id: 'python', name: 'Python' },
              { id: 'csharp', name: 'C# / .NET' },
              { id: 'java', name: 'Java' },
              { id: 'curl', name: 'cURL / Bash' }
            ].map(lang => (
              <button
                key={lang.id}
                type="button"
                className={`btn ${activeLangTab === lang.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setActiveLangTab(lang.id)}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => copyToClipboard(codeSnippets[activeLangTab])}
          >
            <IconCopy size={14} />
            <span>Copiar Snippet ({activeLangTab.toUpperCase()})</span>
          </button>
        </div>

        <pre style={{
          margin: 0,
          padding: '18px',
          borderRadius: '8px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: '12.5px',
          overflowX: 'auto',
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1.5
        }}>
          {codeSnippets[activeLangTab]}
        </pre>
      </div>

      {/* Modal Generar Nueva API Key */}
      {isModalOpen && (
        <div className="login-modal-overlay">
          <div className="login-modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                Generar Nueva API Key
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey}>
              <div className="form-group-field">
                <label className="form-label">Nombre o Identificador del Sistema</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Ej. POS Caja 1, Odoo Producción, App Repartidores"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  autoFocus
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                  Te permitirá identificar exactamente qué aplicación o sucursal está emitiendo con esta clave.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Generando...' : 'Generar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}