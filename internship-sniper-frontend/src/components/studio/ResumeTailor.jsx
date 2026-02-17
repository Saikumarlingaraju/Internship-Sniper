import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Crosshair, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import axios from 'axios';

const ResumeTailor = ({ resumeData, onUpdate, selectedJob }) => {
    const [jobDescription, setJobDescription] = useState(selectedJob?.description || '');
    const [jobTitle, setJobTitle] = useState(selectedJob?.title || '');
    const [jobCompany, setJobCompany] = useState(selectedJob?.company || '');
    const [isTailoring, setIsTailoring] = useState(false);
    const [tailorResult, setTailorResult] = useState(null);
    const [error, setError] = useState(null);
    const [diff, setDiff] = useState(null);

    // Sync when selectedJob changes after mount
    useEffect(() => {
        setJobDescription(selectedJob?.description || '');
        setJobTitle(selectedJob?.title || '');
        setJobCompany(selectedJob?.company || '');
    }, [selectedJob]);

    const handleTailor = async () => {
        if (!jobDescription.trim()) return;
        setIsTailoring(true);
        setError(null);
        setTailorResult(null);
        setDiff(null);

        try {
            const response = await axios.post('/api/tailor-resume', {
                resumeData,
                jobDescription,
                jobTitle,
                jobCompany
            });

            const tailored = response.data.tailoredData;
            setTailorResult(tailored);

            // Generate diff summary
            const changes = [];
            if (tailored.summary !== resumeData.summary) changes.push('Summary rewritten');
            if (tailored.skills !== resumeData.skills) changes.push('Skills updated');
            if (JSON.stringify(tailored.experience) !== JSON.stringify(resumeData.experience)) changes.push('Experience descriptions refined');
            if (tailored.title !== resumeData.title) changes.push('Title updated');
            setDiff(changes.length > 0 ? changes : ['Minor formatting tweaks applied']);
        } catch (err) {
            console.error('Tailoring failed:', err);
            setError(err.response?.data?.message || 'Tailoring failed. Make sure your API keys are configured.');
        } finally {
            setIsTailoring(false);
        }
    };

    const handleApply = () => {
        if (tailorResult && onUpdate) {
            onUpdate(tailorResult);
            setTailorResult(null);
            setDiff(null);
            setJobDescription('');
        }
    };

    const hasResumeData = resumeData && resumeData.name;

    return (
        <div className="h-full flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Job Description Input */}
            <div className="w-full lg:w-[420px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Target size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 text-lg">Job Tailoring</h2>
                            <p className="text-xs text-slate-500">AI-powered resume tailoring</p>
                        </div>
                    </div>
                    {hasResumeData && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Resume loaded: {resumeData.name}</span>
                        </div>
                    )}
                    {!hasResumeData && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertTriangle size={14} className="text-amber-600" />
                            <span className="text-xs font-bold text-amber-700">Upload a resume first to use Job Tailoring</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g., Software Intern"
                                className="input-field"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company</label>
                            <input
                                type="text"
                                value={jobCompany}
                                onChange={(e) => setJobCompany(e.target.value)}
                                placeholder="e.g., Google"
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Description</label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job description here. The AI will analyze it and rewrite your resume to match..."
                            rows={12}
                            className="input-field resize-none text-sm leading-relaxed"
                        />
                    </div>

                    <button
                        onClick={handleTailor}
                        disabled={isTailoring || !jobDescription.trim() || !hasResumeData}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                    >
                        {isTailoring ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                AI is Tailoring...
                            </>
                        ) : (
                            <>
                                <Crosshair size={18} />
                                Tailor Resume to This Job
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <p className="text-rose-700 text-xs font-bold">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Results / Preview */}
            <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                {!tailorResult && !isTailoring && (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <div className="text-center space-y-6 max-w-md">
                            <motion.div
                                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ repeat: Infinity, duration: 3 }}
                                className="w-24 h-24 mx-auto bg-indigo-50 rounded-full flex items-center justify-center"
                            >
                                <Target size={48} className="text-indigo-300" />
                            </motion.div>
                            <h3 className="text-2xl font-black text-slate-300">Job Tailoring Ready</h3>
                            <p className="text-slate-400 text-sm">
                                Paste a job description and click <strong>"Tailor Resume"</strong> to let AI analyze and tailor your resume
                                to match the job requirements. Your skills and experience will be rephrased — never fabricated.
                            </p>
                        </div>
                    </div>
                )}

                {isTailoring && (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <div className="text-center space-y-6">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="w-20 h-20 mx-auto border-4 border-indigo-200 border-t-indigo-600 rounded-full"
                            />
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-700">AI is analyzing the job description...</h3>
                                <p className="text-slate-500 text-sm">Identifying keywords, aligning experience, rewriting bullets</p>
                            </div>
                        </div>
                    </div>
                )}

                {tailorResult && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Changes Summary */}
                        <div className="p-6 border-b border-slate-200 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles size={20} className="text-indigo-600" />
                                    <h3 className="font-black text-slate-800 text-lg">Tailoring Complete</h3>
                                </div>
                                <button
                                    onClick={handleApply}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
                                >
                                    <CheckCircle2 size={16} />
                                    Apply Changes to Resume
                                </button>
                            </div>

                            {diff && (
                                <div className="flex flex-wrap gap-2">
                                    {diff.map((change, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100">
                                            <ChevronRight size={12} />
                                            {change}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Side-by-side comparison */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Before */}
                            <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                    Before (Current)
                                </h4>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Summary</p>
                                        <p className="text-sm text-slate-600">{resumeData.summary || 'No summary'}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Skills</p>
                                        <p className="text-sm text-slate-600">{resumeData.skills || 'No skills listed'}</p>
                                    </div>
                                    {resumeData.experience?.map((exp, i) => (
                                        <div key={i} className="p-4 bg-white rounded-xl border border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Experience: {exp.title || ''} at {exp.company || ''}</p>
                                            <p className="text-sm text-slate-600">{exp.description || 'No description'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* After */}
                            <div className="w-1/2 overflow-y-auto p-6 bg-emerald-50/30">
                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    After (Tailored)
                                </h4>
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-xl border ${tailorResult.summary !== resumeData.summary ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Summary {tailorResult.summary !== resumeData.summary && '✨ Updated'}</p>
                                        <p className="text-sm text-slate-700">{tailorResult.summary || 'No summary'}</p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${tailorResult.skills !== resumeData.skills ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Skills {tailorResult.skills !== resumeData.skills && '✨ Updated'}</p>
                                        <p className="text-sm text-slate-700">{tailorResult.skills || 'No skills listed'}</p>
                                    </div>
                                    {(tailorResult.experience || []).map((exp, i) => {
                                        const origExp = resumeData.experience?.[i];
                                        const changed = !origExp || exp.description !== origExp.description;
                                        return (
                                            <div key={i} className={`p-4 rounded-xl border ${changed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">
                                                    Experience: {exp.title || ''} at {exp.company || ''} {changed && '✨ Updated'}
                                                </p>
                                                <p className="text-sm text-slate-700">{exp.description || 'No description'}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumeTailor;
