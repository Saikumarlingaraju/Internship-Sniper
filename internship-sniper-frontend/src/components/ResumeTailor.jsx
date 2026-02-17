import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle, CheckCircle2, Zap, Download, RefreshCw, Layout, FileText, ChevronRight, ArrowRight } from 'lucide-react';
import axios from 'axios';

const ResumeTailor = ({ isOpen, onClose, job, parsedResumeData, onOpenInStudio }) => {
    const [resumeText, setResumeText] = useState("");
    const [coverLetterText, setCoverLetterText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [activeTab, setActiveTab] = useState("calibrate");
    const [autoAnalyzed, setAutoAnalyzed] = useState(false);

    // Lock body scroll when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Auto-populate resume text from parsed data when overlay opens
    useEffect(() => {
        if (isOpen) {
            setAutoAnalyzed(false);
            setAnalysis(null);
            setCoverLetterText("");
            setActiveTab("calibrate");

            if (parsedResumeData && parsedResumeData.name) {
                const rd = parsedResumeData;
                const parts = [];
                if (rd.name) parts.push(`Name: ${rd.name}`);
                if (rd.email) parts.push(`Email: ${rd.email}`);
                if (rd.phone) parts.push(`Phone: ${rd.phone}`);
                if (rd.title) parts.push(`Title: ${rd.title}`);
                if (rd.location) parts.push(`Location: ${rd.location}`);
                if (rd.linkedin) parts.push(`LinkedIn: ${rd.linkedin}`);
                if (rd.summary) parts.push(`\nProfessional Summary:\n${rd.summary}`);
                if (rd.experience && rd.experience.length > 0) {
                    parts.push('\nExperience:');
                    rd.experience.forEach(exp => {
                        if (exp.company || exp.title) {
                            parts.push(`  ${exp.title || ''} at ${exp.company || ''} (${exp.duration || ''})`);
                            if (exp.description) parts.push(`  ${exp.description}`);
                        }
                    });
                }
                if (rd.degree) parts.push(`\nEducation: ${rd.degree} from ${rd.institution || ''} (${rd.gradYear || ''})`);
                if (rd.cgpa) parts.push(`CGPA: ${rd.cgpa}`);
                if (rd.skills) parts.push(`\nSkills: ${rd.skills}`);
                if (rd.projects) parts.push(`\nProjects: ${rd.projects}`);
                setResumeText(parts.join('\n'));
            } else {
                setResumeText("");
            }
        }
    }, [isOpen, parsedResumeData]);

    // Auto-analyze only if job has a substantial description (not just a search snippet)
    useEffect(() => {
        if (isOpen && resumeText && !autoAnalyzed && !isAnalyzing && !analysis) {
            const desc = job?.description || '';
            if (desc.length < 80) return; // Skip auto-analyze for short snippets
            setAutoAnalyzed(true);
            const timer = setTimeout(() => handleAnalyze(), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, resumeText, autoAnalyzed]);

    const handleAnalyze = async () => {
        if (!resumeText.trim()) return;
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const response = await axios.post('/api/analyze-fit', {
                resume: resumeText,
                jobDescription: job.description
            });
            setAnalysis(response.data);
            setActiveTab("review");
        } catch (error) {
            console.error('Analysis failed:', error);
            setAnalysisError(error.response?.data?.error || 'Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateCoverLetter = async () => {
        setIsGeneratingCover(true);
        try {
            const response = await axios.post('/api/generate-cover-letter', {
                resume: resumeText,
                jobDescription: job.description,
                company: job.company,
                title: job.title
            });
            setCoverLetterText(response.data.coverLetter);
            setActiveTab("cover-letter");
        } catch (error) {
            console.error('Cover letter generation failed:', error);
        } finally {
            setIsGeneratingCover(false);
        }
    };

    const handleDownloadPDF = async (type = 'resume') => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const content = type === 'resume' ? resumeText : coverLetterText;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const usableWidth = pageWidth - margin * 2;

        if (type === 'cover-letter') {
            // Professional cover letter formatting
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            // Date
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(today, margin, 25);

            // Recipient
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text(`Hiring Manager`, margin, 38);
            doc.text(`${job.company}`, margin, 44);
            doc.text(`Re: ${job.title}`, margin, 54);

            // Separator line
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, 60, pageWidth - margin, 60);

            // Body
            doc.setFontSize(11);
            doc.setTextColor(33, 33, 33);
            const splitText = doc.splitTextToSize(content, usableWidth);
            const lineHeight = 6;
            let y = 72;

            for (const line of splitText) {
                if (y + lineHeight > pageHeight - 40) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin, y);
                y += lineHeight;
            }

            // Sign-off
            y += 12;
            if (y > pageHeight - 40) { doc.addPage(); y = margin; }
            doc.text('Sincerely,', margin, y);
            y += 8;
            const candidateName = parsedResumeData?.name || 'Your Name';
            doc.setFont('helvetica', 'bold');
            doc.text(candidateName, margin, y);
            doc.setFont('helvetica', 'normal');
        } else {
            // Structured resume PDF using parsed data
            const rd = parsedResumeData || {};
            const m = margin;
            let y = 25;

            // Name header
            if (rd.name) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(rd.name, m, y);
                y += 8;
            }

            // Contact info
            const contactParts = [rd.email, rd.phone, rd.location, rd.linkedin].filter(Boolean);
            if (contactParts.length) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(contactParts.join('  |  '), m, y);
                y += 6;
            }

            // Target position
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Tailored for: ${job.title} at ${job.company}`, m, y);
            y += 4;

            // Separator
            doc.setDrawColor(226, 232, 240);
            doc.line(m, y, pageWidth - m, y);
            y += 6;

            doc.setTextColor(33, 33, 33);

            const addSection = (title, contentText) => {
                if (!contentText) return;
                if (y > pageHeight - 30) { doc.addPage(); y = m; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(title.toUpperCase(), m, y);
                y += 6;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(contentText, usableWidth);
                for (const line of lines) {
                    if (y > pageHeight - 20) { doc.addPage(); y = m; }
                    doc.text(line, m, y);
                    y += 5;
                }
                y += 4;
            };

            addSection('Summary', rd.summary);

            // Experience
            if (rd.experience && rd.experience.length > 0) {
                if (y > pageHeight - 30) { doc.addPage(); y = m; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('EXPERIENCE', m, y);
                y += 6;
                rd.experience.forEach(exp => {
                    if (!exp.company && !exp.title) return;
                    if (y > pageHeight - 30) { doc.addPage(); y = m; }
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${exp.title || ''} — ${exp.company || ''}`, m, y);
                    y += 5;
                    if (exp.duration) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(9);
                        doc.text(exp.duration, m, y);
                        y += 5;
                    }
                    if (exp.description) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        const descLines = doc.splitTextToSize(exp.description, usableWidth);
                        for (const line of descLines) {
                            if (y > pageHeight - 20) { doc.addPage(); y = m; }
                            doc.text(line, m, y);
                            y += 5;
                        }
                    }
                    y += 3;
                });
                y += 2;
            }

            addSection('Education', [rd.degree, rd.institution, rd.gradYear ? `(${rd.gradYear})` : '', rd.cgpa ? `CGPA: ${rd.cgpa}` : ''].filter(Boolean).join(' — '));
            addSection('Skills', typeof rd.skills === 'string' ? rd.skills : Array.isArray(rd.skills) ? rd.skills.join(', ') : '');
            addSection('Projects', rd.projects);
        }

        doc.save(`${job.company.replace(/\s+/g, '_')}_${type === 'resume' ? 'Tailored_Resume' : 'Cover_Letter'}.pdf`);
    };

    const handleOpenInStudio = () => {
        if (onOpenInStudio) {
            onOpenInStudio(job, parsedResumeData);
        }
        onClose();
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
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Zap className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black font-display text-white tracking-tight">Job Tailoring</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Targeting: {job.title} at {job.company}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenInStudio}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                <ArrowRight size={14} />
                                Open in Studio
                            </button>
                            <button onClick={onClose} aria-label="Close tailoring" className="p-3 hover:bg-white/10 rounded-2xl text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Main Workspace */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        {/* Info/Analysis Pane */}
                        <div className="w-full lg:w-[350px] border-r border-white/5 bg-slate-900/50 flex flex-col p-6 space-y-6 overflow-y-auto">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Target Insight</h3>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <h4 className="text-white font-bold text-lg">{job.title}</h4>
                                    <p className="text-slate-400 text-xs">{job.company} â€” {job.location}</p>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                        <CheckCircle2 size={16} className={analysis ? "text-emerald-500" : "text-slate-600"} />
                                        <span>{isAnalyzing ? 'Analyzing...' : analysis ? 'Analysis Complete' : 'Waiting...'}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${analysis?.matchPercentage || 0}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={`h-full bg-gradient-to-r ${(analysis?.matchPercentage || 0) >= 75 ? 'from-emerald-500 to-green-400' : (analysis?.matchPercentage || 0) >= 50 ? 'from-amber-500 to-yellow-400' : 'from-rose-500 to-red-400'}`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase text-right tracking-widest">
                                        {analysis?.matchPercentage || 0}% Match Score
                                    </p>
                                </div>

                                {parsedResumeData && parsedResumeData.name && (
                                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                                        <FileText size={14} className="text-emerald-400" />
                                        <span className="text-emerald-300 text-xs font-bold">Auto-loaded: {parsedResumeData.name}</span>
                                    </div>
                                )}

                                {!parsedResumeData?.name && (
                                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-2">
                                        <AlertCircle size={14} className="text-amber-400" />
                                        <span className="text-amber-300 text-xs font-bold">No resume uploaded. Paste text manually or upload first.</span>
                                    </div>
                                )}
                            </div>

                            {analysis && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                    {analysis.calibratedResume && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">AI Summary</h3>
                                            <p className="text-slate-300 text-xs bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 italic leading-relaxed">
                                                {analysis.calibratedResume}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Tailoring Tips</h3>
                                        <ul className="space-y-3">
                                            {(analysis.tailoringTips || []).map((tip, i) => (
                                                <li key={i} className="flex gap-3 text-xs text-slate-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 italic">
                                                    <ChevronRight size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest">Missing Keywords</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(analysis.missingKeywords || []).map((kw, i) => (
                                                <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black rounded-lg border border-amber-500/20">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 space-y-3">
                                        <p className="text-indigo-300 text-xs font-bold">Want to edit your resume based on these tips?</p>
                                        <button
                                            onClick={handleOpenInStudio}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                                        >
                                            <ArrowRight size={14} />
                                            Open in Studio & Tailor
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Dual Editor Pane */}
                        <div className="flex-1 flex flex-col bg-slate-950 p-6 md:p-10 relative">
                            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab("calibrate")}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'calibrate' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Resume Text
                                </button>
                                <button
                                    onClick={() => setActiveTab("review")}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'review' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Analysis
                                </button>
                                <button
                                    onClick={() => setActiveTab("cover-letter")}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'cover-letter' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Cover Letter
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col gap-6">
                                {activeTab === 'review' && analysis ? (
                                    <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-[2rem] p-8 overflow-y-auto space-y-6">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Match Score</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="text-4xl font-black text-white">{analysis.matchPercentage || 0}%</div>
                                                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full bg-gradient-to-r ${(analysis.matchPercentage || 0) >= 75 ? 'from-emerald-500 to-green-400' : (analysis.matchPercentage || 0) >= 50 ? 'from-amber-500 to-yellow-400' : 'from-rose-500 to-red-400'}`} style={{ width: `${analysis.matchPercentage || 0}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        {analysis.calibratedResume && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">AI-Calibrated Resume</h3>
                                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">{analysis.calibratedResume}</p>
                                            </div>
                                        )}
                                        {analysis.tailoringTips && analysis.tailoringTips.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest">Tailoring Tips</h3>
                                                <ul className="space-y-2">
                                                    {analysis.tailoringTips.map((tip, i) => (
                                                        <li key={i} className="flex gap-2 text-xs text-slate-300 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                                            <ChevronRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                                            {tip}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest">Missing Keywords</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.missingKeywords.map((kw, i) => (
                                                        <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-black rounded-lg border border-rose-500/20">{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'review' && !analysis ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 border border-white/10 rounded-[2rem] p-8 gap-4">
                                        <p className="text-slate-500 text-sm font-bold">Click "Re-Analyze" to see analysis results here.</p>
                                        {analysisError && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                                <AlertCircle size={14} className="text-rose-400" />
                                                <p className="text-rose-400 text-xs font-bold">{analysisError}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <textarea
                                        className="flex-1 bg-slate-900/50 border border-white/10 rounded-[2rem] p-8 text-slate-200 font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner leading-relaxed"
                                        placeholder={activeTab === 'cover-letter' ? "Click 'Generate Cover Letter' to create a tailored cover letter..." : "Your resume is auto-loaded. You can also edit it here..."}
                                        value={activeTab === 'cover-letter' ? coverLetterText : resumeText}
                                        onChange={(e) => activeTab === 'cover-letter' ? setCoverLetterText(e.target.value) : setResumeText(e.target.value)}
                                    />
                                )}

                                <div className="flex flex-wrap justify-between items-center bg-slate-900 border border-white/5 rounded-2xl p-4 gap-4">
                                    <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">
                                        <Layout size={16} />
                                        <span>{activeTab === 'cover-letter' ? 'Cover Engine' : 'Resume Loaded'}</span>
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                    <div className="flex gap-3">
                                        {activeTab !== 'cover-letter' ? (
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={isAnalyzing || !resumeText}
                                                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50"
                                            >
                                                <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                                                {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleGenerateCoverLetter}
                                                disabled={isGeneratingCover || !resumeText}
                                                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50"
                                            >
                                                <Sparkles size={14} className={isGeneratingCover ? 'animate-pulse text-indigo-500' : ''} />
                                                {isGeneratingCover ? 'Writing...' : 'Generate Cover Letter'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownloadPDF(activeTab === 'cover-letter' ? 'cover-letter' : 'resume')}
                                            disabled={(activeTab === 'cover-letter' ? !coverLetterText : !resumeText)}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                        >
                                            <Download size={14} />
                                            Export PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ResumeTailor;
