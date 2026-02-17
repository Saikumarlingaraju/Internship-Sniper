import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Briefcase, FileText, LayoutDashboard, Settings, Zap, LogOut, Menu, X } from 'lucide-react';

const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'studio', label: 'Studio', icon: FileText },
    { id: 'hq', label: 'Dashboard', icon: LayoutDashboard },
];

const Sidebar = ({ activeSection, onNavigate }) => {
    const [toastMsg, setToastMsg] = React.useState(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const [showConfirm, setShowConfirm] = React.useState(false);

    const handleSettings = () => {
        let bookmarks = 0;
        try { bookmarks = JSON.parse(localStorage.getItem('sniper_bookmarks') || '[]').length; } catch {}
        const hasResume = !!localStorage.getItem('parsedResumeData');
        const country = localStorage.getItem('sniper_country') || 'India';
        showToast(`Resume: ${hasResume ? '✓' : '✗'} | Saved: ${bookmarks} | Region: ${country}`);
    };

    const handleLogout = () => {
        setShowConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('parsedResumeData');
        localStorage.removeItem('sniper_bookmarks');
        localStorage.removeItem('sniper_country');
        setShowConfirm(false);
        window.location.reload();
    };

    const handleNav = (id) => {
        onNavigate(id);
        setMobileOpen(false);
    };

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-[60] lg:hidden w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-sm"
                aria-label="Open menu"
            >
                <Menu size={20} />
            </button>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/40 z-[55] lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`fixed left-0 top-0 h-screen w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 z-[60] shadow-sm transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Mobile close */}
                <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 lg:hidden text-slate-400 hover:text-slate-600" aria-label="Close menu">
                    <X size={18} />
                </button>

                {/* Logo */}
                <div className="mb-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Zap className="text-white" size={24} />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col items-center gap-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleNav(item.id)}
                                className={`group relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isActive
                                        ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                    }`}
                            >
                                <Icon size={22} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="absolute -left-[1px] top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="tooltip-text">{item.label}</span>
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="flex flex-col items-center gap-2 mt-auto">
                    <button onClick={handleSettings} className="group relative w-12 h-12 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 flex items-center justify-center transition-all duration-200" title="Settings">
                        <Settings size={20} />
                        <span className="tooltip-text">Settings</span>
                    </button>
                    <button onClick={handleLogout} className="group relative w-12 h-12 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-all duration-200" title="Clear Data & Reset">
                        <LogOut size={20} />
                        <span className="tooltip-text">Reset</span>
                    </button>
                </div>

                {/* Toast */}
                {toastMsg && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50">
                        {toastMsg}
                    </div>
                )}
            </aside>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="font-bold text-slate-800 text-lg mb-2">Clear All Data?</h3>
                        <p className="text-sm text-slate-500 mb-6">This will remove your resume, saved jobs, and preferences. This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmLogout} className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                                Clear Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
