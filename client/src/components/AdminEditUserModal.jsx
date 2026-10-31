import React, { useState, useEffect } from 'react';
import { IconEdit, IconCheck } from './Icons';

export default function AdminEditUserModal({ isOpen, onClose, user, API_URL, authToken, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || 'USER');
      setStatus(user.status || 'ACTIVE');
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Nombre y correo electrónico son requeridos.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/superadmin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          status
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (onSuccess) {
          onSuccess(data.message || 'Usuario actualizado correctamente.');
        }
        onClose();
      } else {
        setError(data.error || 'Error al actualizar usuario.');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '480px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconEdit size={18} />
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: '18px' }}>
                Editar Cuenta de Usuario
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {user.email}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="apisunat-remove-btn" 
            onClick={onClose}
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

        <form onSubmit={handleSubmit}>
          <div className="form-group-field" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Nombre Completo o Razón Social</label>
            <input 
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group-field" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Correo Electrónico (Login)</label>
            <input 
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div className="form-group-field">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Rol en la Plataforma</label>
              <select 
                className="select-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="USER">Inquilino (Cliente)</option>
                <option value="SUPERADMIN">Super Administrador</option>
              </select>
            </div>

            <div className="form-group-field">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Estado de Acceso</label>
              <select 
                className="select-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconCheck size={15} />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
