import React, { useState, useEffect } from 'react';
import { IconCrown, IconCheck, LoaderCircleIcon } from './Icons';

export default function AdminPlanModal({ isOpen, onClose, plan, API_URL, authToken, onSuccess }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('PEN');
  const [docLimit, setDocLimit] = useState('30');
  const [userLimit, setUserLimit] = useState('1');
  const [companyLimit, setCompanyLimit] = useState('1');
  const [durationDays, setDurationDays] = useState('30');
  const [hasTelegramBot, setHasTelegramBot] = useState(true);
  const [hasExternalApi, setHasExternalApi] = useState(true);
  const [hasBuzonSol, setHasBuzonSol] = useState(true);
  const [featuresText, setFeaturesText] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (plan) {
      setName(plan.name || '');
      setCode(plan.code || '');
      setDescription(plan.description || '');
      setPrice(String(plan.price ?? 0));
      setCurrency(plan.currency || 'PEN');
      setDocLimit(String(plan.docLimit ?? 30));
      setUserLimit(String(plan.userLimit ?? 1));
      setCompanyLimit(String(plan.companyLimit ?? 1));
      setDurationDays(String(plan.durationDays ?? 30));
      setHasTelegramBot(plan.hasTelegramBot !== false);
      setHasExternalApi(plan.hasExternalApi !== false);
      setHasBuzonSol(plan.hasBuzonSol !== false);
      const feats = Array.isArray(plan.features) ? plan.features.join('\n') : '';
      setFeaturesText(feats);
      setIsPopular(!!plan.isPopular);
      setIsActive(plan.isActive !== false);
      setOrder(String(plan.order ?? 0));
    } else {
      setName('');
      setCode('');
      setDescription('');
      setPrice('0');
      setCurrency('PEN');
      setDocLimit('30');
      setUserLimit('1');
      setCompanyLimit('1');
      setDurationDays('30');
      setHasTelegramBot(true);
      setHasExternalApi(true);
      setHasBuzonSol(true);
      setFeaturesText('');
      setIsPopular(false);
      setIsActive(true);
      setOrder('0');
    }
    setError(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del plan es obligatorio.');
      return;
    }
    if (!code.trim()) {
      setError('El código único del plan es obligatorio.');
      return;
    }

    setLoading(true);

    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      currency,
      docLimit: parseInt(docLimit, 10),
      userLimit: parseInt(userLimit, 10),
      companyLimit: parseInt(companyLimit, 10) || 1,
      durationDays: parseInt(durationDays, 10),
      hasTelegramBot,
      hasExternalApi,
      hasBuzonSol,
      features,
      isPopular,
      isActive,
      order: parseInt(order, 10) || 0
    };

    const endpoint = plan ? `/api/superadmin/plans/${plan.id}` : '/api/superadmin/plans';
    const method = plan ? 'PUT' : 'POST';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onSuccess) onSuccess(plan ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.');
        onClose();
      } else {
        setError(data.error || 'Ocurrió un error al guardar el plan.');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCrown size={20} style={{ color: '#f59e0b' }} />
            <span>{plan ? 'Editar Plan Comercial' : 'Crear Nuevo Plan de Cobro'}</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert-banner alert-error" style={{ marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group-field">
              <label className="form-label">Nombre del Plan</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Plan Emprendedor" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Código Único (Letras/Números)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="EMPRENDEDOR" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
                disabled={!!plan}
                required 
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="form-label">Descripción Breve</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ideal para pequeñas empresas en expansión..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            <div className="form-group-field">
              <label className="form-label">Precio (S/.)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input-field" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Docs/Mes (-1=∞)</label>
              <input 
                type="number" 
                className="input-field" 
                value={docLimit} 
                onChange={(e) => setDocLimit(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Usuarios</label>
              <input 
                type="number" 
                min="1" 
                className="input-field" 
                value={userLimit} 
                onChange={(e) => setUserLimit(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">RUCs (-1=∞)</label>
              <input 
                type="number" 
                className="input-field" 
                value={companyLimit} 
                onChange={(e) => setCompanyLimit(e.target.value)} 
                title="-1 para permitir empresas ilimitadas (Multi-RUC)"
                required 
              />
            </div>
          </div>

          {/* Módulos y Funcionalidades Incluidas */}
          <div style={{ margin: '14px 0', padding: '12px 14px', background: 'var(--bg-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              🎯 Módulos y Funcionalidades Activas en este Plan:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={true} disabled={true} />
                <span>🌐 Facturación Web SUNAT (Base)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={hasTelegramBot} 
                  onChange={(e) => setHasTelegramBot(e.target.checked)} 
                />
                <span style={{ fontWeight: hasTelegramBot ? 600 : 400, color: hasTelegramBot ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  🤖 Bot de Telegram Oficial
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={hasExternalApi} 
                  onChange={(e) => setHasExternalApi(e.target.checked)} 
                />
                <span style={{ fontWeight: hasExternalApi ? 600 : 400, color: hasExternalApi ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  🔌 API Externa REST (POS/Odoo/Apps)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={hasBuzonSol} 
                  onChange={(e) => setHasBuzonSol(e.target.checked)} 
                />
                <span style={{ fontWeight: hasBuzonSol ? 600 : 400, color: hasBuzonSol ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  📬 Buzón SOL & Casilla SUNAFIL
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group-field">
              <label className="form-label">Duración (Días)</label>
              <input 
                type="number" 
                min="1" 
                className="input-field" 
                value={durationDays} 
                onChange={(e) => setDurationDays(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Orden de Visualización</label>
              <input 
                type="number" 
                className="input-field" 
                value={order} 
                onChange={(e) => setOrder(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="form-label">Características (Una por línea)</label>
            <textarea 
              className="input-field" 
              rows={4} 
              placeholder="Hasta 300 comprobantes / mes&#10;3 Usuarios (Admin, Contador, Operador)&#10;API Externa para WHMCS&#10;Buzón SOL & SUNAFIL prioritario" 
              value={featuresText} 
              onChange={(e) => setFeaturesText(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', margin: '12px 0 16px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isPopular} 
                onChange={(e) => setIsPopular(e.target.checked)} 
              />
              Destacar como "Más Popular" ⭐
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)} 
              />
              Plan Activo (Visible para clientes)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircleIcon className="animate-spin" size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Plan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
