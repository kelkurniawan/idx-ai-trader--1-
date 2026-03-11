import React, { useRef, useEffect, useState } from 'react';
import { User, Shield, Bell, CreditCard, LogOut, Moon, Sun, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ProfileMenuProps {
    userName: string;
    userEmail?: string;
    userInitial: string;
    plan?: string;
    onNavigateProfile: () => void;
    onNavigateSecurity: () => void;
    onNavigateNotifications: () => void;
    onNavigatePlan: () => void;
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const SG = {
    bg: 'var(--bg-header)', surface: 'var(--bg-surface)', bgMuted: 'var(--bg-muted)', border: 'var(--border)',
    green: 'var(--accent)', greenBg: 'var(--accent-bg)', text: 'var(--text-primary)',
    textSecond: 'var(--text-second)', muted: 'var(--text-muted)', red: 'var(--semantic-red)', redBg: 'var(--semantic-red-bg)',
    sans: "'Plus Jakarta Sans', sans-serif",
};

const MenuItem = ({ icon, label, badge, onClick, danger }: {
    icon: React.ReactNode; label: string; badge?: string; onClick: () => void; danger?: boolean;
}) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '11px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: danger ? SG.red : SG.text, fontFamily: SG.sans, fontSize: 13, fontWeight: 600,
            textAlign: 'left', borderRadius: 8, transition: 'background 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = danger ? SG.redBg : SG.bgMuted)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
        <span style={{ color: danger ? SG.red : SG.muted, flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: SG.green, background: SG.greenBg, padding: '2px 7px', borderRadius: 6 }}>{badge}</span>}
        <ChevronRight size={13} style={{ color: SG.muted, flexShrink: 0 }} />
    </button>
);

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    userName, userEmail, userInitial, plan = 'FREE',
    onNavigateProfile, onNavigateSecurity, onNavigateNotifications, onNavigatePlan,
    onLogout, isOpen, onClose,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 999,
                width: 260, background: SG.surface, borderRadius: 16, border: `1px solid ${SG.border}`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden',
                animation: 'profileMenuIn 0.15s ease',
            }}
        >
            {/* User card */}
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${SG.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, background: SG.greenBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 800, color: SG.green, fontFamily: SG.sans, flexShrink: 0,
                    }}>{userInitial}</div>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ color: SG.text, fontWeight: 700, fontSize: 14, fontFamily: SG.sans, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                        <p style={{ color: SG.muted, fontSize: 11, fontFamily: SG.sans, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: SG.green, background: SG.greenBg, padding: '2px 7px', borderRadius: 5, marginTop: 4, display: 'inline-block' }}>{plan}</span>
                    </div>
                </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '8px' }}>
                <MenuItem icon={<User size={15} />} label="Account Info" onClick={() => { onNavigateProfile(); onClose(); }} />
                <MenuItem icon={<Shield size={15} />} label="Security & MFA" onClick={() => { onNavigateSecurity(); onClose(); }} />
                <MenuItem icon={<Bell size={15} />} label="Notifications" onClick={() => { onNavigateNotifications(); onClose(); }} />
                <MenuItem icon={<CreditCard size={15} />} label="Plan & Billing" badge={plan} onClick={() => { onNavigatePlan(); onClose(); }} />

                <div style={{ height: 1, background: SG.border, margin: '8px 0' }} />

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: '11px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: SG.text, fontFamily: SG.sans, fontSize: 13, fontWeight: 600, textAlign: 'left', borderRadius: 8,
                        transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = SG.bgMuted)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <span style={{ color: SG.muted }}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</span>
                    <span style={{ flex: 1 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    <div style={{
                        width: 36, height: 20, borderRadius: 10, background: isDark ? SG.border : SG.green, position: 'relative', transition: 'background 0.2s',
                    }}>
                        <span style={{ display: 'block', width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 3, left: isDark ? 3 : 19, transition: 'left 0.2s' }} />
                    </div>
                </button>

                <div style={{ height: 1, background: SG.border, margin: '8px 0' }} />

                <MenuItem icon={<LogOut size={15} />} label="Sign Out" onClick={onLogout} danger />
            </div>

            <style>{`
                @keyframes profileMenuIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ProfileMenu;
