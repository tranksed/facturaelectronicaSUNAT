import React, { useState } from 'react';
import {
  IconBookOpen,
  IconShield,
  IconCheck,
  IconAlertTriangle,
  IconMail,
  IconBriefcase,
  IconBuilding,
  IconExternalLink
} from './Icons';

export default function GuiaIntegracion({ onNavigateToSettings, onNavigateToBuzon, onNavigateToSunafil }) {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="guia-integracion-container animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="settings-page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconBookOpen size={24} />
            <span>Guía Oficial de Integración SUNAT, Buzón SOL & SUNAFIL</span>
          </h1>
          <p className="page-subtitle">
            Paso a paso visual e interactivo para obtener tu Certificado Digital Tributario (.pfx), crear tu Usuario Secundario SOL y conectar tus servicios.
          </p>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <button 
            type="button" 
            className={`admin-tab-btn ${activeStep === 1 ? 'active' : ''}`}
            onClick={() => setActiveStep(1)}
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <span style={{ fontWeight: 800 }}>Paso 1:</span>
            <span>Certificado CDT (.pfx)</span>
          </button>

          <button 
            type="button" 
            className={`admin-tab-btn ${activeStep === 2 ? 'active' : ''}`}
            onClick={() => setActiveStep(2)}
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <span style={{ fontWeight: 800 }}>Paso 2:</span>
            <span>Usuario Secundario SOL</span>
          </button>

          <button 
            type="button" 
            className={`admin-tab-btn ${activeStep === 3 ? 'active' : ''}`}
            onClick={() => setActiveStep(3)}
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <span style={{ fontWeight: 800 }}>Paso 3:</span>
            <span>Buzón SOL & SUNAFIL</span>
          </button>

          <button 
            type="button" 
            className={`admin-tab-btn ${activeStep === 4 ? 'active' : ''}`}
            onClick={() => setActiveStep(4)}
            style={{ justifyContent: 'center', padding: '10px' }}
          >
            <span style={{ fontWeight: 800 }}>Paso 4:</span>
            <span>Errores Comunes SUNAT</span>
          </button>
        </div>
      </div>

      {/* STEP 1: CERTIFICADO DIGITAL CDT */}
      {activeStep === 1 && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🔑
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Paso 1: Obtener el Certificado Digital Tributario (.pfx / .p12)</h2>
              <span className="page-subtitle">SUNAT otorga este certificado de forma 100% gratuita con vigencia de 3 años para Mypes.</span>
            </div>
          </div>

          <div className="company-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Opción Gratuita SUNAT */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="status-pill prod">Gratuito SUNAT</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Para Mypes, RMT y Régimen General</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Requisitos: Ingresos anuales menores a 300 UIT (~S/ 1,545,000), RUC en estado Activo y Habido, y no tener sanciones de revocación.
              </p>

              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '12px', lineHeight: 1.6 }}>
                <strong>Ruta en SUNAT SOL:</strong><br/>
                1. Ingresa a <a href="https://www.sunat.gob.pe" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>SUNAT Operaciones en Línea</a> con tu RUC y Clave principal.<br/>
                2. Menú: <strong>Empresas</strong> ➔ <strong>Comprobantes de Pago</strong> ➔ <strong>Certificado Digital Tributario - CDT</strong>.<br/>
                3. Clic en: <strong>Solicitar Certificado Digital Tributario</strong>.<br/>
                4. Acepta los términos y condiciones.<br/>
                5. Ingresa una <strong>contraseña para el certificado</strong> (anótala, la necesitarás).<br/>
                6. Haz clic en <strong>Descargar</strong> (obtendrás un archivo <code>.pfx</code> o <code>.p12</code>).
              </div>
            </div>

            {/* Opción Certificado Comercial */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="status-pill warning">Comercial / Privado</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Grandes Empresas o Proveedores de Software</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Si tu empresa factura más de 300 UIT o ya posees un certificado digital emitido por entidades acreditadas ante INDECOPI (RENIEC, Llama.pe, Camerfirma, Avansi):
              </p>

              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '12px', lineHeight: 1.6 }}>
                <strong>Registro en SUNAT:</strong><br/>
                1. Entra a SUNAT SOL con tu RUC y clave maestra.<br/>
                2. Menú: <strong>Empresas</strong> ➔ <strong>Comprobantes de Pago</strong> ➔ <strong>Certificado Digital</strong>.<br/>
                3. Selecciona: <strong>Registrar Certificado Digital</strong>.<br/>
                4. Carga la clave pública (archivo <code>.cer</code>) para vincularlo a tu RUC.<br/>
                5. En nuestro sistema, subes el archivo completo <code>.pfx</code>.
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: 'var(--primary)', fontSize: '13px' }}>¿Ya tienes tu archivo .pfx descargado?</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Súbelo de inmediato en la configuración de tu empresa junto con la contraseña elegida.
              </div>
            </div>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={onNavigateToSettings}
            >
              Ir a "Mi Empresa" a Cargar Certificado →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: USUARIO SECUNDARIO SOL */}
      {activeStep === 2 && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              👤
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Paso 2: Crear el Usuario Secundario SOL para Facturación</h2>
              <span className="page-subtitle">SUNAT prohíbe el uso de la clave maestra del representante legal para envíos automatizados por seguridad.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>1</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Crear Usuario Secundario</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                En SUNAT SOL, haz clic en el nombre de tu empresa (arriba a la derecha), selecciona <strong>Administración de Usuarios Secundarios</strong> y haz clic en <strong>Crear Usuario</strong>. Ingresa el DNI del operador o un DNI autorizado.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>2</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Definir Usuario y Clave</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Asigna un nombre de usuario identificable (ej: <code>FACTURADOR</code> o <code>FACTURADOR01</code>) y una contraseña segura que contenga letras y números.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>3</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Asignar Permisos SEE</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Haz clic en <strong>Asignar Programas</strong> ➔ Despliega: <strong>Tributarios</strong> ➔ <strong>Comprobantes de Pago</strong> ➔ <strong>SEE - Desde los Sistemas del Contribuyente</strong>.
              </p>
            </div>
          </div>

          {/* Checklist de permisos obligatorios */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Casillas que DEBEN estar marcadas en SUNAT SOL:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Factura Electrónica y Notas Vinculadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Boleta de Venta y Notas Vinculadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Consultas de Validez de Comprobantes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Guía de Remisión Electrónica (GRE)</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button type="button" className="btn btn-primary" onClick={onNavigateToSettings}>
              Guardar Credenciales SOL en "Mi Empresa" →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: BUZON SOL & SUNAFIL */}
      {activeStep === 3 && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              📬
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Paso 3: Sincronización con Buzón SOL & Casilla SUNAFIL</h2>
              <span className="page-subtitle">¿Cómo se integran ambos servicios mediante la Clave SOL?</span>
            </div>
          </div>

          <div className="company-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Buzón SOL */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <IconMail size={18} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Buzón Electrónico SOL (SUNAT)</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                SUNAT notifica legalmente a las empresas depositando esquelas, cartas inductivas y resoluciones coactivas en su Buzón SOL. Según el Código Tributario, una notificación surte efecto al día hábil siguiente de su depósito, aunque no la hayas abierto.
              </p>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', margin: '12px 0' }}>
                ⚡ <strong>Consulta Masiva:</strong> Con este módulo puedes sincronizar en 1 segundo todas tus empresas y detectar plazos que vencen antes de que generen multas.
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onNavigateToBuzon}>
                Abrir Módulo Buzón SOL →
              </button>
            </div>

            {/* SUNAFIL */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <IconBriefcase size={18} style={{ color: '#0ea5e9' }} />
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Casilla Electrónica SUNAFIL</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                SUNAFIL utiliza la autenticación unificada del Estado con Clave SOL de SUNAT. En su Casilla Electrónica deposita órdenes de inspección laboral, requerimientos de comités de SST, planillas y horas extras con plazos improrrogables de 3 a 5 días hábiles.
              </p>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', margin: '12px 0' }}>
                🛡️ <strong>Prevención de Multas:</strong> Nuestro módulo consolida los expedientes de todas tus empresas e indica claramente la materia y los días para responder.
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onNavigateToSunafil}>
                Abrir Módulo Casilla SUNAFIL →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CODIGOS DE ERROR FRECUENTES */}
      {activeStep === 4 && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--error-subtle)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              ⚠️
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Paso 4: Solución a Códigos de Error Frecuentes de SUNAT</h2>
              <span className="page-subtitle">Guía de resolución instantánea para los códigos de error más comunes al emitir comprobantes.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Error 1033 */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="status-pill error" style={{ fontWeight: 800 }}>Error 1033</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>El certificado digital no corresponde al RUC emisor</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                <strong>Causa:</strong> El archivo <code>.pfx</code> cargado pertenece a otro RUC o empresa, o se ingresó un RUC diferente al del titular del certificado.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                ✓ Solución: Ve a "Mi Empresa", verifica que el RUC coincida exactamente con el del CDT y vuelve a subir el certificado correspondiente.
              </div>
            </div>

            {/* Error 1034 */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="status-pill error" style={{ fontWeight: 800 }}>Error 1034</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>El usuario secundario no tiene permisos SEE</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                <strong>Causa:</strong> El usuario SOL secundario fue creado pero no se le asignó el perfil "SEE - Sistemas del Contribuyente".
              </p>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                ✓ Solución: Entra a SUNAT SOL ➔ Usuarios Secundarios ➔ Asignar Programas ➔ Marca las casillas de Factura, Boleta y Consultas de Validez.
              </div>
            </div>

            {/* Error 0306 */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="status-pill warning" style={{ fontWeight: 800 }}>Error 0306</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Certificado revocado o fecha caducada</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                <strong>Causa:</strong> Los certificados CDT de SUNAT tienen 3 años de vigencia. Una vez cumplidos, deben renovarse.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                ✓ Solución: Solicita un nuevo CDT gratuito en SUNAT SOL y cárgalo en la pestaña "Mi Empresa".
              </div>
            </div>

            {/* Error 2324 */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="status-pill warning" style={{ fontWeight: 800 }}>Error 2324</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>El monto total del comprobante difiere de la sumatoria</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                <strong>Causa:</strong> Descuadre de centavos por redondeo de IGV (18%). Nuestro sistema calcula los totales con redondeo bancario de 2 decimales para evitar este rechazo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
