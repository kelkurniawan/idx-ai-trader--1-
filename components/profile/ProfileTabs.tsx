import React, { useState, useEffect } from 'react';
import {
    User, Shield, Bell, CreditCard, Key, Mail, Phone, Save,
    AlertCircle, CheckCircle, Eye, EyeOff, Copy, RefreshCw, Trash2,
    Smartphone, Lock, LogOut, ChevronLeft
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useMfa } from '../../hooks/useMfa';
import { useNotifications } from '../../hooks/useNotifications';
import * as profileApi from '../../services/profileApi';
import type { ProfileUser } from '../../services/profileApi';

// ── Design tokens (mirrors App.tsx SG tokens) ─────────────────────────────
const SG = {
    bg: '#0d1417', bg2: '#0a0f10', surface: '#151b1e', bgMuted: '#1e2a2f',
    border: '#1e2a2f', green: '#22c55e', greenBg: 'rgba(34,197,94,0.10)',
    red: '#ef4444', redBg: 'rgba(239,68,68,0.10)', yellow: '#facc15',
    text: '#f1f5f9', textSecond: '#94a3b8', muted: '#64748b',
    sans: "'Plus Jakarta Sans', sans-serif",
};

// ── Shared sub-components ─────────────────────────────────────────────────

const Divider = () => (
    <div style={{ height: 1, background: SG.border, margin: '24px 0' }} />
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SG.muted, display: 'block', marginBottom: 6, fontFamily: SG.sans }}>
        {children}
    </label>
);

const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        style={{
            width: '100%', padding: '10px 14px', background: SG.bgMuted, border: `1px solid ${SG.border}`,
            borderRadius: 10, color: SG.text, fontSize: 14, fontFamily: SG.sans, outline: 'none', boxSizing: 'border-box', ...props.style,
        }}
    />
);

const Textarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        style={{
            width: '100%', padding: '10px 14px', background: SG.bgMuted, border: `1px solid ${SG.border}`,
            borderRadius: 10, color: SG.text, fontSize: 14, fontFamily: SG.sans, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        }}
    />
);

const PrimaryBtn = ({ children, loading, ...props }: { children: React.ReactNode; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...props}
        disabled={props.disabled || loading}
        style={{
            background: props.disabled || loading ? SG.bgMuted : SG.green, color: props.disabled || loading ? SG.muted : '#0a0f10',
            border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
            fontFamily: SG.sans, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', ...props.style,
        }}
    >
        {loading && <RefreshCw size={14} className="animate-spin" />}
        {children}
    </button>
);

const DangerBtn = ({ children, ...props }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...props}
        style={{
            background: 'transparent', color: SG.red, border: `1px solid ${SG.red}`,
            padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            fontFamily: SG.sans, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }}
    >
        {children}
    </button>
);

const Toast = ({ msg, type }: { msg: string; type: 'error' | 'success' }) => (
    <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        borderRadius: 10, marginBottom: 16,
        background: type === 'error' ? SG.redBg : SG.greenBg,
        border: `1px solid ${type === 'error' ? SG.red : SG.green}`,
        color: type === 'error' ? SG.red : SG.green, fontSize: 13, fontFamily: SG.sans,
    }}>
        {type === 'error' ? <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
        {msg}
    </div>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: checked ? SG.green : SG.bgMuted,
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
    >
        <span style={{
            display: 'block', width: 18, height: 18, borderRadius: 9,
            background: '#fff', position: 'absolute', top: 3,
            left: checked ? 23 : 3, transition: 'left 0.2s',
        }} />
    </button>
);

const OTPInput = ({ value, onChange, onSubmit, loading }: { value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean }) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <Input
            value={value}
            onChange={e => onChange(e.target.value.slice(0, 6))}
            placeholder="6-digit code"
            maxLength={6}
            style={{ width: 160, letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }}
        />
        <PrimaryBtn onClick={onSubmit} loading={loading}>Verify</PrimaryBtn>
    </div>
);


// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ══════════════════════════════════════════════════════════════════════════════

export const AccountTab: React.FC<{ authUser: ProfileUser; onUserUpdate: (u: ProfileUser) => void }> = ({ authUser, onUserUpdate }) => {
    const p = useProfile(authUser);
    const [name, setName] = useState(authUser.display_name);
    const [bio, setBio] = useState(authUser.bio ?? '');
    const [newEmail, setNewEmail] = useState('');
    const [emailPass, setEmailPass] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailStep, setEmailStep] = useState<'idle' | 'otp'>('idle');

    const [curPass, setCurPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confPass, setConfPass] = useState('');
    const [showPass, setShowPass] = useState(false);

    const [deletePass, setDeletePass] = useState('');
    const [showDelete, setShowDelete] = useState(false);

    const handleSaveProfile = async () => {
        const updated = await p.update({ display_name: name, bio });
        if (updated) onUserUpdate(updated);
    };

    const handleInitEmail = async () => {
        const ok = await p.initiateEmailChange({ new_email: newEmail, current_password: emailPass });
        if (ok) setEmailStep('otp');
    };

    const handleVerifyEmail = async () => {
        const ok = await p.verifyEmailChange(emailOtp);
        if (ok) { setEmailStep('idle'); setNewEmail(''); setEmailPass(''); setEmailOtp(''); if (p.profile) onUserUpdate(p.profile); }
    };

    const handleChangePass = async () => {
        await p.changePassword({ current_password: curPass, new_password: newPass, confirm_password: confPass });
        setCurPass(''); setNewPass(''); setConfPass('');
    };

    return (
        <div style={{ maxWidth: 600 }}>
            {p.error && <Toast msg={p.error} type="error" />}
            {p.success && <Toast msg={p.success} type="success" />}

            {/* Profile Info */}
            <div style={{ marginBottom: 8 }}>
                <h2 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Account Info</h2>
                <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginTop: 4 }}>Update your display name, bio, and avatar.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                    width: 60, height: 60, borderRadius: 16, background: SG.greenBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 800, color: SG.green, fontFamily: SG.sans, flexShrink: 0,
                }}>{(p.profile?.display_name || authUser.display_name)[0].toUpperCase()}</div>
                <div>
                    <p style={{ color: SG.text, fontWeight: 700, fontSize: 15, fontFamily: SG.sans, margin: 0 }}>{p.profile?.display_name || authUser.display_name}</p>
                    <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0 }}>{p.profile?.email || authUser.email}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: SG.green, background: SG.greenBg, padding: '2px 8px', borderRadius: 6, marginTop: 4, display: 'inline-block' }}>
                        {p.profile?.plan || authUser.plan}
                    </span>
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <FieldLabel>Display Name</FieldLabel>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginBottom: 16 }}>
                <FieldLabel>Bio</FieldLabel>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Short bio (optional)" />
            </div>
            <PrimaryBtn loading={p.loading} onClick={handleSaveProfile}><Save size={14} /> Save Profile</PrimaryBtn>

            <Divider />

            {/* Email Change */}
            <h3 style={{ color: SG.text, fontSize: 14, fontWeight: 800, fontFamily: SG.sans, marginBottom: 4, marginTop: 0 }}>Change Email</h3>
            <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginBottom: 16 }}>A verification code will be sent to the new address.</p>
            {emailStep === 'idle' ? (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <FieldLabel>New Email</FieldLabel>
                        <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Current Password</FieldLabel>
                        <Input type="password" value={emailPass} onChange={e => setEmailPass(e.target.value)} placeholder="Verify it's you" />
                    </div>
                    <PrimaryBtn loading={p.loading} onClick={handleInitEmail}><Mail size={14} /> Send Verification Code</PrimaryBtn>
                </>
            ) : (
                <>
                    <p style={{ color: SG.green, fontSize: 13, fontFamily: SG.sans }}>Code sent to <strong>{newEmail}</strong>. Enter it below:</p>
                    <OTPInput value={emailOtp} onChange={setEmailOtp} onSubmit={handleVerifyEmail} loading={p.loading} />
                    <button onClick={() => { setEmailStep('idle'); p.clearMessages(); }} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 12, marginTop: 8, padding: 0 }}>← Back</button>
                </>
            )}

            <Divider />

            {/* Change Password */}
            {authUser.auth_provider === 'local' && (
                <>
                    <h3 style={{ color: SG.text, fontSize: 14, fontWeight: 800, fontFamily: SG.sans, marginBottom: 4, marginTop: 0 }}>Change Password</h3>
                    <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Current Password</FieldLabel>
                        <div style={{ position: 'relative' }}>
                            <Input type={showPass ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} style={{ paddingRight: 44 }} />
                            <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', padding: 0 }}>
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <FieldLabel>New Password</FieldLabel>
                        <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Minimum 8 characters" />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <FieldLabel>Confirm Password</FieldLabel>
                        <Input type="password" value={confPass} onChange={e => setConfPass(e.target.value)} placeholder="Repeat new password" />
                    </div>
                    <PrimaryBtn loading={p.loading} onClick={handleChangePass}><Lock size={14} /> Change Password</PrimaryBtn>
                    <Divider />
                </>
            )}

            {/* Delete Account */}
            <h3 style={{ color: SG.red, fontSize: 14, fontWeight: 800, fontFamily: SG.sans, marginBottom: 4, marginTop: 0 }}>Danger Zone</h3>
            {!showDelete ? (
                <DangerBtn onClick={() => setShowDelete(true)}><Trash2 size={14} /> Delete Account</DangerBtn>
            ) : (
                <>
                    <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginBottom: 12 }}>This cannot be undone. Enter your password to confirm.</p>
                    <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Current Password</FieldLabel>
                        <Input type="password" value={deletePass} onChange={e => setDeletePass(e.target.value)} placeholder="Confirm password" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <DangerBtn onClick={async () => {
                            try { await profileApi.deleteAccount(deletePass); window.location.reload(); } catch (e: any) { p['setError'] ?? alert(e.message); }
                        }}><Trash2 size={14} /> Confirm Delete</DangerBtn>
                        <button onClick={() => setShowDelete(false)} style={{ background: 'none', border: `1px solid ${SG.border}`, color: SG.muted, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: SG.sans }}>Cancel</button>
                    </div>
                </>
            )}
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// SECURITY TAB
// ══════════════════════════════════════════════════════════════════════════════

export const SecurityTab: React.FC<{ authUser: ProfileUser }> = ({ authUser }) => {
    const mfa = useMfa();
    const [totpToken, setTotpToken] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [removePass, setRemovePass] = useState('');
    const [copied, setCopied] = useState(false);

    const [sessions, setSessions] = useState<profileApi.SessionInfo[]>([]);

    useEffect(() => {
        mfa.fetchStatus();
        profileApi.listSessions().then(setSessions).catch(() => { });
    }, []);

    const copySecret = () => {
        if (mfa.totpSetup?.secret) {
            navigator.clipboard.writeText(mfa.totpSetup.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const MFABadge = ({ type }: { type?: string | null }) => {
        if (!type) return null;
        const label = type === 'totp' ? 'Authenticator App' : type === 'email_otp' ? 'Email OTP' : 'SMS OTP';
        return (
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: SG.green, background: SG.greenBg, padding: '3px 10px', borderRadius: 6 }}>{label}</span>
        );
    };

    return (
        <div style={{ maxWidth: 600 }}>
            {mfa.error && <Toast msg={mfa.error} type="error" />}
            {mfa.success && <Toast msg={mfa.success} type="success" />}

            {/* MFA Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h2 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Two-Factor Authentication</h2>
                    <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginTop: 4 }}>
                        {mfa.status?.mfa_enabled ? 'Currently enabled.' : 'Not enabled. Protect your account.'}
                    </p>
                </div>
                {mfa.status && <MFABadge type={mfa.status.mfa_type} />}
            </div>

            {/* TOTP Setup */}
            {mfa.step === 'idle' && !mfa.status?.mfa_enabled && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                    <PrimaryBtn loading={mfa.loading} onClick={mfa.startTOTP}><Smartphone size={14} /> Authenticator App</PrimaryBtn>
                    <PrimaryBtn loading={mfa.loading} onClick={mfa.startEmailOTP} style={{ background: '#3b82f6', color: '#fff' }}><Mail size={14} /> Email OTP</PrimaryBtn>
                    <PrimaryBtn loading={mfa.loading} onClick={() => mfa.startSMSOTP(authUser.phone || undefined)} style={{ background: '#8b5cf6', color: '#fff' }}><Phone size={14} /> SMS OTP</PrimaryBtn>
                </div>
            )}

            {/* TOTP QR Step */}
            {mfa.step === 'totp_pending' && mfa.totpSetup && (
                <div style={{ background: SG.bgMuted, padding: 20, borderRadius: 16, border: `1px solid ${SG.border}`, marginBottom: 16 }}>
                    <p style={{ color: SG.text, fontSize: 13, fontFamily: SG.sans, marginTop: 0 }}>Scan with Google Authenticator, Authy, or similar:</p>
                    <img src={mfa.totpSetup.qr_code_data_url} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 12 }} />
                    <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, marginBottom: 6 }}>Or enter manually:</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <code style={{ background: SG.surface, padding: '6px 12px', borderRadius: 8, color: SG.green, fontSize: 13, letterSpacing: '0.1em' }}>{mfa.totpSetup.secret}</code>
                        <button onClick={copySecret} style={{ background: 'none', border: 'none', color: copied ? SG.green : SG.muted, cursor: 'pointer', padding: 0 }}>
                            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                    <FieldLabel>Enter 6-digit code to confirm</FieldLabel>
                    <OTPInput value={totpToken} onChange={setTotpToken} onSubmit={() => mfa.confirmTOTP(totpToken)} loading={mfa.loading} />
                    <button onClick={mfa.reset} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 12, marginTop: 8, padding: 0 }}>Cancel</button>
                </div>
            )}

            {/* Email OTP Verify Step */}
            {mfa.step === 'email_pending' && (
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: SG.textSecond, fontSize: 13, fontFamily: SG.sans }}>Code sent to <strong style={{ color: SG.text }}>{authUser.email}</strong></p>
                    <OTPInput value={otpInput} onChange={setOtpInput} onSubmit={() => mfa.confirmEmailOTP(otpInput)} loading={mfa.loading} />
                    <button onClick={mfa.reset} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 12, marginTop: 8, padding: 0 }}>Cancel</button>
                </div>
            )}

            {/* SMS OTP Verify Step */}
            {mfa.step === 'sms_pending' && (
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: SG.textSecond, fontSize: 13, fontFamily: SG.sans }}>Code sent to <strong style={{ color: SG.text }}>{authUser.phone || 'your phone'}</strong></p>
                    <OTPInput value={otpInput} onChange={setOtpInput} onSubmit={() => mfa.confirmSMSOTP(otpInput)} loading={mfa.loading} />
                    <button onClick={mfa.reset} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 12, marginTop: 8, padding: 0 }}>Cancel</button>
                </div>
            )}

            {/* Backup Codes (shown once) */}
            {mfa.step === 'backup_codes' && mfa.backupCodes && (
                <div style={{ background: SG.bgMuted, padding: 20, borderRadius: 16, border: `1px solid ${SG.yellow}`, marginBottom: 24 }}>
                    <p style={{ color: SG.yellow, fontWeight: 700, fontSize: 13, fontFamily: SG.sans }}>⚠️ Save these backup codes — shown only once!</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                        {mfa.backupCodes.map(code => (
                            <code key={code} style={{ background: SG.surface, padding: '6px 10px', borderRadius: 8, color: SG.text, fontSize: 13, letterSpacing: '0.1em' }}>{code}</code>
                        ))}
                    </div>
                    <PrimaryBtn onClick={() => { mfa.fetchStatus(); mfa.reset(); }} style={{ marginTop: 16 }}>Done — I've saved them</PrimaryBtn>
                </div>
            )}

            {/* Remove TOTP */}
            {mfa.status?.mfa_enabled && mfa.step === 'idle' && (
                <>
                    <Divider />
                    <h3 style={{ color: SG.text, fontSize: 14, fontWeight: 700, fontFamily: SG.sans, marginBottom: 12 }}>Remove MFA</h3>
                    {authUser.auth_provider === 'local' && (
                        <div style={{ marginBottom: 12 }}>
                            <FieldLabel>Password</FieldLabel>
                            <Input type="password" value={removePass} onChange={e => setRemovePass(e.target.value)} placeholder="Confirm your password" />
                        </div>
                    )}
                    <DangerBtn onClick={() => mfa.removeTOTP(removePass)}><Shield size={14} /> Disable 2FA</DangerBtn>
                </>
            )}

            <Divider />

            {/* Sessions */}
            <h3 style={{ color: SG.text, fontSize: 14, fontWeight: 800, fontFamily: SG.sans, marginBottom: 12, marginTop: 0 }}>Active Sessions</h3>
            {sessions.length === 0 ? (
                <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans }}>No active sessions tracked yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {sessions.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: SG.bgMuted, borderRadius: 10, border: `1px solid ${SG.border}` }}>
                            <div>
                                <p style={{ color: SG.text, fontSize: 13, fontWeight: 600, fontFamily: SG.sans, margin: 0 }}>
                                    {s.ip_address || 'Unknown IP'} — {s.user_agent?.split(' ')[0] || 'Unknown browser'}
                                </p>
                                <p style={{ color: SG.muted, fontSize: 11, fontFamily: SG.sans, margin: '2px 0 0' }}>
                                    Active since {new Date(s.created_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                            <button onClick={async () => { await profileApi.revokeSession(s.id); setSessions(prev => prev.filter(x => x.id !== s.id)); }}
                                style={{ background: 'none', border: 'none', color: SG.red, cursor: 'pointer', padding: 4 }}>
                                <LogOut size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <DangerBtn onClick={async () => { await profileApi.revokeAllOtherSessions(); setSessions([]); }}><LogOut size={14} /> Sign Out All Other Sessions</DangerBtn>
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

export const NotificationsTab: React.FC = () => {
    const n = useNotifications();

    useEffect(() => { n.fetch(); }, []);

    if (!n.prefs) return (
        <div style={{ color: SG.muted, fontSize: 14, fontFamily: SG.sans }}>
            {n.loading ? 'Loading…' : n.error || 'Could not load preferences.'}
        </div>
    );

    const group = (label: string, items: Array<{ key: keyof typeof n.prefs; label: string; desc: string }>) => (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: SG.textSecond, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: SG.sans, marginTop: 0, marginBottom: 12 }}>{label}</h3>
            <div style={{ background: SG.bgMuted, borderRadius: 12, border: `1px solid ${SG.border}`, overflow: 'hidden' }}>
                {items.map((item, i) => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < items.length - 1 ? `1px solid ${SG.border}` : 'none' }}>
                        <div>
                            <p style={{ color: SG.text, fontSize: 14, fontWeight: 600, fontFamily: SG.sans, margin: 0 }}>{item.label}</p>
                            <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: '2px 0 0' }}>{item.desc}</p>
                        </div>
                        <ToggleSwitch checked={!!n.prefs?.[item.key]} onChange={() => n.toggle(item.key)} />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: 560 }}>
            {n.error && <Toast msg={n.error} type="error" />}
            <h2 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, marginTop: 0, marginBottom: 20 }}>Notification Preferences</h2>

            {group('Market Alerts', [
                { key: 'price_alerts', label: 'Price Alerts', desc: 'Get notified when a stock hits your target price.' },
                { key: 'market_open', label: 'Market Open', desc: 'Notify me when IDX opens at 09:00 WIB.' },
                { key: 'market_close', label: 'Market Close', desc: 'Notify me when IDX closes at 15:00 WIB.' },
            ])}
            {group('Content', [
                { key: 'news_alerts', label: 'News Alerts', desc: 'Breaking news about stocks in your watchlist.' },
                { key: 'portfolio_digest', label: 'Daily Digest', desc: 'Morning summary of your watchlist performance.' },
            ])}
            {group('Delivery Channels', [
                { key: 'email_enabled', label: 'Email Notifications', desc: 'Receive alerts via email.' },
                { key: 'push_enabled', label: 'Push Notifications', desc: 'Browser push notifications (coming soon).' },
            ])}
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// PLAN CARD
// ══════════════════════════════════════════════════════════════════════════════

export const PlanCard: React.FC<{ authUser: ProfileUser }> = ({ authUser }) => {
    const [plan, setPlan] = useState<profileApi.PlanInfo | null>(null);

    useEffect(() => { profileApi.getPlan().then(setPlan).catch(() => { }); }, []);

    const isPro = authUser.plan === 'PRO';

    return (
        <div style={{ maxWidth: 560 }}>
            <h2 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, marginTop: 0, marginBottom: 20 }}>Your Plan</h2>
            <div style={{ background: SG.bgMuted, borderRadius: 16, border: `1px solid ${isPro ? SG.green : SG.border}`, padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <p style={{ color: SG.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: SG.sans, margin: 0 }}>Current Plan</p>
                        <p style={{ color: isPro ? SG.green : SG.text, fontSize: 28, fontWeight: 900, fontFamily: SG.sans, margin: '4px 0 0' }}>{authUser.plan}</p>
                    </div>
                    <CreditCard size={32} color={isPro ? SG.green : SG.muted} />
                </div>
                {plan && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { label: 'AI News', value: plan.features.news_ai ? '✓ Included' : '✗ Not included', ok: plan.features.news_ai },
                            { label: 'Watchlist limit', value: `${plan.features.watchlist_limit} stocks`, ok: true },
                            { label: 'Price alerts', value: plan.features.alert_limit ? `${plan.features.alert_limit} alerts` : 'Unlimited', ok: true },
                        ].map(item => (
                            <div key={item.label} style={{ background: SG.surface, borderRadius: 10, padding: '12px 14px' }}>
                                <p style={{ color: SG.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', fontFamily: SG.sans, margin: 0 }}>{item.label}</p>
                                <p style={{ color: item.ok ? SG.text : SG.muted, fontSize: 14, fontWeight: 700, fontFamily: SG.sans, margin: '4px 0 0' }}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {!isPro && (
                <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))', borderRadius: 16, padding: 20, border: `1px solid ${SG.green}` }}>
                    <p style={{ color: SG.green, fontWeight: 800, fontSize: 14, fontFamily: SG.sans, marginTop: 0 }}>Upgrade to PRO</p>
                    <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans }}>Unlock AI news, unlimited alerts, and up to 50 watchlist stocks.</p>
                    <PrimaryBtn style={{ marginTop: 8 }}>Upgrade Now</PrimaryBtn>
                </div>
            )}
        </div>
    );
};
