import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '@3sc/auth';
import { useDocumentTitle } from '@3sc/hooks';
import { ConsoleAnimatedLogo } from '../components/ConsoleAnimatedLogo';

export const ForgotPasswordPage: React.FC = () => {
  useDocumentTitle('Reset Password — 3SC Console');
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
    <>
      <style>{`
        @keyframes _ic_spin   { to { transform: rotate(360deg); } }
        @keyframes _ic_rise   { 0%{opacity:0;transform:translateY(28px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes _ic_orb1   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        @keyframes _ic_orb2   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,25px)} }
        @keyframes _ic_orb3   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,15px)} }
        @keyframes _ic_scan   {
          0%   { top: 0%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .ic-fp-field {
          display:flex; align-items:center;
          border-radius: 0.5rem;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          overflow: hidden;
        }
        .ic-fp-field input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(15,14,35,0.8) inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
        .ic-fp-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(129,140,248,0.45) !important;
        }
        .ic-fp-btn:active:not(:disabled) { transform: translateY(0); }
        .ic-fp-btn { transition: all 0.18s ease; }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
        background: 'linear-gradient(160deg, #05040f 0%, #0d0b20 40%, #0f0e28 70%, #0d0c23 100%)',
        position: 'relative',
      }}>

        {/* Ambient orbs — identical positions to LoginPage */}
        <div style={{
          position: 'absolute', width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 60%)',
          top: '-160px', right: '-160px',
          animation: '_ic_orb1 14s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
          bottom: '-120px', left: '-120px',
          animation: '_ic_orb2 17s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          top: '42%', left: '55%',
          animation: '_ic_orb3 11s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Star-field dots — identical to LoginPage */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(circle, rgba(165,180,252,0.45) 1px, transparent 1px),
            radial-gradient(circle, rgba(165,180,252,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px, 34px 34px',
          backgroundPosition: '0 0, 17px 17px',
          opacity: 0.4,
        }} />

        {/* Scan line — identical to LoginPage */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.4) 50%, transparent 100%)',
          animation: '_ic_scan 8s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* Content wrapper — identical maxWidth and animation to LoginPage */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '100%', maxWidth: '26rem',
          animation: '_ic_rise 0.6s ease both',
        }}>

          {/* Logo — same component, same width */}
          <ConsoleAnimatedLogo width={260} />

          {/* Badge — same style as LoginPage */}
          <div style={{
            marginTop: '0.25rem', marginBottom: '1.25rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.3125rem 1rem',
            background: 'rgba(129,140,248,0.1)',
            border: '1px solid rgba(129,140,248,0.2)',
            borderRadius: '2rem',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#818cf8',
              boxShadow: '0 0 8px #818cf8',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.12em',
              color: '#a5b4fc', textTransform: 'uppercase',
            }}>
              Internal Console · Restricted Access
            </span>
          </div>

          {/* Glass card */}
          <div style={{
            width: '100%',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(129,140,248,0.15)',
            borderRadius: '1rem',
            padding: '1.5rem',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>

            {/* Back link */}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', color: '#818cf8', fontWeight: 500,
                padding: 0, marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
              }}
            >
              ← Back to Sign In
            </button>

            <h2 style={{
              margin: '0 0 0.25rem',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#f1f5f9',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}>
              {submitted ? 'Check your email' : 'Reset password'}
            </h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#475569' }}>
              {submitted
                ? `Reset instructions sent to ${email}`
                : 'Enter your email to receive a reset link'}
            </p>

            {submitted ? (
              /* ── Success state ── */
              <div>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(34,197,94,0.07)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '0.5rem',
                  marginBottom: '1.25rem',
                }}>
                  <span style={{ color: '#4ade80', fontSize: '0.875rem', flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                  <div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.8125rem', color: '#4ade80' }}>
                      Reset link sent
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#86efac', lineHeight: 1.5 }}>
                      If <strong>{email}</strong> is registered, you'll receive instructions shortly.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="ic-fp-btn"
                  style={{
                    width: '100%',
                    padding: '0.8125rem',
                    background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'transparent',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Back to Sign In →
                </button>

                <button
                  onClick={() => { setSubmitted(false); setEmail(''); }}
                  style={{
                    display: 'block', width: '100%', marginTop: '0.75rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', color: '#818cf8', fontWeight: 500,
                    fontFamily: 'var(--font-body)', textAlign: 'center',
                    letterSpacing: '0.04em',
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
                    display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                    padding: '0.6875rem 0.875rem',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '0.5rem',
                    marginBottom: '1.25rem',
                  }}>
                    <span style={{ color: '#f87171', fontSize: '0.875rem', flexShrink: 0 }}>⚠</span>
                    <span style={{ flex: 1, fontSize: '0.8125rem', color: '#fca5a5', lineHeight: 1.4 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#f87171', padding: 0, flexShrink: 0, lineHeight: 1,
                    }}>✕</button>
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label style={{
                      display: 'block', fontSize: '0.6875rem', fontWeight: 600,
                      color: '#64748b', marginBottom: '0.375rem',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Email</label>
                    <div className="ic-fp-field" style={{
                      border: `1px solid ${focused ? 'rgba(129,140,248,0.55)' : 'rgba(129,140,248,0.12)'}`,
                      background: focused ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.025)',
                      boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                    }}>
                      <span style={{
                        padding: '0 0.875rem', fontSize: '0.9375rem', flexShrink: 0, lineHeight: 1,
                        color: focused ? '#818cf8' : '#334155',
                        transition: 'color 0.15s',
                      }}>✉</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="agent@3sc.com"
                        required
                        autoComplete="email"
                        autoFocus
                        style={{
                          flex: 1, border: 'none', outline: 'none', background: 'transparent',
                          padding: '0.75rem 0.75rem 0.75rem 0',
                          fontSize: '0.9375rem', color: '#e2e8f0',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="ic-fp-btn"
                    style={{
                      marginTop: '0.125rem',
                      width: '100%',
                      padding: '0.8125rem',
                      background: loading || !email
                        ? 'rgba(99,102,241,0.12)'
                        : 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
                      color: loading || !email ? '#334155' : '#ffffff',
                      border: '1px solid',
                      borderColor: loading || !email ? 'rgba(99,102,241,0.15)' : 'transparent',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      cursor: loading || !email ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: loading || !email ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {loading ? (
                      <>
                        <span style={{
                          width: '1rem', height: '1rem',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: '_ic_spin 0.65s linear infinite',
                          display: 'inline-block', flexShrink: 0,
                        }} />
                        Sending…
                      </>
                    ) : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer — identical to LoginPage */}
          <p style={{
            marginTop: '1rem', textAlign: 'center',
            fontSize: '0.6875rem', color: '#1e293b',
            letterSpacing: '0.04em', lineHeight: 1.6,
          }}>
            UNAUTHORISED ACCESS IS MONITORED AND LOGGED
          </p>
        </div>
      </div>
    </>
  );
};
