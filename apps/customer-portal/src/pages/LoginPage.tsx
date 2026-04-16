import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@3sc/ui';
import { login, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../store';
import { useDocumentTitle } from '@3sc/hooks';
import { MeridianAnimatedLogo } from '../components/MeridianAnimatedLogo';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign In');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true });
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
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Left panel: branding ── */}
      <div style={{
        flex: '0 0 52%',
        background: 'linear-gradient(145deg, #0f0e1a 0%, #1a1740 35%, #1e1b4b 65%, #231f5c 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '3rem',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          top: '-120px', right: '-140px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          bottom: '-80px', left: '-100px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(165,180,252,0.08) 0%, transparent 70%)',
          top: '55%', right: '15%',
          pointerEvents: 'none',
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(165,180,252,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(165,180,252,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <MeridianAnimatedLogo size={340} />

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '⚡', text: 'Instant ticket tracking & resolution' },
              { icon: '🔔', text: 'Real-time notifications and updates' },
              { icon: '🤖', text: 'AI-powered support suggestions' },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'rgba(165,180,252,0.06)',
                border: '1px solid rgba(165,180,252,0.1)',
                borderRadius: '0.625rem',
                padding: '0.625rem 1rem',
                textAlign: 'left',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        padding: '3rem 2rem',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '22rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '2.25rem' }}>
            <h1 style={{
              margin: '0 0 0.375rem',
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: '#0f172a',
              letterSpacing: '-0.025em',
            }}>
              Welcome back
            </h1>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748b' }}>
              Sign in to your support portal
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.625rem',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '0.875rem', marginTop: '0.05rem', flexShrink: 0 }}>⚠</span>
              <span style={{ flex: 1, fontSize: '0.8125rem', color: '#b91c1c', lineHeight: 1.4 }}>{error}</span>
              <button
                onClick={() => dispatch(clearError())}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#b91c1c', fontSize: '0.875rem', padding: 0, flexShrink: 0,
                }}
              >✕</button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.375rem',
              }}>
                Email address
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${focused === 'email' ? '#6366f1' : '#e2e8f0'}`,
                borderRadius: '0.625rem',
                background: focused === 'email' ? '#fafafe' : '#f8fafc',
                transition: 'border-color 150ms, background 150ms',
                boxShadow: focused === 'email' ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
              }}>
                <span style={{ padding: '0 0.75rem', color: focused === 'email' ? '#6366f1' : '#94a3b8', fontSize: '0.9375rem' }}>
                  ✉
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  autoFocus
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent',
                    padding: '0.6875rem 0.75rem 0.6875rem 0',
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.375rem',
              }}>
                Password
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${focused === 'password' ? '#6366f1' : '#e2e8f0'}`,
                borderRadius: '0.625rem',
                background: focused === 'password' ? '#fafafe' : '#f8fafc',
                transition: 'border-color 150ms, background 150ms',
                boxShadow: focused === 'password' ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
              }}>
                <span style={{ padding: '0 0.75rem', color: focused === 'password' ? '#6366f1' : '#94a3b8', fontSize: '0.9375rem' }}>
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent',
                    padding: '0.6875rem 0',
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 0.875rem',
                    color: '#94a3b8',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.8125rem', color: '#6366f1', fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || !email || !password}
              style={{
                marginTop: '0.25rem',
                width: '100%',
                padding: '0.75rem',
                background: status === 'loading' || !email || !password
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: status === 'loading' || !email || !password ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'opacity 150ms, transform 150ms',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              {status === 'loading' ? (
                <>
                  <span style={{
                    width: '1rem', height: '1rem',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: '#94a3b8',
          }}>
            Need help?{' '}
            <a href="mailto:support@meridian.io" style={{ color: '#6366f1', fontWeight: 500 }}>
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
