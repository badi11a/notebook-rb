'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-tertiary)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 24px',
        border: '0.5px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginBottom: '12px',
        }}>
          Balance Master
        </div>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--red-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '20px', color: 'var(--red-text)' }} />
        </div>
        <div style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
          Algo salió mal
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {error.message || 'Error inesperado. Intenta nuevamente.'}
        </div>
        <button
          onClick={reset}
          className="save-btn"
          style={{ marginTop: 0 }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
