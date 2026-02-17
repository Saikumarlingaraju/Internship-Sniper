import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Bookmark, FileText, Trash2, ArrowRight, TrendingUp, ShieldCheck, Download, X } from 'lucide-react';

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLORS = {
    Saved: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
    Applied: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    Interview: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    Offer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    Rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/20'
};

const HQDashboard = ({ isOpen, onClose }) => {
    const [savedJobs, setSavedJobs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sniper_bookmarks') || '[]'); }
        catch { return []; }
    });
    const [hasResume, setHasResume] = useState(false);
    const [resumeName, setResumeName] = useState('');
    const [stats, setStats] = useState({
        readiness: 0,
        activity: 0,
        value: "Scanning..."
    });

    // Lock body scroll when dashboard is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const updateStats = () => {
            let jobs = [];
            try { jobs = JSON.parse(localStorage.getItem('sniper_bookmarks') || '[]'); } catch {}
            setSavedJobs(jobs);
            const resumeRaw = localStorage.getItem('parsedResumeData');
            const resumeExists = !!resumeRaw;
            setHasResume(resumeExists);

            let resumeData = null;
            if (resumeExists) {
                try { resumeData = JSON.parse(resumeRaw); } catch {}
                setResumeName(resumeData?.name || 'Resume');
            }

            // Compute honest readiness from actual resume completeness
            let readiness = 0;
            if (resumeData) {
                const fields = ['name', 'email', 'phone', 'summary', 'skills', 'degree', 'institution'];
                const filled = fields.filter(f => resumeData[f] && String(resumeData[f]).trim().length > 0).length;
                const hasExperience = Array.isArray(resumeData.experience) && resumeData.experience.some(e => e.company || e.description);
                readiness = Math.round(((filled / fields.length) * 70) + (hasExperience ? 20 : 0) + (jobs.length > 0 ? 10 : 0));
            }

            // Compute honest market value label
            let value = 'NOT STARTED';
            if (readiness >= 80 && jobs.length >= 3) value = 'COMPETITIVE';
            else if (readiness >= 60) value = 'BUILDING';
            else if (readiness > 0) value = 'EARLY STAGE';

            setStats({
                readiness,
                activity: jobs.length,
                value
            });
        };
        updateStats();
        window.addEventListener('storage', updateStats);
        return () => window.removeEventListener('storage', updateStats);
    }, [isOpen]);

    const removeJob = (id) => {
        const updated = savedJobs.filter(j => j.id !== id);
        setSavedJobs(updated);
        localStorage.setItem('sniper_bookmarks', JSON.stringify(updated));
        window.dispatchEvent(new Event('bookmarks-changed'));
    };

    const updateJobStatus = (id, newStatus) => {
        const updated = savedJobs.map(j => j.id === id ? { ...j, status: newStatus } : j);
        setSavedJobs(updated);
        localStorage.setItem('sniper_bookmarks', JSON.stringify(updated));
        window.dispatchEvent(new Event('bookmarks-changed'));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
            >
                <div className="w-full h-full max-w-7xl glass rounded-[3rem] overflow-hidden flex flex-col border border-white/10 shadow-2xl relative">
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <LayoutDashboard className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black font-display text-white tracking-tight">Dashboard</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Career Overview</p>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Close dashboard" className="p-3 hover:bg-white/10 rounded-2xl text-slate-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        {/* Status Sidebar */}
                        <div className="w-full lg:w-[350px] border-r border-white/5 bg-slate-900/50 flex flex-col p-8 space-y-8">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Overview</h3>

                                <div className="space-y-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-500">Market Readiness</span>
                                            <span className="text-xl font-black text-white">{stats.readiness}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.readiness}%` }} className="h-full bg-emerald-500" />
                                        </div>
                                    </div>

                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Predicted Market Value</p>
                                        <p className="text-3xl font-black text-white tracking-tighter">{stats.value}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Status</h3>
                                <div className="space-y-3">
                                    {savedJobs.length > 0 && (
                                        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 active-pulse">
                                            <TrendingUp size={16} className="text-emerald-500" />
                                            <div className="flex-1">
                                                <p className="text-white text-xs font-bold">{savedJobs.length} Saved Job{savedJobs.length !== 1 ? 's' : ''}</p>
                                                <p className="text-slate-500 text-[9px] font-medium">
                                                    {savedJobs.filter(j => j.status === 'Applied').length} applied, {savedJobs.filter(j => j.status === 'Interview').length} interviewing
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                        <ShieldCheck size={16} className="text-indigo-500" />
                                        <div className="flex-1">
                                            <p className="text-white text-xs font-bold">{hasResume ? 'Resume Ready' : 'Upload Required'}</p>
                                            <p className="text-slate-500 text-[9px] font-medium">{hasResume ? 'ATS analysis available' : 'Go to Discover to upload'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid */}
                        <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-slate-950">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-6 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black font-display text-white">Saved Jobs ({savedJobs.length})</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {savedJobs.length > 0 ? savedJobs.map(job => (
                                            <motion.div
                                                key={job.id}
                                                whileHover={{ scale: 1.01 }}
                                                className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 flex flex-col justify-between gap-6"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded uppercase border border-indigo-500/20">{job.source}</span>
                                                            <select
                                                                value={job.status || 'Saved'}
                                                                onChange={(e) => updateJobStatus(job.id, e.target.value)}
                                                                className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border cursor-pointer appearance-none bg-transparent ${STATUS_COLORS[job.status || 'Saved']}`}
                                                            >
                                                                {STATUS_OPTIONS.map(s => (
                                                                    <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <button onClick={() => removeJob(job.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <h4 className="text-white font-bold text-lg leading-tight">{job.title}</h4>
                                                    <p className="text-slate-500 text-xs font-medium">{job.company}</p>
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{job.score >= 0 ? `${job.score}% Alignment` : 'No Score'}</span>
                                                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white text-xs font-bold hover:text-indigo-400 transition-colors">
                                                        View Job <ArrowRight size={14} />
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="md:col-span-2 p-12 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                                                    <Bookmark size={32} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-white font-bold">No Saved Jobs</p>
                                                    <p className="text-slate-500 text-sm">Save jobs from the discovery feed to track your applications.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-xl font-black font-display text-white">Generated Assets</h3>
                                    <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
                                        {hasResume ? (
                                            <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl">
                                                <FileText size={20} className="text-indigo-400" />
                                                <div className="flex-1">
                                                    <p className="text-white text-xs font-bold">{resumeName}_Resume.pdf</p>
                                                    <p className="text-slate-500 text-[10px] uppercase font-black">UPLOADED &amp; PARSED</p>
                                                </div>
                                                <Download
                                                    size={16}
                                                    className="text-slate-400 hover:text-indigo-400 cursor-pointer transition-colors"
                                                    onClick={async () => {
                                                        const raw = localStorage.getItem('parsedResumeData');
                                                        if (!raw) return;
                                                        try {
                                                            const rd = JSON.parse(raw);
                                                            const { default: jsPDF } = await import('jspdf');
                                                            const doc = new jsPDF('p', 'mm', 'a4');
                                                            const pw = doc.internal.pageSize.getWidth();
                                                            const ph = doc.internal.pageSize.getHeight();
                                                            const m = 20;
                                                            const uw = pw - m * 2;
                                                            let y = m;
                                                            const check = (n = 10) => { if (y + n > ph - m) { doc.addPage(); y = m; } };
                                                            const wrap = (text, sz = 10) => { doc.setFontSize(sz); doc.splitTextToSize(text, uw).forEach(l => { check(6); doc.text(l, m, y); y += 5; }); };

                                                            if (rd.name) { doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text(rd.name, m, y); y += 8; }
                                                            const contact = [rd.email, rd.phone, rd.location, rd.linkedin].filter(Boolean);
                                                            if (contact.length) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(contact.join('  |  '), m, y); y += 7; doc.setTextColor(0); }
                                                            if (rd.summary) { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('SUMMARY', m, y); y += 6; doc.setFont('helvetica', 'normal'); wrap(rd.summary); y += 3; }
                                                            if (rd.skills) { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('SKILLS', m, y); y += 6; doc.setFont('helvetica', 'normal'); wrap(rd.skills); y += 3; }
                                                            if (rd.degree || rd.institution) { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('EDUCATION', m, y); y += 6; doc.setFont('helvetica', 'normal'); wrap([rd.degree, rd.institution, rd.gradYear].filter(Boolean).join(' â€” ')); y += 3; }
                                                            doc.save(`${rd.name || 'Resume'}.pdf`);
                                                        } catch (e) { console.error('PDF export failed:', e); }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center">
                                                <p className="text-slate-500 text-xs font-medium">No resume uploaded yet.</p>
                                            </div>
                                        )}
                                        <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">Upload a resume from Discover tab</p>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-xl font-black font-display text-white">System Status</h3>
                                    <div className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden font-mono text-[10px] space-y-2 text-slate-400">
                                        <p><span className="text-emerald-500">READY</span> : System Online</p>
                                        <p><span className={hasResume ? 'text-emerald-500' : 'text-amber-500'}>{hasResume ? 'LOADED' : 'WAIT '}</span> : Resume {hasResume ? 'Parsed Successfully' : 'Not Yet Uploaded'}</p>
                                        <p><span className={savedJobs.length > 0 ? 'text-emerald-500' : 'text-slate-600'}>{savedJobs.length > 0 ? 'TRACK' : 'EMPTY'}</span> : {savedJobs.length} Saved Job{savedJobs.length !== 1 ? 's' : ''}</p>
                                        <p><span className="text-emerald-500">SYNC </span> : Data Synced</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default HQDashboard;
