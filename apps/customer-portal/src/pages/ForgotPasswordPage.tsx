import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@3sc/ui';
import { requestPasswordReset } from '@3sc/auth';
import { useDocumentTitle } from '@3sc/hooks';

export const ForgotPasswordPage: React.FC = () => {
  useDocumentTitle('Forgot Password');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '24rem',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '2.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-brand-600)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            fontFamily: 'var(--font-display)', marginBottom: '1rem',
          }}>
            3SC
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            Forgot Password
          </h1>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {submitted
              ? 'Check your inbox for reset instructions.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {submitted ? (
          <div>
            <div style={{
              padding: '1rem',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: '#15803d',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}>
              ✅ Reset link sent to <strong>{email}</strong>
            </div>
            <Button fullWidth variant="secondary" onClick={() => navigate('/login')}>
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-danger-light)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem', color: '#b91c1c',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span>⚠</span> {error}
                <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
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
              <Button type="submit" fullWidth loading={loading} size="lg" style={{ marginTop: '0.5rem' }}>
                Send Reset Link
              </Button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <a href="/login" style={{ fontSize: '0.8125rem', color: 'var(--color-brand-600)' }}>
                ← Back to Sign In
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
