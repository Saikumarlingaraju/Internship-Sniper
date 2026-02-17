import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User } from 'lucide-react';

const Header = ({ onSearch }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [bookmarkCount, setBookmarkCount] = useState(0);
    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef(null);

    const refreshCount = useCallback(() => {
        try {
            setBookmarkCount(JSON.parse(localStorage.getItem('sniper_bookmarks') || '[]').length);
        } catch { setBookmarkCount(0); }
    }, []);

    useEffect(() => {
        refreshCount();
        window.addEventListener('storage', refreshCount);
        window.addEventListener('bookmarks-changed', refreshCount);
        return () => { window.removeEventListener('storage', refreshCount); window.removeEventListener('bookmarks-changed', refreshCount); };
    }, [refreshCount]);

    // Dismiss notification on outside click
    useEffect(() => {
        if (!showNotif) return;
        const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNotif]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSearch && searchQuery.trim()) {
            onSearch(searchQuery.trim());
        }
    };

    return (
        <header className="fixed top-0 left-0 lg:left-20 right-0 h-16 bg-white/80 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between px-4 pl-14 lg:pl-8 lg:px-8 z-40">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search internships, skills, companies..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all duration-200"
                    />
                </div>
            </form>

            {/* Right Section */}
            <div className="flex items-center gap-3">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotif(prev => !prev)}
                        className="relative w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 transition-all duration-200"
                        title="Saved Jobs"
                    >
                        <Bell size={18} />
                        {bookmarkCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-sm shadow-blue-500/30">
                                {bookmarkCount}
                            </span>
                        )}
                    </button>
                    {showNotif && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5 z-50"
                        >
                            <p className="text-xs font-bold text-slate-800 mb-1.5">Saved Jobs</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {bookmarkCount > 0
                                    ? `${bookmarkCount} job${bookmarkCount !== 1 ? 's' : ''} saved. Open Dashboard to manage.`
                                    : 'No saved jobs yet. Browse internships and save the ones you like!'}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                        <User size={16} />
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-xs font-bold text-slate-700">Student</p>
                        <p className="text-[10px] text-slate-400 font-medium">Free Plan</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
