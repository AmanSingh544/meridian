import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@3sc/ui';
import { login, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../store';
import { useDocumentTitle } from '@3sc/hooks';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In');
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
      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '24rem',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '2.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-brand-600)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            fontFamily: 'var(--font-display)',
            marginBottom: '1rem',
          }}>
            3SC
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
          }}>
            Welcome back
          </h1>
          <p style={{
            margin: '0.375rem 0 0',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}>
            Sign in to your support portal
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--color-danger-light)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⚠</span>
            {error}
            <button
              onClick={() => dispatch(clearError())}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
            >✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
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
          <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            <a href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-brand-600)' }}>
              Forgot password?
            </a>
          </div>
          <Button
            type="submit"
            fullWidth
            loading={status === 'loading'}
            size="lg"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};
