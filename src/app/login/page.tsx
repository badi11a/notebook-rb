'use client';

import { useState, FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = getSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

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
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: 'var(--text-xs)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '8px',
          }}>
            Notebook
          </div>
          <div style={{ fontSize: 'var(--text-xl)', color: 'var(--text)' }}>Acceso</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              letterSpacing: '.04em',
              marginBottom: '4px',
            }}>
              Correo
            </div>
            <input
              className="inp-field"
              type="email"
              autoComplete="email"
              required
              style={{ width: '100%', textAlign: 'left' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              letterSpacing: '.04em',
              marginBottom: '4px',
            }}>
              Contraseña
            </div>
            <input
              className="inp-field"
              type="password"
              autoComplete="current-password"
              required
              style={{ width: '100%', textAlign: 'left' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--red-text)',
              background: 'var(--red-bg)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="save-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
