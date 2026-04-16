import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '@3sc/auth';
import { useDocumentTitle } from '@3sc/hooks';
import { MeridianAnimatedLogo } from '../components/MeridianAnimatedLogo';

export const ForgotPasswordPage: React.FC = () => {
  useDocumentTitle('Reset Password');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset({ email });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Left panel — pixel-identical to LoginPage ── */}
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
        {/* Background orbs — exact same positions as LoginPage */}
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

        {/* Subtle grid overlay — exact same as LoginPage */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(165,180,252,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(165,180,252,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Content — same maxWidth, same logo size */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <MeridianAnimatedLogo size={340} />

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🔒', text: 'Reset link expires after 15 minutes' },
              { icon: '📧', text: 'Check your spam folder if not received' },
              { icon: '💬', text: 'Contact support if you need further help' },
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

          {/* Back link */}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', color: '#6366f1', fontWeight: 500,
              padding: 0, marginBottom: '2rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Back to Sign In
          </button>

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
              {submitted ? 'Check your email' : 'Forgot password?'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748b' }}>
              {submitted
                ? `We sent a reset link to ${email}`
                : "Enter your email and we'll send a reset link"}
            </p>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '0.625rem',
                marginBottom: '1.75rem',
              }}>
                <span style={{ fontSize: '1.125rem', flexShrink: 0, lineHeight: 1 }}>✅</span>
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem', color: '#15803d' }}>
                    Reset link sent
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534', lineHeight: 1.5 }}>
                    If <strong>{email}</strong> is registered, you'll receive instructions shortly.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.625rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                Back to Sign In
              </button>

              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                style={{
                  display: 'block', width: '100%', marginTop: '0.75rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.8125rem', color: '#6366f1', fontWeight: 500,
                  fontFamily: 'var(--font-body)', textAlign: 'center',
                }}
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Request form ── */
            <>
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
                    onClick={() => setError(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '0.875rem', padding: 0, flexShrink: 0 }}
                  >✕</button>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    border: `1.5px solid ${focused ? '#6366f1' : '#e2e8f0'}`,
                    borderRadius: '0.625rem',
                    background: focused ? '#fafafe' : '#f8fafc',
                    transition: 'border-color 150ms, background 150ms',
                    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                  }}>
                    <span style={{ padding: '0 0.75rem', color: focused ? '#6366f1' : '#94a3b8', fontSize: '0.9375rem' }}>
                      ✉
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
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

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    marginTop: '0.25rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: loading || !email
                      ? '#a5b4fc'
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.625rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    cursor: loading || !email ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'opacity 150ms, transform 150ms',
                    boxShadow: loading || !email ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: '1rem', height: '1rem',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'fp-spin 0.6s linear infinite',
                        display: 'inline-block',
                      }} />
                      Sending…
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Footer — same as LoginPage */}
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

      <style>{`@keyframes fp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
