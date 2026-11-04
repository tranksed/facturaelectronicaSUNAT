import React, { useState, useEffect } from 'react';
import {
  IconUsers,
  IconShield,
  IconPlus,
  IconTrash,
  IconEdit,
  IconLock,
  IconCheck,
  IconAlertTriangle,
  LoaderCircleIcon
} from './Icons';

export default function TenantUsersPanel({ API_URL, authToken, currentUser, onOpenUpgradePlan }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantRole, setTenantRole] = useState('CONTADOR');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/tenant/users`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      } else {
        setError(resData.error || 'Error al cargar miembros del equipo');
      }
    } catch (e) {
      setError('Error de conexión: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/tenant/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, email, password, tenantRole })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showMsg(resData.message);
        setIsCreateOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        setTenantRole('CONTADOR');
        fetchUsers();
      } else {
        showMsg(resData.error || 'Error al crear usuario', 'error');
      }
    } catch (e) {
      showMsg('Error de conexión al crear usuario: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userName}? Perderá inmediatamente el acceso a la cuenta.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/tenant/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const resData = await res.json();
      if (res.ok) {
        showMsg(resData.message);
        fetchUsers();
      } else {
        showMsg(resData.error || 'Error al eliminar usuario', 'error');
      }
    } catch (e) {
      showMsg('Error al eliminar: ' + e.message, 'error');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="status-badge" style={{ background: '#f3e8ff', color: '#7e22ce' }}>👑 Propietario</span>;
      case 'SUBADMIN':
        return <span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>🛡️ Sub-administrador</span>;
      case 'CONTADOR':
        return <span className="status-badge" style={{ background: '#dcfce7', color: '#15803d' }}>📊 Contador</span>;
      case 'OPERADOR':
        return <span className="status-badge" style={{ background: '#fef3c7', color: '#b45309' }}>⚡ Operador de Ventas</span>;
      default:
        return <span className="status-badge">{role}</span>;
    }
  };

  return (
    <div className="section-container animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconUsers size={24} />
            <span>Gestión de Equipo & Multi-Usuarios</span>
          </h2>
          <p className="section-subtitle">
            Crea cuentas de acceso para tu contador, administradores y operadores de facturación según la cuota de tu plan.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
          disabled={data?.isLimitReached}
          title={data?.isLimitReached ? 'Límite de usuarios alcanzado' : 'Invitar nuevo usuario'}
        >
          <IconPlus size={16} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {message && (
        <div className={`alert-banner ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ margin: '14px 0' }}>
          {message.text}
        </div>
      )}

      {/* Plan Quota Card */}
      {data && (
        <div className="glass-card" style={{ padding: '18px 22px', margin: '16px 0', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Suscripción Activa</div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: 'var(--text-primary)' }}>
                {data.planName}
              </h3>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Usuarios en Uso</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: data.isLimitReached ? '#ef4444' : 'var(--primary)' }}>
                {data.totalUsers} / {data.userLimit} usuarios
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'var(--border-color, #e2e8f0)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
            <div 
              style={{ 
                width: `${Math.min(100, (data.totalUsers / data.userLimit) * 100)}%`, 
                height: '100%', 
                background: data.isLimitReached ? '#ef4444' : 'var(--primary)',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>

          {data.isLimitReached && (
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#b91c1c' }}>
                ⚠️ Has alcanzado el límite máximo de {data.userLimit} usuario(s) de tu plan actual.
              </span>
              {onOpenUpgradePlan && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                  onClick={onOpenUpgradePlan}
                >
                  Mejorar Plan
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="table-container" style={{ marginTop: '18px' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Rol en el Tenant</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Owner Row */}
            {data?.owner && (
              <tr style={{ background: 'rgba(37, 99, 235, 0.03)' }}>
                <td>
                  <strong style={{ color: 'var(--text-primary)' }}>{data.owner.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Titular de la Cuenta</span>
                </td>
                <td>{data.owner.email}</td>
                <td>{getRoleBadge('ADMIN')}</td>
                <td><span className="status-badge status-accepted">ACTIVO</span></td>
                <td>Titular</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Principal
                </td>
              </tr>
            )}

            {/* Sub-users */}
            {data?.subUsers && data.subUsers.length > 0 ? (
              data.subUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{getRoleBadge(u.tenantRole)}</td>
                  <td>
                    <span className={`status-badge ${u.status === 'ACTIVE' ? 'status-accepted' : 'status-rejected'}`}>
                      {u.status === 'ACTIVE' ? 'ACTIVO' : 'SUSPENDIDO'}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-action-icon btn-action-delete"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      title="Eliminar usuario"
                    >
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                  Aún no has agregado usuarios adicionales a tu equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Create Sub-user */}
      {isCreateOpen && (
        <div className="login-modal-overlay">
          <div className="login-modal-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                Invitar Nuevo Miembro al Equipo
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group-field">
                <label className="form-label">Nombre Completo</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Ej. Roberto Sánchez (Contador)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-field">
                <label className="form-label">Correo Electrónico (Acceso)</label>
                <input 
                  type="email"
                  className="input-field"
                  placeholder="contador@miempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-field">
                <label className="form-label">Contraseña de Acceso</label>
                <input 
                  type="password"
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group-field">
                <label className="form-label">Rol y Permisos</label>
                <select 
                  className="input-field"
                  value={tenantRole}
                  onChange={(e) => setTenantRole(e.target.value)}
                >
                  <option value="CONTADOR">📊 Contador (Descarga de XML/CDR, Reportes y Buzón SOL)</option>
                  <option value="OPERADOR">⚡ Operador (Emisión rápida de Facturas y Boletas)</option>
                  <option value="SUBADMIN">🛡️ Sub-administrador (Emisión y Configuración general)</option>
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                  El usuario podrá ingresar con su correo y contraseña directamente en la plataforma.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
