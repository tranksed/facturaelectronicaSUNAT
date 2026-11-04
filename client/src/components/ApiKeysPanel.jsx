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
  LoaderCircleIcon
} from './Icons';

export default function ApiKeysPanel({ API_URL, authToken, currentUser }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('WHMCS Producción');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurlUnit, setCopiedCurlUnit] = useState(false);
  const [copiedCurlBatch, setCopiedCurlBatch] = useState(false);
  const [copiedWhmcsHook, setCopiedWhmcsHook] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState('whmcs'); // 'whmcs' | 'unitary' | 'batch'

  const hostUrl = window.location.origin;

  useEffect(() => {
    fetchKeys();
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
        setNewKeyName('WHMCS Producción');
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
    if (!window.confirm(`¿Estás seguro de revocar la clave "${name}"? Cualquier sistema externo como WHMCS perderá acceso inmediatamente.`)) {
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

  const copyToClipboard = (text, setCopiedState) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2500);
  };

  const sampleUnitaryJson = JSON.stringify({
    tipoDoc: "01",
    serie: "F001",
    cliente: {
      tipoDoc: "6",
      numDoc: "20601234567",
      rznSocial: "EMPRESA CLIENTE S.A.C.",
      direccion: "AV. LARCO 123, MIRAFLORES, LIMA",
      email: "facturacion@cliente.com"
    },
    moneda: "PEN",
    formaPago: "Contado",
    observaciones: "Orden WHMCS #10842 - Servicio Hosting Web",
    items: [
      {
        descripcion: "Hosting CPanel NVMe Plan Pro (Anual)",
        cantidad: 1,
        precioUnitario: 118.00
      }
    ]
  }, null, 2);

  const sampleBatchJson = JSON.stringify({
    invoices: [
      {
        tipoDoc: "01",
        serie: "F001",
        cliente: {
          tipoDoc: "6",
          numDoc: "20601234567",
          rznSocial: "EMPRESA UNO S.A.C."
        },
        items: [{ descripcion: "Suscripción Mensual", cantidad: 1, precioUnitario: 59.00 }]
      },
      {
        tipoDoc: "03",
        serie: "B001",
        cliente: {
          tipoDoc: "1",
          numDoc: "72849102",
          rznSocial: "JUAN CARLOS PEREZ"
        },
        items: [{ descripcion: "Dominio .COM Registro", cantidad: 1, precioUnitario: 45.00 }]
      }
    ]
  }, null, 2);

  const whmcsSampleHook = `<?php
/**
 * WHMCS Hook: Emisión Automática de Facturación Electrónica SUNAT
 * Copiar en: /includes/hooks/sunat_billing.php
 */

if (!defined("WHMCS")) die("Acceso denegado");
use WHMCS\\Database\\Capsule;

define('SUNAT_API_URL', '${hostUrl}');
define('SUNAT_API_KEY', '${newlyCreatedKey?.key || (keys[0] ? 'sk_live_TU_API_KEY' : 'sk_live_CREA_UNA_API_KEY')}');

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
});`;

  return (
    <div className="section-container animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCode size={24} />
            <span>API Externa REST & Integración WHMCS</span>
          </h2>
          <p className="section-subtitle">
            Conecta sistemas externos (WHMCS, ERPs, tiendas virtuales) para emitir facturas y boletas electrónicas unitarias o masivas de forma automatizada.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
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

      {/* Newly Generated Key Banner */}
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
              onClick={() => copyToClipboard(newlyCreatedKey.key, setCopiedKey)}
            >
              {copiedKey ? '¡Copiado!' : 'Copiar Clave'}
            </button>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconKey size={18} />
          <span>Tus Claves de Acceso API (Secret Keys)</span>
        </h3>

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
                    No tienes ninguna API Key activa. Haz clic en "Generar Nueva API Key" para empezar a conectar WHMCS o tu sistema externo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documentation & Integration Hub */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)' }}>
              Documentación de Integración & Sincronización
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Elige una de las guías de integración para tu arquitectura:
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${activeCodeTab === 'whmcs' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setActiveCodeTab('whmcs')}
            >
              🚀 Módulo WHMCS (Hook PHP)
            </button>
            <button
              type="button"
              className={`btn ${activeCodeTab === 'unitary' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setActiveCodeTab('unitary')}
            >
              📄 Emisión Unitaria (JSON)
            </button>
            <button
              type="button"
              className={`btn ${activeCodeTab === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setActiveCodeTab('batch')}
            >
              ⚡ Emisión Masiva (Batch)
            </button>
          </div>
        </div>

        {/* TAB 1: WHMCS Integration */}
        {activeCodeTab === 'whmcs' && (
          <div className="animate-fade-in">
            <div style={{ background: 'rgba(37, 99, 235, 0.04)', padding: '16px', borderRadius: '10px', marginBottom: '16px', borderLeft: '4px solid var(--primary)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                Instrucciones de Instalación en WHMCS:
              </h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Copia el script hook que ves a continuación.</li>
                <li>Pégalo en tu servidor WHMCS en la ruta: <code>/includes/hooks/sunat_billing.php</code></li>
                <li>Asegúrate de que tus clientes tengan su <strong>RUC o DNI</strong> en el campo de identificación o en sus datos de perfil.</li>
                <li>¡Listo! Cada vez que una orden sea pagada en WHMCS (evento <code>InvoicePaid</code>), el hook emitirá automáticamente el comprobante en SUNAT y anotará la serie y PDF en la factura de WHMCS.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => copyToClipboard(whmcsSampleHook, setCopiedWhmcsHook)}
              >
                {copiedWhmcsHook ? <IconCheck size={14} style={{ color: '#10b981' }} /> : <IconCopy size={14} />}
                <span>{copiedWhmcsHook ? '¡Hook Copiado!' : 'Copiar Script Hook PHP Completo'}</span>
              </button>
            </div>

            <pre style={{ margin: 0, padding: '16px', borderRadius: '8px', background: '#1e293b', color: '#f8fafc', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
              {whmcsSampleHook}
            </pre>
          </div>
        )}

        {/* TAB 2: Unitary Emission */}
        {activeCodeTab === 'unitary' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '12px' }}>
              <span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, marginRight: '8px' }}>POST</span>
              <code>{hostUrl}/api/v1/external/invoices</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => copyToClipboard(`curl -X POST "${hostUrl}/api/v1/external/invoices" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_TU_API_KEY" \\\n  -d '${JSON.stringify(JSON.parse(sampleUnitaryJson))}'`, setCopiedCurlUnit)}
              >
                {copiedCurlUnit ? <IconCheck size={14} style={{ color: '#10b981' }} /> : <IconCopy size={14} />}
                <span>{copiedCurlUnit ? '¡cURL Copiado!' : 'Copiar Ejemplo cURL'}</span>
              </button>
            </div>

            <pre style={{ margin: 0, padding: '16px', borderRadius: '8px', background: '#1e293b', color: '#f8fafc', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
              {sampleUnitaryJson}
            </pre>
          </div>
        )}

        {/* TAB 3: Batch Emission */}
        {activeCodeTab === 'batch' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '12px' }}>
              <span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, marginRight: '8px' }}>POST</span>
              <code>{hostUrl}/api/v1/external/invoices/batch</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => copyToClipboard(`curl -X POST "${hostUrl}/api/v1/external/invoices/batch" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_TU_API_KEY" \\\n  -d '${JSON.stringify(JSON.parse(sampleBatchJson))}'`, setCopiedCurlBatch)}
              >
                {copiedCurlBatch ? <IconCheck size={14} style={{ color: '#10b981' }} /> : <IconCopy size={14} />}
                <span>{copiedCurlBatch ? '¡cURL Copiado!' : 'Copiar Ejemplo cURL'}</span>
              </button>
            </div>

            <pre style={{ margin: 0, padding: '16px', borderRadius: '8px', background: '#1e293b', color: '#f8fafc', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
              {sampleBatchJson}
            </pre>
          </div>
        )}
      </div>

      {/* Modal Generate Key */}
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
                  placeholder="Ej. WHMCS Hosting, Tienda Web, ERP Odoo"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  autoFocus
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                  Este nombre te permitirá identificar qué sistema está usando esta clave.
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
