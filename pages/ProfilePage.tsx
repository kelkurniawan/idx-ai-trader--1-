import React, { useState } from 'react';
import { ChevronLeft, User, Shield, Bell, Settings as SettingsIcon } from 'lucide-react';
import { AccountTab, SecurityTab, NotificationsTab, PlanCard } from '../components/profile/ProfileTabs';
import type { ProfileUser } from '../services/profileApi';

type Tab = 'account' | 'security' | 'notifications';

interface ProfilePageProps {
    authUser: ProfileUser;
    onBack: () => void;
    onUserUpdate: (u: ProfileUser) => void;
}

const SG = {
    bg: 'var(--bg-base)', surface: 'var(--bg-surface)', bgMuted: 'var(--bg-muted)', border: 'var(--border)',
    green: 'var(--accent)', greenBg: 'var(--accent-bg)', text: 'var(--text-primary)',
    textSecond: 'var(--text-second)', muted: 'var(--text-muted)', sans: "'Plus Jakarta Sans', sans-serif",
    yellow: 'var(--semantic-gold)'
};

const ProfilePage: React.FC<ProfilePageProps> = ({ authUser, onBack, onUserUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('account');

    return (
        <div style={{ minHeight: '100vh', background: SG.bg, fontFamily: SG.sans, paddingBottom: 60 }}>
            {/* Top Bar with Back Button */}
            <div style={{ padding: '20px 20px 10px', display: 'flex' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 13, fontWeight: 700 }}>
                    <ChevronLeft size={18} /> Back
                </button>
            </div>

            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {/* Header (Settings Title) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '0 20px' }}>
                    <div style={{ width: 52, height: 52, background: SG.surface, borderRadius: 16, border: `1px solid ${SG.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SettingsIcon size={26} color={SG.textSecond} />
                    </div>
                    <div>
                        <h1 style={{ color: SG.text, fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', fontFamily: SG.sans }}>Settings</h1>
                        <p style={{ color: SG.muted, fontSize: 13, margin: '4px 0 0', fontFamily: SG.sans }}>Kelola akun dan preferensimu</p>
                    </div>
                </div>

                {/* Horizontal Navigation Pills */}
                <div style={{ 
                    display: 'flex', gap: 12, padding: '0 20px', marginBottom: 24, 
                    overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' 
                }}>
                    <button
                        onClick={() => setActiveTab('account')}
                        style={{
                            flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12,
                            background: activeTab === 'account' ? SG.green : SG.surface,
                            color: activeTab === 'account' ? '#0a0f10' : SG.textSecond, // Dark text on green when active
                            fontWeight: 800, fontSize: 13, border: activeTab === 'account' ? `1px solid ${SG.green}` : `1px solid ${SG.border}`, 
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: SG.sans
                        }}
                    >
                        <User size={16} color={activeTab === 'account' ? '#0a0f10' : '#8b5cf6'} />
                        Account
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{
                            flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12,
                            background: activeTab === 'security' ? SG.green : SG.surface,
                            color: activeTab === 'security' ? '#0a0f10' : SG.textSecond,
                            fontWeight: 800, fontSize: 13, border: activeTab === 'security' ? `1px solid ${SG.green}` : `1px solid ${SG.border}`, 
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: SG.sans
                        }}
                    >
                        <Shield size={16} color={activeTab === 'security' ? '#0a0f10' : SG.yellow} />
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        style={{
                            flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12,
                            background: activeTab === 'notifications' ? SG.green : SG.surface,
                            color: activeTab === 'notifications' ? '#0a0f10' : SG.textSecond,
                            fontWeight: 800, fontSize: 13, border: activeTab === 'notifications' ? `1px solid ${SG.green}` : `1px solid ${SG.border}`, 
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: SG.sans
                        }}
                    >
                        <Bell size={16} color={activeTab === 'notifications' ? '#0a0f10' : '#f97316'} />
                        Notifikasi
                    </button>
                </div>

                {/* Main Content Area */}
                <main style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {activeTab === 'account' && (
                        <>
                            <AccountTab authUser={authUser} onUserUpdate={onUserUpdate} />
                            <PlanCard authUser={authUser} />
                        </>
                    )}
                    {activeTab === 'security' && <SecurityTab authUser={authUser} />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                </main>
            </div>
        </div>
    );
};

export default ProfilePage;
