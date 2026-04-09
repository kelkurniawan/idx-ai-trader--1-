import React, { useState, useEffect } from 'react';
import {
    User, Shield, Bell, CreditCard, Key, Mail, Phone, Save,
    AlertCircle, CheckCircle, Eye, EyeOff, Copy, RefreshCw, Trash2,
    Smartphone, Lock, LogOut, ChevronLeft, Monitor, Settings, Info, Chrome
} from 'lucide-react';
import { UserProfile as ClerkUserProfile } from '@clerk/clerk-react';
import { useProfile } from '../../hooks/useProfile';
import { useMfa } from '../../hooks/useMfa';
import { useNotifications } from '../../hooks/useNotifications';
import * as profileApi from '../../services/profileApi';
import * as subscriptionApi from '../../services/subscriptionApi';
import type { ProfileUser } from '../../services/profileApi';

// ── Design tokens (mirrors App.tsx SG tokens) ─────────────────────────────
const SG = {
    bg: 'var(--bg-header)', bg2: 'var(--bg-base)', surface: 'var(--bg-surface)', bgMuted: 'var(--bg-muted)',
    border: 'var(--border)', green: 'var(--accent)', greenBg: 'var(--accent-bg)',
    red: 'var(--semantic-red)', redBg: 'var(--semantic-red-bg)', yellow: 'var(--semantic-gold)',
    text: 'var(--text-primary)', textSecond: 'var(--text-second)', muted: 'var(--text-muted)',
    sans: "'Plus Jakarta Sans', sans-serif",
};

// ── Shared sub-components ─────────────────────────────────────────────────

const Card = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{ background: SG.surface, borderRadius: 16, border: `1px solid ${SG.border}`, overflow: 'hidden', ...style }}>
        {children}
    </div>
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
            width: '100%', padding: '12px 14px', background: SG.bg2, border: `1px solid ${SG.border}`,
            borderRadius: 10, color: SG.text, fontSize: 14, fontFamily: SG.sans, outline: 'none', boxSizing: 'border-box', ...props.style,
        }}
    />
);

const Textarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        style={{
            width: '100%', padding: '12px 14px', background: SG.bg2, border: `1px solid ${SG.border}`,
            borderRadius: 10, color: SG.text, fontSize: 14, fontFamily: SG.sans, outline: 'none', resize: 'vertical', boxSizing: 'border-box', ...props.style
        }}
    />
);

const PrimaryBtn = ({ children, loading, ...props }: { children: React.ReactNode; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...props}
        disabled={props.disabled || loading}
        style={{
            width: '100%',
            background: props.disabled ? SG.bgMuted : SG.green, color: props.disabled ? SG.muted : '#0a0f10',
            border: 'none', padding: '12px 20px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
            fontFamily: SG.sans, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s', ...props.style,
        }}
    >
        {loading && <RefreshCw size={16} className="animate-spin" />}
        {!loading && children}
    </button>
);

const OutlineBtn = ({ children, ...props }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...props}
        style={{
            background: 'transparent', color: SG.textSecond, border: `1px solid ${SG.border}`,
            padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            fontFamily: SG.sans, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', ...props.style
        }}
    >
        {children}
    </button>
);

const DangerBtn = ({ children, outline, ...props }: { children: React.ReactNode, outline?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...props}
        style={{
            background: outline ? 'transparent' : SG.bgMuted, color: SG.red, border: `1px solid ${SG.red}`,
            padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            fontFamily: SG.sans, display: 'flex', alignItems: 'center', justifyContent: outline ? 'center' : 'flex-start', gap: 6, transition: 'all 0.15s', ...props.style,
        }}
    >
        {children}
    </button>
);

const Toast = ({ msg, type }: { msg: string; type: 'error' | 'success' | 'info' }) => (
    <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        borderRadius: 10, marginBottom: 16,
        background: type === 'error' ? SG.redBg : type === 'info' ? 'rgba(34,197,94,0.05)' : SG.greenBg,
        border: `1px solid ${type === 'error' ? SG.red : SG.green}`,
        color: type === 'error' ? SG.red : SG.green, fontSize: 13, fontFamily: SG.sans,
    }}>
        {type === 'error' ? <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : 
         type === 'info' ? <Info size={16} style={{ flexShrink: 0, marginTop: 1, color: SG.green }} /> : 
         <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
        {msg}
    </div>
);

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange?: () => void, disabled?: boolean }) => (
    <button
        onClick={disabled ? undefined : onChange}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer',
            background: checked ? SG.green : SG.bg2,
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            opacity: disabled ? 0.5 : 1
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
        <Input value={value} onChange={e => onChange(e.target.value.slice(0, 6))} placeholder="6-digit" maxLength={6} style={{ width: 120, letterSpacing: '0.2em', fontSize: 16, textAlign: 'center' }} />
        <PrimaryBtn onClick={onSubmit} loading={loading} style={{ width: 'auto' }}>Verify</PrimaryBtn>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ══════════════════════════════════════════════════════════════════════════════

export const AccountTab: React.FC<{ authUser: ProfileUser; onUserUpdate: (u: ProfileUser) => void }> = ({ authUser, onUserUpdate }) => {
    const p = useProfile(authUser);
    const [name, setName] = useState(authUser.display_name);
    const [bio, setBio] = useState(authUser.bio ?? '');
    const phone = authUser.phone || '+6281234567890'; // fallback for display 
    const [isEditing, setIsEditing] = useState(false);
    
    // For account deletion
    const [deletePass, setDeletePass] = useState('');
    const [showDelete, setShowDelete] = useState(false);

    const handleSaveProfile = async () => {
        const updated = await p.update({ display_name: name, bio });
        if (updated) {
            onUserUpdate(updated);
            setIsEditing(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {p.error && <Toast msg={p.error} type="error" />}
            {p.success && <Toast msg={p.success} type="success" />}

            {/* Profile Info Card */}
            <Card style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 32, background: SG.greenBg, border: `1px solid ${SG.green}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 24, fontWeight: 800, color: SG.green, fontFamily: SG.sans, flexShrink: 0,
                        }}>
                            {(p.profile?.display_name || authUser.display_name)[0].toUpperCase()}
                        </div>
                        <div>
                            <p style={{ color: SG.text, fontWeight: 800, fontSize: 18, fontFamily: SG.sans, margin: 0 }}>{p.profile?.display_name || authUser.display_name}</p>
                            <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, margin: '2px 0 6px' }}>{p.profile?.email || authUser.email}</p>
                            <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0 }}>Bergabung Januari 2026</p>
                        </div>
                    </div>
                    {!isEditing && (
                        <OutlineBtn onClick={() => setIsEditing(true)}>Edit</OutlineBtn>
                    )}
                </div>

                {isEditing ? (
                    <div style={{ borderTop: `1px solid ${SG.border}`, paddingTop: 20, marginTop: 10 }}>
                        <div style={{ marginBottom: 16 }}>
                            <FieldLabel>Display Name</FieldLabel>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <FieldLabel>Bio</FieldLabel>
                            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Short bio (optional)" />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <PrimaryBtn loading={p.loading} onClick={handleSaveProfile} style={{ flex: 1 }}>Simpan</PrimaryBtn>
                            <OutlineBtn onClick={() => setIsEditing(false)} style={{ flex: 1, justifyContent: 'center' }}>Batal</OutlineBtn>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', alignItems: 'baseline', paddingTop: 20 }}>
                        <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0 }}>Telepon</p>
                        <p style={{ color: SG.textSecond, fontSize: 13, fontFamily: SG.sans, margin: 0 }}>{phone}</p>
                        <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0 }}>Bio</p>
                        <p style={{ color: SG.textSecond, fontSize: 13, fontFamily: SG.sans, margin: 0 }}>{bio || 'Belum ada bio.'}</p>
                    </div>
                )}
            </Card>

            {/* Danger Zone */}
            <Card style={{ padding: 20, borderColor: `${SG.red}33`, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={16} color={SG.red} />
                    <h3 style={{ color: SG.red, fontSize: 13, fontWeight: 800, fontFamily: SG.sans, margin: 0, textTransform: 'uppercase' }}>Danger Zone</h3>
                </div>
                {authUser.auth_provider === 'clerk' ? (
                    <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, margin: 0 }}>
                        Account deletion and primary login credentials are managed by Clerk. Use the Clerk account center in the Security tab for identity-level changes.
                    </p>
                ) : !showDelete ? (
                    <>
                        <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginBottom: 16, marginTop: 4 }}>Menghapus akun bersifat permanen. Semua data kamu akan hilang.</p>
                        <DangerBtn outline onClick={() => setShowDelete(true)} style={{ width: 'fit-content' }}>Hapus Akun</DangerBtn>
                    </>
                ) : (
                    <>
                        <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginBottom: 12 }}>This cannot be undone. Enter your password to confirm.</p>
                        <div style={{ marginBottom: 12 }}>
                            <Input type="password" value={deletePass} onChange={e => setDeletePass(e.target.value)} placeholder="Confirm password" />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <DangerBtn outline onClick={async () => {
                                try { await profileApi.deleteAccount(deletePass); window.location.reload(); } catch (e: any) { p.setError ? p.setError(e.message) : alert(e.message); }
                            }}>Confirm Delete</DangerBtn>
                            <OutlineBtn onClick={() => setShowDelete(false)}>Batal</OutlineBtn>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// SECURITY TAB
// ══════════════════════════════════════════════════════════════════════════════

export const SecurityTab: React.FC<{ authUser: ProfileUser }> = ({ authUser }) => {
    const p = useProfile(authUser);
    const mfa = useMfa();

    if (authUser.auth_provider === 'clerk') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Toast type="info" msg="Authentication, password, MFA, and device security are managed by Clerk. Your billing and app profile still stay inside IDX AI Trader." />
                <Card style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Shield size={18} color="#3b82f6" />
                        <h3 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Account Security Center</h3>
                    </div>
                    <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginTop: 0, marginBottom: 16 }}>
                        Use Clerk to manage sign-in methods, multi-factor authentication, active sessions, and identity details.
                    </p>
                    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${SG.border}` }}>
                        <ClerkUserProfile
                            routing="hash"
                            appearance={{
                                variables: {
                                    colorPrimary: '#10b981',
                                    colorBackground: '#0f172a',
                                    colorInputBackground: '#020617',
                                    colorInputText: '#f8fafc',
                                    colorText: '#f8fafc',
                                    colorTextSecondary: '#94a3b8',
                                },
                            }}
                        />
                    </div>
                </Card>
            </div>
        );
    }
    
    // Change password state
    const [curPass, setCurPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confPass, setConfPass] = useState('');
    const [showPass1, setShowPass1] = useState(false);
    const [showPass2, setShowPass2] = useState(false);
    const [showPass3, setShowPass3] = useState(false);

    // Change email state
    const [newEmail, setNewEmail] = useState('');
    const [emailPass, setEmailPass] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailStep, setEmailStep] = useState<'idle' | 'otp'>('idle');

    // MFA and sessions state
    const [totpToken, setTotpToken] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [sessions, setSessions] = useState<profileApi.SessionInfo[]>([]);

    useEffect(() => {
        mfa.fetchStatus();
        profileApi.listSessions().then(setSessions).catch(() => { });
    }, []);

    const handleChangePass = async () => {
        const ok = await p.changePassword({ current_password: curPass, new_password: newPass, confirm_password: confPass });
        if(ok) { setCurPass(''); setNewPass(''); setConfPass(''); }
    };

    const handleInitEmail = async () => {
        const ok = await p.initiateEmailChange({ new_email: newEmail, current_password: emailPass });
        if (ok) setEmailStep('otp');
    };

    const handleVerifyEmail = async () => {
        const ok = await p.verifyEmailChange(emailOtp);
        if (ok) { setEmailStep('idle'); setNewEmail(''); setEmailPass(''); setEmailOtp(''); window.location.reload(); }
    };

    const copySecret = () => {
        if (mfa.totpSetup?.secret) {
            navigator.clipboard.writeText(mfa.totpSetup.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const MFABadge = ({ enabled }: { enabled: boolean }) => (
        <span style={{ fontSize: 10, fontWeight: 800, color: enabled ? SG.green : SG.muted, background: enabled ? SG.greenBg : SG.bg2, padding: '4px 8px', borderRadius: 8 }}>
            {enabled ? 'ON' : 'OFF'}
        </span>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {p.error && <Toast msg={p.error} type="error" />}
            {p.success && <Toast msg={p.success} type="success" />}
            {mfa.error && <Toast msg={mfa.error} type="error" />}
            {mfa.success && <Toast msg={mfa.success} type="success" />}

            {/* Change Password Card */}
            {authUser.auth_provider === 'local' && (
                <Card style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <Key size={18} color={SG.yellow} />
                        <h3 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Ganti Password</h3>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <FieldLabel>PASSWORD SAAT INI</FieldLabel>
                        <div style={{ position: 'relative' }}>
                            <Input type={showPass1 ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} />
                            <button onClick={() => setShowPass1(!showPass1)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', padding: 0 }}>
                                {showPass1 ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <FieldLabel>PASSWORD BARU</FieldLabel>
                        <div style={{ position: 'relative' }}>
                            <Input type={showPass2 ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} />
                            <button onClick={() => setShowPass2(!showPass2)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', padding: 0 }}>
                                {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <FieldLabel>KONFIRMASI PASSWORD</FieldLabel>
                        <div style={{ position: 'relative' }}>
                            <Input type={showPass3 ? 'text' : 'password'} value={confPass} onChange={e => setConfPass(e.target.value)} />
                            <button onClick={() => setShowPass3(!showPass3)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', padding: 0 }}>
                                {showPass3 ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <PrimaryBtn loading={p.loading} onClick={handleChangePass}>Ubah Password</PrimaryBtn>
                </Card>
            )}

            {/* Change Email Card */}
            <Card style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Mail size={18} color="#e2e8f0" />
                    <h3 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Ganti Email</h3>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: emailStep === 'idle' ? 1 : 0.5 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 10, background: SG.green, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>1</span>
                        <span style={{ color: SG.green, fontSize: 12, fontWeight: 600 }}>Email Baru</span>
                    </div>
                    <div style={{ height: 1, width: 24, background: SG.border }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: emailStep === 'otp' ? 1 : 0.5 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 10, background: SG.bg2, color: SG.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>2</span>
                        <span style={{ color: SG.muted, fontSize: 12, fontWeight: 600 }}>Verifikasi OTP</span>
                    </div>
                </div>

                {emailStep === 'idle' ? (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email.baru@example.com" />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <Input type="password" value={emailPass} onChange={e => setEmailPass(e.target.value)} placeholder="Password saat ini" />
                        </div>
                        <PrimaryBtn loading={p.loading} onClick={handleInitEmail}>Kirim OTP</PrimaryBtn>
                    </>
                ) : (
                    <>
                        <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginBottom: 12 }}>Kode dikirim ke <strong style={{color: SG.text}}>{newEmail}</strong>.</p>
                        <OTPInput value={emailOtp} onChange={setEmailOtp} onSubmit={handleVerifyEmail} loading={p.loading} />
                        <button onClick={() => { setEmailStep('idle'); p.clearMessages(); }} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 13, marginTop: 12, padding: 0 }}>Batal</button>
                    </>
                )}
            </Card>

            {/* Two-Factor Authentication */}
            <Card style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Shield size={18} color="#3b82f6" />
                    <h3 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Two-Factor Authentication</h3>
                </div>
                <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, marginTop: 0, marginBottom: 20 }}>Lindungi akun dengan lapisan keamanan tambahan.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        { id: 'totp', icon: <Smartphone size={18} color="#a855f7" />, title: 'Authenticator App', desc: 'Google Authenticator, Authy' },
                        { id: 'email_otp', icon: <Mail size={18} color="#60a5fa" />, title: 'Email OTP', desc: 'Kode dikirim ke email kamu' },
                        { id: 'sms_otp', icon: <Phone size={18} color="#f4f4f5" />, title: 'SMS OTP', desc: 'Kode dikirim ke nomor HP' },
                    ].map(item => {
                        const isEnabled = mfa.status?.mfa_enabled && mfa.status?.mfa_type === item.id;
                        return (
                            <div key={item.id} style={{ background: SG.bg2, borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${SG.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: SG.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p style={{ color: SG.text, fontWeight: 800, fontSize: 14, margin: '0 0 2px', fontFamily: SG.sans }}>{item.title}</p>
                                        <p style={{ color: SG.muted, fontSize: 12, margin: 0, fontFamily: SG.sans }}>{item.desc}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MFABadge enabled={isEnabled ?? false} />
                                    {isEnabled ? (
                                        <OutlineBtn onClick={() => mfa.removeTOTP(curPass)} style={{ color: SG.red, borderColor: `${SG.red}33`, padding: '6px 12px' }}>Disable</OutlineBtn>
                                    ) : (
                                        <OutlineBtn 
                                            onClick={() => item.id === 'totp' ? mfa.startTOTP() : item.id === 'email_otp' ? mfa.startEmailOTP() : mfa.startSMSOTP(authUser.phone || undefined)} 
                                            style={{ color: SG.green, borderColor: `${SG.green}44`, padding: '6px 16px' }}>Set Up
                                        </OutlineBtn>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Setup Modals (embedded) */}
                {mfa.step === 'totp_pending' && mfa.totpSetup && (
                    <div style={{ background: SG.bg2, padding: 20, borderRadius: 16, border: `1px solid ${SG.border}`, marginTop: 16 }}>
                        <p style={{ color: SG.text, fontSize: 13, fontFamily: SG.sans, marginTop: 0 }}>Scan with Google Authenticator, Authy, or similar:</p>
                        <img src={mfa.totpSetup.qr_code_data_url} alt="QR Code" style={{ width: 160, height: 160, borderRadius: 12, marginBottom: 12 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <code style={{ background: SG.surface, padding: '8px 12px', borderRadius: 8, color: SG.green, fontSize: 13, letterSpacing: '0.1em', flex: 1 }}>{mfa.totpSetup.secret}</code>
                            <button onClick={copySecret} style={{ background: 'none', border: `1px solid ${SG.border}`, borderRadius: 8, color: copied ? SG.green : SG.text, cursor: 'pointer', padding: '8px' }}>
                                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                        <FieldLabel>Enter 6-digit code to confirm</FieldLabel>
                        <OTPInput value={totpToken} onChange={setTotpToken} onSubmit={() => mfa.confirmTOTP(totpToken)} loading={mfa.loading} />
                        <button onClick={mfa.reset} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', fontSize: 13, marginTop: 12, padding: 0 }}>Batal</button>
                    </div>
                )}
                {/* ... existing other steps ... */}
            </Card>

            {/* Active Sessions */}
            <Card style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <Monitor size={18} color="#e2e8f0" />
                    <h3 style={{ color: SG.text, fontSize: 16, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>Sesi Aktif</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {sessions.map((s, i) => {
                        const isCurrent = i === 0; // rough heuristic that first session is current if API sorts by current
                        const browser = s.user_agent?.toLowerCase().includes('safari') && !s.user_agent?.toLowerCase().includes('chrome') ? 'Safari' : s.user_agent?.toLowerCase().includes('firefox') ? 'Firefox' : 'Chrome';
                        const os = s.user_agent?.toLowerCase().includes('iphone') ? 'iPhone' : s.user_agent?.toLowerCase().includes('mac') ? 'macOS' : 'Windows';
                        
                        return (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: SG.bg2, borderRadius: 12, border: `1px solid ${isCurrent ? SG.green : SG.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {browser === 'Safari' ? <Smartphone size={20} color="#a855f7" /> : browser === 'Firefox' ? <Monitor size={20} color="#f97316" /> : <Chrome size={20} color="#3b82f6" />}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 2px' }}>
                                            <p style={{ color: SG.text, fontSize: 14, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>{browser} · {os}</p>
                                            {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: SG.green, background: SG.greenBg, padding: '2px 6px', borderRadius: 4 }}>AKTIF INI</span>}
                                        </div>
                                        <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0 }}>
                                            {s.ip_address || 'Unknown IP'} · {new Date(s.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                                        </p>
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <OutlineBtn onClick={async () => { await profileApi.revokeSession(s.id); setSessions(prev => prev.filter(x => x.id !== s.id)); }}
                                        style={{ color: SG.red, borderColor: `${SG.red}33`, opacity: 0.8 }}>Cabut</OutlineBtn>
                                )}
                            </div>
                        )
                    })}
                </div>
                <DangerBtn outline style={{ width: '100%' }} onClick={async () => { await profileApi.revokeAllOtherSessions(); setSessions([]); }}>
                    Cabut Semua Sesi Lainnya
                </DangerBtn>
            </Card>
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

    const group = (items: Array<{ key: keyof typeof n.prefs; icon: React.ReactNode, label: string; desc: string, disabled?: boolean, badge?: string }>) => (
        <div style={{ background: SG.surface, borderRadius: 16, border: `1px solid ${SG.border}`, overflow: 'hidden' }}>
            {items.map((item, i) => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < items.length - 1 ? `1px solid ${SG.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: item.disabled ? 0.6 : 1 }}>
                        {item.icon}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
                                <p style={{ color: SG.text, fontSize: 15, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>{item.label}</p>
                                {item.badge && <span style={{ fontSize: 10, fontWeight: 800, color: SG.yellow, border: `1px solid ${SG.yellow}`, padding: '2px 6px', borderRadius: 6 }}>{item.badge}</span>}
                            </div>
                            <p style={{ color: SG.muted, fontSize: 13, fontFamily: SG.sans, margin: 0 }}>{item.desc}</p>
                        </div>
                    </div>
                    <ToggleSwitch checked={!!n.prefs?.[item.key]} onChange={() => n.toggle(item.key)} disabled={item.disabled} />
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {n.error && <Toast msg={n.error} type="error" />}

            <div>
                <h2 style={{ color: SG.text, fontSize: 15, fontWeight: 800, fontFamily: SG.sans, marginTop: 0, marginBottom: 12 }}>Preferensi Notifikasi</h2>
                {group([
                    { key: 'price_alerts', icon: <Bell size={20} color={SG.yellow} />, label: 'Price Alerts', desc: 'Notif saat watchlist mencapai target harga' },
                    { key: 'news_alerts', icon: <Monitor size={20} color="#e2e8f0" />, label: 'News Alerts', desc: 'Berita AI-curated untuk saham portofoliomu' },
                    { key: 'portfolio_digest', icon: <Monitor size={20} color="#10b981" />, label: 'Portfolio Digest', desc: 'Ringkasan harian performa portofolio' },
                    { key: 'market_open', icon: <div style={{width: 14, height: 14, borderRadius: 7, background: '#10b981'}}/>, label: 'Sesi Bursa Buka', desc: 'Alert saat IDX dibuka (09:00 WIB)' },
                    { key: 'market_close', icon: <div style={{width: 14, height: 14, borderRadius: 7, background: '#ef4444'}}/>, label: 'Sesi Bursa Tutup', desc: 'Alert saat IDX ditutup (15:50 WIB)' },
                ])}
            </div>

            <div>
                <h2 style={{ color: SG.text, fontSize: 15, fontWeight: 800, fontFamily: SG.sans, marginTop: 0, marginBottom: 12 }}>Saluran Pengiriman</h2>
                {group([
                    { key: 'email_enabled', icon: <Mail size={20} color="#60a5fa" />, label: 'Email', desc: 't***@sahamgue.id' },
                    { key: 'push_enabled', icon: <Smartphone size={20} color="#a855f7" />, label: 'Push Notification', desc: 'Browser & mobile push — coming soon', disabled: true, badge: 'Segera' },
                ])}
            </div>

            <Toast type="info" msg="Perubahan disimpan otomatis. Price alerts butuh watchlist aktif untuk berfungsi." />
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// PLAN CARD (Rendered inside AccountTab visually)
// ══════════════════════════════════════════════════════════════════════════════

export const PlanCard: React.FC<{ authUser: ProfileUser }> = ({ authUser }) => {
    const [plan, setPlan] = useState<profileApi.PlanInfo | null>(null);
    const [autoRenew, setAutoRenew] = useState<subscriptionApi.AutoRenewStatus | null>(null);
    const [billingMsg, setBillingMsg] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
    const [billingLoading, setBillingLoading] = useState(false);

    const loadBillingState = async () => {
        try {
            const [planData, autoRenewData] = await Promise.all([
                profileApi.getPlan(),
                subscriptionApi.getAutoRenewStatus(),
            ]);
            setPlan(planData);
            setAutoRenew(autoRenewData);
        } catch {
            setBillingMsg({ type: 'error', text: 'Tidak bisa memuat status billing saat ini.' });
        }
    };

    useEffect(() => {
        loadBillingState();
    }, []);

    const handleDisableAutoRenew = async () => {
        try {
            setBillingLoading(true);
            const result = await subscriptionApi.disableAutoRenew();
            setAutoRenew(result);
            setBillingMsg({ type: 'success', text: result.message });
        } catch (error: any) {
            setBillingMsg({ type: 'error', text: error?.message || 'Gagal mematikan auto-renew.' });
        } finally {
            setBillingLoading(false);
        }
    };

    const handleCancelPlan = async () => {
        try {
            setBillingLoading(true);
            const result = await subscriptionApi.cancelAtPeriodEnd();
            setAutoRenew(result);
            setBillingMsg({ type: 'info', text: result.message });
        } catch (error: any) {
            setBillingMsg({ type: 'error', text: error?.message || 'Gagal memperbarui status langganan.' });
        } finally {
            setBillingLoading(false);
        }
    };

    const currentPlan = plan?.plan || authUser.plan;
    const planExpiry = autoRenew?.expires_at || plan?.plan_expires_at || authUser.plan_expires_at || null;
    const isPaidPlan = currentPlan === 'PRO' || currentPlan === 'EXPERT';
    const featureCards = [
        {
            label: 'Watchlist',
            desc: plan ? `Maks ${plan.features.watchlist_limit} saham` : 'Menyesuaikan paket',
            icon: <CheckCircle size={14} color={SG.green} />,
            locked: false,
        },
        {
            label: 'Price Alerts',
            desc: plan?.features.alert_limit ? `Maks ${plan.features.alert_limit} alert` : 'Sesuai paket aktif',
            icon: <CheckCircle size={14} color={SG.green} />,
            locked: false,
        },
        {
            label: 'AI News Analysis',
            desc: plan?.features.news_ai ? 'Aktif di paketmu' : 'Upgrade ke Pro',
            icon: plan?.features.news_ai ? <CheckCircle size={14} color={SG.green} /> : <Lock size={14} color={SG.yellow} />,
            locked: !plan?.features.news_ai,
        },
        {
            label: 'Billing Control',
            desc: autoRenew?.enabled ? 'Auto-renew aktif' : 'Manual renewal',
            icon: autoRenew?.enabled ? <CheckCircle size={14} color={SG.green} /> : <Lock size={14} color={SG.yellow} />,
            locked: !autoRenew?.enabled,
        },
    ];

    return (
        <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ color: SG.text, fontSize: 18, fontWeight: 900, fontFamily: SG.sans, margin: 0 }}>Paket Saat Ini</h2>
            </div>

            {billingMsg && <Toast msg={billingMsg.text} type={billingMsg.type} />}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: SG.textSecond, background: SG.bgMuted, padding: '6px 16px', borderRadius: 8 }}>{currentPlan}</span>
                {!isPaidPlan && (
                    <button style={{ background: SG.yellow, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                        Upgrade ke Pro
                    </button>
                )}
            </div>

            <div style={{ background: SG.bg2, border: `1px solid ${SG.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                    <div>
                        <p style={{ color: SG.muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Status</p>
                        <p style={{ color: SG.text, fontSize: 14, fontWeight: 800, margin: 0 }}>{autoRenew?.enabled ? 'Auto-renew aktif' : 'Manual renewal'}</p>
                    </div>
                    <div>
                        <p style={{ color: SG.muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Berakhir</p>
                        <p style={{ color: SG.text, fontSize: 14, fontWeight: 800, margin: 0 }}>
                            {planExpiry ? new Date(planExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ada tanggal aktif'}
                        </p>
                    </div>
                </div>
                {autoRenew?.message && (
                    <p style={{ color: SG.textSecond, fontSize: 13, margin: '12px 0 0', fontFamily: SG.sans }}>{autoRenew.message}</p>
                )}
            </div>

            {isPaidPlan && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    {autoRenew?.enabled && (
                        <OutlineBtn onClick={handleDisableAutoRenew} disabled={billingLoading}>
                            {billingLoading ? 'Memproses...' : 'Matikan Auto-Renew'}
                        </OutlineBtn>
                    )}
                    <DangerBtn outline onClick={handleCancelPlan} disabled={billingLoading} style={{ width: 'auto', justifyContent: 'center' }}>
                        {billingLoading ? 'Memproses...' : 'Batalkan Saat Periode Berakhir'}
                    </DangerBtn>
                </div>
            )}

            {plan && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                    {featureCards.map(item => (
                        <div key={item.label} style={{ background: item.locked ? 'transparent' : SG.bgMuted, border: item.locked ? `1px solid ${SG.border}` : 'none', borderRadius: 12, padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                {item.icon}
                                <p style={{ color: item.locked ? SG.muted : SG.text, fontSize: 13, fontWeight: 800, fontFamily: SG.sans, margin: 0 }}>{item.label}</p>
                            </div>
                            <p style={{ color: SG.muted, fontSize: 12, fontFamily: SG.sans, margin: 0, paddingLeft: 22 }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};
