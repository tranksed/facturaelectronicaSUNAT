import React, { useState } from 'react';
import { IconKey, IconLock } from './Icons';

export default function ChangePasswordModal({ isOpen, onClose, API_URL, authToken, currentUser, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Por favor, ingresa tu contraseña actual.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (onSuccess) {
          onSuccess(data.message || 'Contraseña actualizada exitosamente.');
        }
        handleClose();
      } else {
        setError(data.error || 'Error al cambiar la contraseña.');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '440px' }}>
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
                Cambiar Contraseña
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {currentUser?.name || currentUser?.email}
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

        <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '18px', lineHeight: 1.5 }}>
          Por seguridad, introduce tu contraseña actual antes de establecer la nueva clave de acceso.
        </p>

        {error && (
          <div className="login-error-alert" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group-field" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Contraseña Actual</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPasswords ? 'text' : 'password'}
                className="input-field"
                placeholder="Tu contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group-field" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPasswords ? 'text' : 'password'}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group-field" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Confirmar Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPasswords ? 'text' : 'password'}
                className="input-field"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Mostrar contraseñas
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
              <span>{loading ? 'Actualizando...' : 'Guardar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
