import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@3sc/ui';
import { login, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../store';
import { useDocumentTitle } from '@3sc/hooks';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In — 3SC Console');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [status, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #3730a3 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '23rem',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.4)',
        padding: '2.5rem 2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: '#1e1b4b',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#c7d2fe', fontWeight: 700, fontSize: '0.875rem',
            fontFamily: 'var(--font-display)',
            marginBottom: '0.875rem',
          }}>
            3SC
          </div>
          <h1 style={{
            margin: 0, fontSize: '1.375rem', fontWeight: 700,
            fontFamily: 'var(--font-display)', color: 'var(--color-text)',
          }}>
            Internal Console
          </h1>
          <p style={{
            margin: '0.25rem 0 0', fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
          }}>
            Sign in with your agent credentials
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.625rem 0.875rem',
            background: 'var(--color-danger-light)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            fontSize: '0.8125rem',
            color: '#b91c1c',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            ⚠ {error}
            <button
              onClick={() => dispatch(clearError())}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
            >✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@3sc.com"
            required
            autoComplete="email"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            loading={status === 'loading'}
            size="lg"
            style={{ marginTop: '0.5rem' }}
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};
