import React, { useState, useRef, useEffect } from 'react';
import { useDocumentTitle, useSession, useTheme, applyAccentColor, applyDensity } from '@3sc/hooks';
import { Card, Button, Avatar, Icon } from '@3sc/ui';
import { Laptop, User, Palette, Bell, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
} from '@3sc/api';

// ── Types ────────────────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security';

interface AccentColor {
  id: string;
  label: string;
  value: string;    // CSS hex for preview
  cssClass: string; // maps to CSS variable override
}

type ColorMode = 'light' | 'dark' | 'system';

// ── Accent color presets ─────────────────────────────────────────────────────

const ACCENT_COLORS: AccentColor[] = [
  { id: 'cobalt', label: 'Cobalt', value: '#4f46e5', cssClass: 'accent-cobalt' },
  { id: 'sky', label: 'Sky', value: '#0ea5e9', cssClass: 'accent-sky' },
  { id: 'emerald', label: 'Emerald', value: '#10b981', cssClass: 'accent-emerald' },
  { id: 'violet', label: 'Violet', value: '#8b5cf6', cssClass: 'accent-violet' },
  { id: 'rose', label: 'Rose', value: '#f43f5e', cssClass: 'accent-rose' },
  { id: 'amber', label: 'Amber', value: '#f59e0b', cssClass: 'accent-amber' },
  { id: 'slate', label: 'Slate', value: '#64748b', cssClass: 'accent-slate' },
];

const MODE_OPTIONS: Array<{ value: ColorMode; label: string; icon: string; hint: string }> = [
  { value: 'light', label: 'Light', icon: '☀️', hint: 'Always use the light theme' },
  { value: 'dark', label: 'Dark', icon: '🌙', hint: 'Always use the dark theme' },
  { value: 'system', label: 'System', icon: '💻', hint: 'Follow your OS preference' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{title}</h3>
    {description && (
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{description}</p>
    )}
  </div>
);

const Divider: React.FC = () => (
  <div style={{ borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }} />
);

const FieldRow: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr', gap: '1rem', alignItems: 'start', marginBottom: '1rem' }}>
    <div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', paddingTop: '0.5rem' }}>{label}</div>
      {hint && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

const TextInput: React.FC<{
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string;
}> = ({ value, onChange, placeholder, disabled, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    style={{
      width: '100%', maxWidth: '24rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: disabled ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
      color: 'var(--color-text)',
      boxSizing: 'border-box',
      outline: 'none',
    }}
    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-brand-500)'; }}
    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)'; }}
  />
);

// ── Profile tab ──────────────────────────────────────────────────────────────

const ProfileTab: React.FC<{ session: ReturnType<typeof useSession> }> = ({ session }) => {
  const avatarRef = useRef<HTMLInputElement>(null);
  const { data: me } = useGetMeQuery();
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setJobTitle((me as any).job_title ?? '');
    setPhone((me as any).phone ?? '');
    setAvatarUrl(me.avatarUrl ?? '');
  }, [me]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      await updateMe({ firstName, lastName, jobTitle, phone, avatarUrl: avatarUrl || undefined }).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    }
  };

  return (
    <div>
      <SectionHeader title="Public Profile" description="This information may be visible to other members of your organisation." />

      {/* Avatar picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Avatar name={session?.displayName ?? 'User'} src={avatarUrl || undefined} size={64} />
        <div>
          <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <Button variant="secondary" size="sm" onClick={() => avatarRef.current?.click()}>
            Change avatar
          </Button>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            PNG, JPG or WebP · Max 2 MB
          </p>
        </div>
      </div>

      <Divider />

      <FieldRow label="First name">
        <TextInput value={firstName} onChange={setFirstName} placeholder="First name" />
      </FieldRow>
      <FieldRow label="Last name">
        <TextInput value={lastName} onChange={setLastName} placeholder="Last name" />
      </FieldRow>
      <FieldRow label="Email" hint="Managed by your organisation">
        <TextInput value={session?.email ?? ''} onChange={() => { }} disabled />
      </FieldRow>
      <FieldRow label="Job title">
        <TextInput value={jobTitle} onChange={setJobTitle} placeholder="e.g. IT Manager" />
      </FieldRow>
      <FieldRow label="Phone">
        <TextInput value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
      </FieldRow>

      {saveError && (
        <div style={{ padding: '0.625rem 0.875rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
          {saveError}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
};

// ── Appearance tab ───────────────────────────────────────────────────────────

const AppearanceTab: React.FC = () => {
  const { data: prefs } = useGetUserPreferencesQuery();
  const [updatePrefs] = useUpdateUserPreferencesMutation();
  const { setColorMode: applyColorMode } = useTheme();

  const [accentId, setAccentId] = useState<string>(() =>
    localStorage.getItem('3sc_pref_accent') ?? 'cobalt'
  );
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    (localStorage.getItem('3sc_pref_color_mode') as ColorMode) ?? 'system'
  );
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() =>
    (localStorage.getItem('3sc_pref_density') as 'comfortable' | 'compact') ?? 'comfortable'
  );
  const [saved, setSaved] = useState(false);

  // Sync local form state from server prefs (do NOT apply to DOM here —
  // that would race with user edits and overwrite localStorage on every
  // refetch, including when the API returns defaults for unmapped fields).
  useEffect(() => {
    if (!prefs) return;
    setAccentId(prefs.accentColor ?? 'cobalt');
    setColorMode((prefs.colorMode as ColorMode) ?? 'system');
    setDensity(prefs.density ?? 'comfortable');
  }, [prefs]);

  const selectedAccent = ACCENT_COLORS.find((c) => c.id === accentId) ?? ACCENT_COLORS[0];

  const handleSave = async () => {
    applyAccentColor(accentId);
    applyColorMode(colorMode);
    applyDensity(density);
    await updatePrefs({ accentColor: accentId as any, colorMode: colorMode as any, density });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      {/* Accent Colour */}
      <SectionHeader title="Accent Colour" description="Personalise the highlight colour used across the interface." />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {ACCENT_COLORS.map((ac) => (
          <button
            key={ac.id}
            onClick={() => setAccentId(ac.id)}
            title={ac.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-lg)',
              border: accentId === ac.id ? `2px solid ${ac.value}` : '2px solid transparent',
              background: accentId === ac.id ? `${ac.value}14` : 'var(--color-bg-subtle)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              minWidth: '4.5rem',
            }}
          >
            {/* Colour swatch */}
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: ac.value,
              boxShadow: accentId === ac.id ? `0 0 0 3px ${ac.value}40` : 'none',
              transition: 'box-shadow 0.15s',
              display: 'block',
            }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: accentId === ac.id ? 600 : 400,
              color: accentId === ac.id ? ac.value : 'var(--color-text-secondary)',
            }}>
              {ac.label}
            </span>
          </button>
        ))}
      </div>

      {/* Live preview strip */}
      <Card hover style={{
        marginTop: '1rem', marginBottom: '1.5rem',
        background: 'var(--color-bg-subtle)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        fontSize: '0.8125rem',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: selectedAccent.value, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>
          M
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Preview: </span>
          <span style={{ color: selectedAccent.value, fontWeight: 600 }}>buttons</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>, links, and </span>
          <span style={{ color: selectedAccent.value, fontWeight: 600 }}>active states</span>
          <span style={{ color: 'var(--color-text-secondary)' }}> will use this colour.</span>
        </div>
        <div style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)', background: selectedAccent.value, color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
          {selectedAccent.label}
        </div>
      </Card>

      <Divider />

      {/* Color Mode */}
      <SectionHeader title="Colour Mode" description="Choose how the interface looks by default." />
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setColorMode(opt.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: colorMode === opt.value ? '2px solid var(--color-brand-500)' : '2px solid var(--color-border)',
              background: colorMode === opt.value ? 'var(--color-brand-50)' : 'var(--color-bg)',
              cursor: 'pointer',
              minWidth: '7rem',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: colorMode === opt.value ? 600 : 400, color: colorMode === opt.value ? 'var(--color-brand-700)' : 'var(--color-text)', textAlign: 'center' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                {opt.hint}
              </div>
            </div>
            {colorMode === opt.value && (
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.625rem', fontWeight: 700 }}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <Divider />

      {/* UI Density */}
      <SectionHeader title="Interface Density" description="Control how compact the interface feels." />
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {(['comfortable', 'compact'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDensity(d)}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: density === d ? '2px solid var(--color-brand-500)' : '2px solid var(--color-border)',
              background: density === d ? 'var(--color-brand-50)' : 'var(--color-bg)',
              cursor: 'pointer', minWidth: '9rem',
              transition: 'border-color 0.15s, background 0.15s',
              textAlign: 'left',
            }}
          >
            {/* Mini density preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: d === 'comfortable' ? '4px' : '2px' }}>
              {[70, 55, 85].map((w, i) => (
                <div key={i} style={{ height: d === 'comfortable' ? 5 : 3, width: `${w}%`, background: density === d ? 'var(--color-brand-300)' : 'var(--color-border)', borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: density === d ? 600 : 400, color: density === d ? 'var(--color-brand-700)' : 'var(--color-text)', textTransform: 'capitalize' }}>
              {d}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button onClick={handleSave}>Save preferences</Button>
        {saved && (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            ✓ Preferences saved
          </span>
        )}
      </div>
    </div>
  );
};

// ── Notifications tab ────────────────────────────────────────────────────────

const NotificationsTab: React.FC = () => {
  const { data: prefs } = useGetUserPreferencesQuery();
  const [updatePrefs] = useUpdateUserPreferencesMutation();

  const [emailOnNewReply, setEmailOnNewReply] = useState(prefs?.emailOnNewReply ?? true);
  const [emailOnStatusChange, setEmailOnStatusChange] = useState(prefs?.emailOnStatusChange ?? true);
  const [emailOnMention, setEmailOnMention] = useState(prefs?.emailOnMention ?? true);
  const [emailDigest, setEmailDigest] = useState(prefs?.emailDigest ?? false);
  const [browserPush, setBrowserPush] = useState(prefs?.browserPush ?? false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!prefs) return;
    setEmailOnNewReply(prefs.emailOnNewReply ?? true);
    setEmailOnStatusChange(prefs.emailOnStatusChange ?? true);
    setEmailOnMention(prefs.emailOnMention ?? true);
    setEmailDigest(prefs.emailDigest ?? false);
    setBrowserPush(prefs.browserPush ?? false);
  }, [prefs]);

  const handleSave = async () => {
    await updatePrefs({ emailOnNewReply, emailOnStatusChange, emailOnMention, emailDigest, browserPush });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22,
        borderRadius: 11,
        background: value ? 'var(--color-brand-500)' : 'var(--color-border)',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );

  const NotifRow: React.FC<{ label: string; hint: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, hint, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{hint}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div>
      <SectionHeader title="Email Notifications" description="Control which emails Meridian sends you." />
      <NotifRow label="New reply on ticket" hint="When a support agent responds to your ticket" value={emailOnNewReply} onChange={setEmailOnNewReply} />
      <NotifRow label="Status change" hint="When your ticket status changes (e.g. In Progress → Resolved)" value={emailOnStatusChange} onChange={setEmailOnStatusChange} />
      <NotifRow label="@Mentions" hint="When someone mentions you in a comment" value={emailOnMention} onChange={setEmailOnMention} />
      <NotifRow label="Weekly digest" hint="A weekly summary of open ticket activity" value={emailDigest} onChange={setEmailDigest} />

      <Divider />

      <SectionHeader title="Browser Notifications" description="Receive push notifications in your browser." />
      <NotifRow label="Push notifications" hint="Instant alerts for replies and status changes" value={browserPush} onChange={setBrowserPush} />

      <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button onClick={handleSave}>Save preferences</Button>
        {saved && <span style={{ fontSize: '0.875rem', color: 'var(--color-success)' }}>✓ Saved</span>}
      </div>
    </div>
  );
};

// ── Security tab ─────────────────────────────────────────────────────────────

const SecurityTab: React.FC = () => {
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = newPw.length === 0 ? 0
    : newPw.length < 8 ? 1
      : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw) ? 4
        : newPw.length >= 12 ? 3 : 2;

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  const handleChange = async () => {
    setError('');
    if (!currentPw) { setError('Please enter your current password.'); return; }
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw }).unwrap();
      setSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.data?.message ?? 'Failed to change password. Check your current password.');
    }
  };

  return (
    <div>
      <SectionHeader title="Change Password" description="For security, choose a strong password you don't use elsewhere." />

      <div style={{ maxWidth: '22rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Current password</label>
          <TextInput type="password" value={currentPw} onChange={setCurrentPw} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text)' }}>New password</label>
          <TextInput type="password" value={newPw} onChange={setNewPw} />
          {newPw.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} style={{ flex: 1, height: 4, borderRadius: 2, background: level <= strength ? strengthColor[strength] : 'var(--color-border)', transition: 'background 0.2s' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', color: strengthColor[strength], fontWeight: 500 }}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Confirm new password</label>
          <TextInput type="password" value={confirmPw} onChange={setConfirmPw} />
        </div>

        {error && (
          <div style={{ padding: '0.625rem 0.875rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#b91c1c' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '0.625rem 0.875rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#15803d' }}>
            ✓ Password changed successfully.
          </div>
        )}

        <Button onClick={handleChange} disabled={isChanging}>
          {isChanging ? 'Updating…' : 'Update password'}
        </Button>
      </div>

      <Divider />

      <SectionHeader title="Active Sessions" description="Devices currently signed in to your account." />
      <Card hover style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem', maxWidth: '28rem' }}>
        <span style={{ fontSize: '1.25rem', display: 'inline-flex' }}><Icon icon={Laptop} size="md" /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>This device</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
            Active now · Browser session
          </div>
        </div>
        <span style={{ padding: '0.25rem 0.5rem', background: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
          Current
        </span>
      </Card>
      <Button variant="secondary" size="sm">Sign out all other sessions</Button>
    </div>
  );
};

// ── Tab navigation ───────────────────────────────────────────────────────────

const TABS: Array<{ id: SettingsTab; label: string; icon: LucideIcon }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export const UserSettingsPage: React.FC = () => {
  useDocumentTitle('Account Settings');
  const session = useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Account Settings
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Manage your profile, appearance, and security preferences.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '13rem 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar nav */}
        <div>
          <Card padding="0.5rem">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  width: '100%', padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)', border: 'none',
                  background: activeTab === tab.id ? 'var(--color-brand-50)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-brand-700)' : 'var(--color-text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: '0.875rem', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>
                  <Icon icon={tab.icon} size="md" />
                </span>
                {tab.label}
              </button>
            ))}
          </Card>

          {/* User summary */}
          <Card hover padding="0.875rem" style={{ marginTop: '1rem', background: 'var(--color-bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
            <Avatar name={session?.displayName ?? 'User'} size={48} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {session?.displayName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize', marginTop: '0.125rem' }}>
                {session?.role?.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
          </Card>
        </div>

        {/* Main content area */}
        <Card hover>
          {activeTab === 'profile' && <ProfileTab session={session} />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
        </Card>
      </div>
    </div>
  );
};
