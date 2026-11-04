import React, { useState, useEffect } from 'react';
import { IconCrown, IconCheck, LoaderCircleIcon } from './Icons';

export default function AdminUserPlanModal({ isOpen, onClose, user, plans = [], API_URL, authToken, onSuccess }) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [docsIssuedCount, setDocsIssuedCount] = useState(0);
  const [resetDocs, setResetDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setSelectedPlanId(user.planId || (plans[0]?.id || ''));
      if (user.planExpiresAt) {
        setCustomExpiresAt(new Date(user.planExpiresAt).toISOString().split('T')[0]);
      } else {
        setCustomExpiresAt('');
      }
      setDocsIssuedCount(user.docsIssuedCount || 0);
      setResetDocs(false);
      setError(null);
    }
  }, [user, plans, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/superadmin/plans/users/${user.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          planExpiresAt: customExpiresAt ? new Date(customExpiresAt).toISOString() : null,
          resetCount: resetDocs,
          docsIssuedCount: resetDocs ? 0 : parseInt(docsIssuedCount, 10)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onSuccess) onSuccess(data.message);
        onClose();
      } else {
        setError(data.error || 'Error al actualizar suscripción.');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCrown size={20} style={{ color: '#f59e0b' }} />
            <span>Asignar / Modificar Plan de Cliente</span>
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

        <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group-field">
            <label className="form-label">Plan Comercial Asignado</label>
            <select 
              className="input-field"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              required
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - S/. {p.price} ({p.docLimit === -1 ? 'Docs Ilimitados' : `${p.docLimit} docs`} • {p.userLimit} usuarios)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-field">
            <label className="form-label">Fecha de Vencimiento de Suscripción</label>
            <input 
              type="date"
              className="input-field"
              value={customExpiresAt}
              onChange={(e) => setCustomExpiresAt(e.target.value)}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Dejar vacío para suscripción perpetua o sin vencimiento automático.
            </small>
          </div>

          <div className="form-group-field">
            <label className="form-label">Comprobantes Emitidos este Período</label>
            <input 
              type="number"
              min="0"
              className="input-field"
              value={docsIssuedCount}
              onChange={(e) => setDocsIssuedCount(e.target.value)}
              disabled={resetDocs}
            />
          </div>

          <div style={{ margin: '10px 0 16px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={resetDocs}
                onChange={(e) => setResetDocs(e.target.checked)}
              />
              Reiniciar contador de comprobantes emitidos a 0
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
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
