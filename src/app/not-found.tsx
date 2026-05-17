import Link from 'next/link';

export default function NotFound() {
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
          fontSize: '48px',
          color: 'var(--border-md)',
          marginBottom: '8px',
          lineHeight: 1,
        }}>
          404
        </div>
        <div style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
          Página no encontrada
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          La ruta que buscas no existe.
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button className="save-btn" style={{ marginTop: 0 }}>
            Volver al inicio
          </button>
        </Link>
      </div>
    </div>
  );
}
