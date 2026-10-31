import React, { useState } from 'react';
import {
  IconShield,
  IconUser,
  IconCheck,
  IconDownload,
  IconExternalLink
} from './Icons';

export default function SunatGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('cert'); // 'cert' | 'sol' | 'env' | 'errors'

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="login-modal-card" style={{ maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="flex-between" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🇵🇪</span>
              <span>Guía Oficial: Sincronización con SUNAT</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Aprende paso a paso dónde y cómo obtener tu Certificado Digital y Usuario Secundario SOL.
            </p>
          </div>
          <button 
            type="button" 
            className="apisunat-remove-btn" 
            onClick={onClose}
            style={{ fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card-subtle)', padding: '4px', borderRadius: '8px', marginBottom: '16px', overflowX: 'auto' }}>
          <button 
            type="button" 
            className={`admin-tab-btn ${activeTab === 'cert' ? 'active' : ''}`}
            onClick={() => setActiveTab('cert')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            🔏 1. Certificado Digital
          </button>
          <button 
            type="button" 
            className={`admin-tab-btn ${activeTab === 'sol' ? 'active' : ''}`}
            onClick={() => setActiveTab('sol')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            👤 2. Usuario Secundario SOL
          </button>
          <button 
            type="button" 
            className={`admin-tab-btn ${activeTab === 'env' ? 'active' : ''}`}
            onClick={() => setActiveTab('env')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            🧪 3. Beta vs Producción
          </button>
          <button 
            type="button" 
            className={`admin-tab-btn ${activeTab === 'errors' ? 'active' : ''}`}
            onClick={() => setActiveTab('errors')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            ⚠️ 4. Errores Frecuentes
          </button>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '6px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
          
          {/* TAB 1: CERTIFICADO DIGITAL */}
          {activeTab === 'cert' && (
            <div className="animate-fade-in">
              <div style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                  💡 ¿Qué es el Certificado Digital?
                </strong>
                Es un archivo con extensión <code>.pfx</code> o <code>.p12</code> que contiene la firma electrónica de tu empresa. Con él se firma cada XML emitido (UBL 2.1) para que SUNAT lo valide con valor legal.
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Opción A: Certificado Digital Gratuito de SUNAT (Para Mypes)
              </h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Si estás en el Régimen MYPE Tributario, Especial o General con ventas menores a 300 UIT anuales, SUNAT te entrega un <strong>certificado digital gratuito por 3 años</strong>:
              </p>

              <ol style={{ paddingLeft: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Ingresa al portal de SUNAT: <strong>www.sunat.gob.pe</strong> &gt; <strong>Operaciones en Línea (SOL)</strong>.</li>
                <li>Inicia sesión con tu <strong>RUC</strong>, <strong>Usuario</strong> y <strong>Clave SOL</strong> principal.</li>
                <li>Navega por la ruta: <strong>Empresas</strong> &gt; <strong>Comprobantes de Pago</strong> &gt; <strong>Certificado Digital Tributario - CDT</strong> &gt; <strong>Solicitar CDT</strong>.</li>
                <li>Acepta los términos y condiciones de RENIEC/SUNAT.</li>
                <li>
                  <strong>Define una contraseña para el certificado:</strong>
                  <br />
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                    ⚠️ Guarda muy bien esta contraseña, la ingresarás en la plataforma en "Contraseña del Certificado".
                  </span>
                </li>
                <li>Haz clic en <strong>Generar Certificado</strong> y descárgalo (archivo <code>.pfx</code> o <code>.p12</code>).</li>
              </ol>

              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Opción B: Certificado Comercial Privado
              </h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Si tu empresa supera las 300 UIT, puedes adquirir un certificado digital en formato software PKCS#12 con entidades autorizadas por INDECOPI como <em>Reniec, Llama.pe, Camerfirma o Avansi</em>, y luego registrarlo en SUNAT SOL en: <strong>Empresas &gt; Comprobantes de Pago &gt; Certificado Digital &gt; Registrar Certificado Digital</strong>.
              </p>
            </div>
          )}

          {/* TAB 2: USUARIO SECUNDARIO SOL */}
          {activeTab === 'sol' && (
            <div className="animate-fade-in">
              <div style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '4px' }}>
                  ⚠️ Regla de Seguridad SUNAT:
                </strong>
                <strong>Nunca</strong> uses tu usuario y clave SOL principal. Debes crear un <strong>Usuario Secundario</strong> exclusivo para facturación electrónica.
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Procedimiento para crear el Usuario Secundario:
              </h4>

              <ol style={{ paddingLeft: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Ingresa a <strong>SUNAT Operaciones en Línea (SOL)</strong> con tu clave principal.</li>
                <li>Haz clic sobre el <strong>Nombre de tu Empresa / Razón Social</strong> (arriba a la derecha).</li>
                <li>Selecciona <strong>Administración de Usuarios Secundarios</strong> &gt; clic en <strong>Crear Usuario</strong>.</li>
                <li>Ingresa el DNI del operador o administrador y escribe un nombre de usuario (ej: <code>FACTURADOR</code> o <code>MODDATOS</code>).</li>
                <li>Crea una <strong>Clave SOL</strong> para este usuario (mínimo 8 caracteres con letras y números).</li>
                <li>Haz clic en <strong>Siguiente</strong> &gt; clic en <strong>Asignar Programas</strong>.</li>
                <li>
                  Despliega: <strong>Tributarios</strong> &gt; <strong>Comprobantes de Pago</strong> &gt; <strong>SEE - Desde los Sistemas del Contribuyente</strong>.
                </li>
                <li>
                  <strong>Marca las siguientes casillas obligatorias:</strong>
                  <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                    <li>✓ <strong>Factura Electrónica y Notas Vinculadas</strong></li>
                    <li>✓ <strong>Boleta de Venta Electrónica y Notas Vinculadas</strong></li>
                    <li>✓ <strong>Consultas de Validez de Comprobantes de Pago</strong></li>
                    <li>✓ <strong>Guía de Remisión Electrónica</strong> (si aplica)</li>
                  </ul>
                </li>
                <li>Haz clic en <strong>Siguiente</strong> y luego en <strong>Grabar</strong>.</li>
              </ol>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                ℹ️ <strong>En la plataforma:</strong> En el campo <em>Usuario Secundario SOL</em>, solo debes colocar el usuario creado (ej: <code>FACTURADOR</code>). La plataforma le antepone automáticamente tu número de RUC al comunicarse con SUNAT.
              </div>
            </div>
          )}

          {/* TAB 3: BETA VS PRODUCCION */}
          {activeTab === 'env' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card-subtle)' }}>
                  <span className="status-pill beta" style={{ marginBottom: '8px', display: 'inline-block' }}>Entorno BETA (Pruebas)</span>
                  <p style={{ margin: '6px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Para probar que el sistema emite, firma y genera el QR sin valor legal.
                  </p>
                  <ul style={{ paddingLeft: '16px', fontSize: '12px', margin: 0 }}>
                    <li>Usuario SOL: <code>MODDATOS</code></li>
                    <li>Clave SOL: <code>moddatos</code></li>
                    <li>No afecta impuestos ni Renta.</li>
                  </ul>
                </div>

                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--success)', background: 'var(--success-subtle)' }}>
                  <span className="status-pill prod" style={{ marginBottom: '8px', display: 'inline-block' }}>Entorno PRODUCCIÓN REAL</span>
                  <p style={{ margin: '6px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Para comprobantes legales y oficiales para tus clientes comerciales.
                  </p>
                  <ul style={{ paddingLeft: '16px', fontSize: '12px', margin: 0 }}>
                    <li>Usuario: Tu usuario secundario real</li>
                    <li>Clave: Tu clave SOL secundaria real</li>
                    <li>Certificado .pfx real de tu empresa.</li>
                  </ul>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                🧪 ¿Cómo probar la conexión antes de emitir?
              </h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                En la pestaña <strong>Mi Empresa</strong>, tras subir tu certificado y credenciales, presiona el botón <strong>"🧪 Probar Conexión SUNAT"</strong>. La plataforma verificará la desencriptación del certificado y realizará un saludo SOAP a los servidores de SUNAT para confirmar que el usuario y clave estén autorizados.
              </p>
            </div>
          )}

          {/* TAB 4: ERRORES FRECUENTES */}
          {activeTab === 'errors' && (
            <div className="animate-fade-in">
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
                Códigos de Error Comunes devueltos por SUNAT:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--error)' }}>Error 0102 / 1034:</strong> <em>El usuario o clave SOL son incorrectos</em>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Verifica que el usuario secundario esté activo en SUNAT SOL y escribe nuevamente la clave sin espacios.
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--error)' }}>Error 1033:</strong> <em>El usuario no tiene acceso al servicio</em>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    El usuario secundario fue creado pero le falta marcar los permisos de <em>SEE - Desde los Sistemas del Contribuyente</em> en SUNAT SOL.
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--error)' }}>Error 0306 / 2153:</strong> <em>Error al desencriptar / leer certificado</em>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    La contraseña ingresada para el archivo <code>.pfx</code> no coincide con la contraseña con la que se descargó.
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--success)' }}>Códigos 0100 a 0199:</strong> <em>Aceptado con observaciones</em>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    El comprobante <strong>ha sido ACEPTADO y tiene validez legal plena</strong>, pero SUNAT informa una advertencia secundaria (ej: formato de dirección o código postal).
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Manual en VPS: <code>/var/www/facturador-sunat/MANUAL_INTEGRACION_SUNAT.md</code>
          </span>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onClose}
          >
            <IconCheck size={14} />
            <span>Entendido, Cerrar Guía</span>
          </button>
        </div>

      </div>
    </div>
  );
}
