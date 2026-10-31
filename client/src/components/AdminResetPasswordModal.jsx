import React, { useState } from 'react';
import { IconKey, IconLock, IconRefresh } from './Icons';

export default function AdminResetPasswordModal({ isOpen, onClose, user, API_URL, authToken, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.trim().length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/superadmin/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (onSuccess) {
          onSuccess(data.message || `Contraseña actualizada para ${user.name || user.email}`);
        }
        handleClose();
      } else {
        setError(data.error || 'Error al actualizar la contraseña del usuario.');
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
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconKey size={18} />
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: '18px' }}>
                Restablecer Contraseña
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Panel de Super Admin
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

        {/* User Card info */}
        <div style={{
          padding: '12px 14px',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{user.name || 'Sin Nombre'}</strong>
            <span className={`user-role-tag ${user.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`} style={{ fontSize: '10.5px' }}>
              {user.role === 'SUPERADMIN' ? 'Super Admin' : 'Inquilino'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '16px', lineHeight: 1.5 }}>
          Ingresa la nueva clave que utilizará este cliente para iniciar sesión en su panel:
        </p>

        {error && (
          <div className="login-error-alert" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group-field" style={{ marginBottom: '14px' }}>
            <div className="flex-between" style={{ marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>Nueva Contraseña</label>
              <button 
                type="button"
                className="action-icon-btn"
                onClick={handleGeneratePassword}
                style={{ fontSize: '11px', padding: '3px 8px' }}
                title="Generar contraseña segura aleatoria"
              >
                <IconRefresh size={11} />
                <span>Generar Aleatoria</span>
              </button>
            </div>
            <input 
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group-field" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Confirmar Contraseña</label>
            <input 
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Mostrar contraseña
            </label>
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
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconLock size={15} />
              <span>{loading ? 'Guardando...' : 'Asignar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
