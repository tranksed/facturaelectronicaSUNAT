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
  const [durationDays, setDurationDays] = useState('30');
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
      setDurationDays(String(plan.durationDays ?? 30));
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
      setDurationDays('30');
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
      durationDays: parseInt(durationDays, 10),
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
              <label className="form-label">Límite Docs (-1=Ilimitado)</label>
              <input 
                type="number" 
                className="input-field" 
                value={docLimit} 
                onChange={(e) => setDocLimit(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Límite Usuarios</label>
              <input 
                type="number" 
                min="1" 
                className="input-field" 
                value={userLimit} 
                onChange={(e) => setUserLimit(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
