import React, { useState } from 'react';
import StockManager from './StockManager';
import NewsManager from './NewsManager';
import DataImport from './DataImport';

type AdminTab = 'stocks' | 'news' | 'import';

interface AdminDashboardProps {
    onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('stocks');

    const tabs: { id: AdminTab; label: string; icon: string }[] = [
        { id: 'stocks', label: 'Stock Overrides', icon: '📊' },
        { id: 'news', label: 'News Manager', icon: '📰' },
        { id: 'import', label: 'Import / Export', icon: '📦' },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-xs font-black uppercase tracking-widest">Back</span>
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-100 dark:shadow-none">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-black tracking-tight">Admin Dashboard</h1>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Manual Data Management</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-6">
                {activeTab === 'stocks' && <StockManager />}
                {activeTab === 'news' && <NewsManager />}
                {activeTab === 'import' && <DataImport />}
            </div>
        </div>
    );
};

export default AdminDashboard;
