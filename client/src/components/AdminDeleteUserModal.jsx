import React, { useState } from 'react';
import { IconTrash } from './Icons';

export default function AdminDeleteUserModal({ isOpen, onClose, user, API_URL, authToken, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/superadmin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (onSuccess) {
          onSuccess(data.message || `Usuario ${user.name || user.email} eliminado.`);
        }
        handleClose();
      } else {
        setError(data.error || 'Error al eliminar el usuario.');
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
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--error-subtle)',
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconTrash size={18} />
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: '18px', color: 'var(--error)' }}>
                Eliminar Cuenta de Usuario
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Acción Destructiva Irreversible
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="apisunat-remove-btn" 
            onClick={handleClose}
            style={{ fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="login-error-alert" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{
          padding: '14px',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{user.name || 'Sin Nombre'}</strong>
            <span className={`user-role-tag ${user.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`}>
              {user.role === 'SUPERADMIN' ? 'Super Admin' : 'Inquilino'}
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{user.email}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Empresas asociadas: <strong>{user.companiesCount || user.companies?.length || 0}</strong> • Comprobantes: <strong>{user.invoicesCount || 0}</strong>
          </div>
        </div>

        <div style={{
          background: 'var(--error-subtle)',
          border: '1px solid var(--error-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          color: 'var(--error)',
          fontSize: '12.5px',
          lineHeight: 1.45,
          marginBottom: '18px'
        }}>
          ⚠️ <strong>Advertencia Crítica:</strong> Al eliminar esta cuenta, se borrarán permanentemente todas las empresas (RUC) registradas bajo este usuario, así como todos sus comprobantes de pago emitidos y certificados digitales asociados.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading}
            style={{
              background: 'var(--error)',
              color: 'white',
              borderColor: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconTrash size={15} />
            <span>{loading ? 'Eliminando...' : 'Sí, Eliminar Cuenta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
