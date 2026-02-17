import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Globe, Database, Shield, Zap, Layout, Microscope, Rocket, Search, X, Plus } from 'lucide-react';

const interests = [
    { id: 'ai', label: 'AI & Machine Learning', icon: Cpu, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
    { id: 'web', label: 'Modern Web Apps', icon: Globe, color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { id: 'data', label: 'Data Analytics', icon: Database, color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600' },
    { id: 'security', label: 'Cyber Defense', icon: Shield, color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600' },
    { id: 'fintech', label: 'FinTech Engineering', icon: Zap, color: 'bg-cyan-500', lightColor: 'bg-cyan-50', textColor: 'text-cyan-600' },
    { id: 'creative', label: 'Product Design', icon: Layout, color: 'bg-violet-500', lightColor: 'bg-violet-50', textColor: 'text-violet-600' },
    { id: 'research', label: 'Lab Research', icon: Microscope, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { id: 'startup', label: 'Startup Launchpad', icon: Rocket, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600' },
];

const InterestSelector = ({ selectedInterests, onToggle }) => {
    const [customQuery, setCustomQuery] = useState('');
    const [customTags, setCustomTags] = useState([]);

    const handleAddCustom = (e) => {
        e.preventDefault();
        const trimmed = customQuery.trim();
        if (trimmed && !customTags.includes(trimmed) && !selectedInterests.includes(trimmed)) {
            setCustomTags([...customTags, trimmed]);
            onToggle(trimmed);
            setCustomQuery('');
        }
    };

    const handleRemoveCustom = (tag) => {
        setCustomTags(customTags.filter(t => t !== tag));
        onToggle(tag);
    };

    return (
        <div className="space-y-5 w-full">
            {/* Custom Search Bar */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                    <Search size={14} className="text-slate-400" />
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Custom Interests</h4>
                </div>
                <form onSubmit={handleAddCustom} className="flex gap-2">
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="e.g., React Developer, Cloud Computing..."
                        className="input-field flex-1 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!customQuery.trim()}
                        className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Plus size={14} /> Add
                    </button>
                </form>

                {/* Custom Tags */}
                <AnimatePresence>
                    {customTags.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-wrap gap-2 pt-1 overflow-hidden"
                        >
                            {customTags.map(tag => (
                                <motion.span
                                    key={tag}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold border border-blue-100"
                                >
                                    {tag}
                                    <button onClick={() => handleRemoveCustom(tag)} className="hover:text-blue-800 transition-colors duration-200">
                                        <X size={12} />
                                    </button>
                                </motion.span>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Predefined Interest Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                {interests.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = selectedInterests.includes(item.id);

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onToggle(item.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(item.id); } }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`${item.label}${isSelected ? ' (selected)' : ''}`}
                            className={`cursor-pointer px-4 py-4 rounded-xl border transition-all duration-200 relative group overflow-hidden flex flex-col items-center justify-center text-center gap-2.5 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 ${isSelected
                                ? `bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-md shadow-blue-500/10 ring-1 ring-blue-400/30`
                                : 'bg-white border-slate-150 hover:border-slate-300 hover:shadow-md shadow-sm'
                                }`}
                        >
                            <div className={`p-2.5 rounded-lg ${isSelected ? item.color + ' text-white shadow-sm' : item.lightColor + ' ' + item.textColor} transition-all duration-200 group-hover:scale-110`}>
                                <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} />
                            </div>

                            <span className={`block font-semibold text-xs leading-tight transition-colors duration-200 ${isSelected ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                {item.label}
                            </span>

                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 90 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm"
                                    >
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default InterestSelector;

