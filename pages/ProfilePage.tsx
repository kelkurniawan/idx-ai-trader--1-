import React, { useState } from 'react';
import { ChevronLeft, User, Shield, Bell, CreditCard } from 'lucide-react';
import { AccountTab, SecurityTab, NotificationsTab, PlanCard } from '../components/profile/ProfileTabs';
import type { ProfileUser } from '../services/profileApi';

type Tab = 'account' | 'security' | 'notifications' | 'plan';

interface ProfilePageProps {
    authUser: ProfileUser;
    onBack: () => void;
    onUserUpdate: (u: ProfileUser) => void;
}

const SG = {
    bg: '#0d1417', surface: '#151b1e', bgMuted: '#1e2a2f', border: '#1e2a2f',
    green: '#22c55e', greenBg: 'rgba(34,197,94,0.10)', text: '#f1f5f9',
    textSecond: '#94a3b8', muted: '#64748b', sans: "'Plus Jakarta Sans', sans-serif",
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User size={15} /> },
    { id: 'security', label: 'Security', icon: <Shield size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { id: 'plan', label: 'Plan', icon: <CreditCard size={15} /> },
];

const ProfilePage: React.FC<ProfilePageProps> = ({ authUser, onBack, onUserUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('account');

    return (
        <div style={{ minHeight: '100vh', background: SG.bg, fontFamily: SG.sans }}>
            {/* Header */}
            <div style={{
                height: 56, display: 'flex', alignItems: 'center', gap: 12,
                padding: '0 20px', background: SG.bg, borderBottom: `1px solid ${SG.border}`,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: SG.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 600 }}>
                    <ChevronLeft size={18} /> Back
                </button>
                <div style={{ width: 1, height: 20, background: SG.border }} />
                <h1 style={{ color: SG.text, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Profile Settings</h1>
            </div>

            <div style={{ display: 'flex', maxWidth: 900, margin: '0 auto', padding: '24px 16px', gap: 24 }}>

                {/* Sidebar tabs — desktop */}
                <nav style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start', position: 'sticky', top: 80 }}
                    className="hidden md:flex">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                                background: activeTab === tab.id ? SG.greenBg : 'transparent',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                color: activeTab === tab.id ? SG.green : SG.muted,
                                fontWeight: 600, fontSize: 13, fontFamily: SG.sans,
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Mobile horizontal tab bar */}
                <div className="flex md:hidden" style={{ position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 40, background: SG.surface, borderTop: `1px solid ${SG.border}`, padding: '0 4px', display: 'flex', justifyContent: 'space-around' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'transparent',
                                color: activeTab === tab.id ? SG.green : SG.muted,
                                fontWeight: 600, fontSize: 10, fontFamily: SG.sans,
                                borderTop: activeTab === tab.id ? `2px solid ${SG.green}` : '2px solid transparent',
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <main style={{ flex: 1, minWidth: 0 }}>
                    {activeTab === 'account' && <AccountTab authUser={authUser} onUserUpdate={onUserUpdate} />}
                    {activeTab === 'security' && <SecurityTab authUser={authUser} />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'plan' && <PlanCard authUser={authUser} />}
                </main>
            </div>
        </div>
    );
};

export default ProfilePage;
