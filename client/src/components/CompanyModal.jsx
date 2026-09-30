import React, { useState } from 'react';

export default function CompanyModal({ isOpen, onClose, onCompanyCreated, API_URL, authToken }) {
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLookupRuc = async () => {
    const cleanRuc = ruc.trim();
    if (cleanRuc.length !== 11) {
      setError('Ingresa un RUC válido de 11 dígitos para consultar.');
      return;
    }

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/consultar/6/${cleanRuc}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRazonSocial(data.nombre || '');
        setNombreComercial(data.nombre || '');
        setDireccion(data.direccion || '');
      } else {
        setError(data.error || 'No se encontraron datos para este RUC en SUNAT.');
      }
    } catch (e) {
      setError('Error al consultar el RUC: ' + e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ruc: ruc.trim(),
          razonSocial,
          nombreComercial,
          direccion,
          contacto
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onCompanyCreated(data.company);
        onClose();
      } else {
        setError(data.error || 'Error al crear la empresa.');
      }
    } catch (err) {
      setError('Error de red al crear empresa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '520px' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h2 className="card-title" style={{ margin: 0, fontSize: '20px' }}>
            🏢 Registrar Nueva Empresa
          </h2>
          <button 
            type="button" 
            className="apisunat-remove-btn" 
            onClick={onClose}
            style={{ fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Puedes gestionar múltiples empresas (RUC) bajo una sola cuenta. Cada empresa tiene sus propias series, comprobantes y certificado digital.
        </p>

        {error && (
          <div className="login-error-alert" style={{ marginBottom: '15px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group-field">
            <label className="form-label">Número de RUC (11 dígitos)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                className="input-field"
                placeholder="20600000000"
                value={ruc}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 11);
                  setRuc(val);
                  if (val.length === 11) {
                    // Auto-lookup
                    handleLookupRuc();
                  }
                }}
                required
              />
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleLookupRuc}
                disabled={lookupLoading}
                title="Consultar en SUNAT"
                style={{ flexShrink: 0 }}
              >
                {lookupLoading ? '⌛' : '🔍 SUNAT'}
              </button>
            </div>
          </div>

          <div className="form-group-field">
            <label className="form-label">Razón Social</label>
            <input 
              type="text"
              className="input-field"
              placeholder="Razón Social según Ficha RUC"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              required
            />
          </div>

          <div className="form-group-field">
            <label className="form-label">Nombre Comercial</label>
            <input 
              type="text"
              className="input-field"
              placeholder="Marca o Nombre Comercial"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
            />
          </div>

          <div className="form-group-field">
            <label className="form-label">Dirección Fiscal</label>
            <input 
              type="text"
              className="input-field"
              placeholder="Dirección Fiscal de la Empresa"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              required
            />
          </div>

          <div className="form-group-field">
            <label className="form-label">Contacto (Email / Teléfono)</label>
            <input 
              type="text"
              className="input-field"
              placeholder="contacto@empresa.com - 999888777"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
          </div>

          <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Guardando...' : '🏢 Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
