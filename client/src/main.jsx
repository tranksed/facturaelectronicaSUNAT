import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error Boundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f19',
          color: '#eef0ff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: '#15172b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '42px', marginBottom: '14px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#fff', fontWeight: 700 }}>
              Ocurrió un error al cargar la aplicación
            </h2>
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#959bbd', lineHeight: '1.5' }}>
              Se detectó un conflicto inesperado. Puedes intentar recargar la página o restablecer la sesión temporal en caché.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f87171',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '22px',
                maxHeight: '120px',
                fontFamily: 'monospace'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🔄 Recargar Página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'transparent',
                  color: '#959bbd',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🧹 Limpiar Caché y Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
