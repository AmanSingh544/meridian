import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@3sc/ui';
import { confirmPasswordReset } from '@3sc/auth';
import { useDocumentTitle } from '@3sc/hooks';

export const ResetPasswordPage: React.FC = () => {
  useDocumentTitle('Reset Password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset({ token, newPassword });
      setSuccess(true);
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
            Set New Password
          </h1>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Enter a new password for your account.
          </p>
        </div>

        {success ? (
          <div>
            <div style={{
              padding: '1rem',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem', color: '#15803d',
              textAlign: 'center', marginBottom: '1.5rem',
            }}>
              ✅ Password updated successfully!
            </div>
            <Button fullWidth onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        ) : (
          <>
            {!token && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-danger-light)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem', color: '#b91c1c',
              }}>
                ⚠ Invalid or missing reset token. Please{' '}
                <a href="/forgot-password" style={{ color: '#b91c1c' }}>request a new reset link</a>.
              </div>
            )}
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
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
              />
              <Button type="submit" fullWidth loading={loading} size="lg" disabled={!token} style={{ marginTop: '0.5rem' }}>
                Reset Password
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
