import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ResumeFormPanel from './studio/ResumeFormPanel';
import AIChatPanel from './studio/AIChatPanel';
import ResumePreviewPanel from './studio/ResumePreviewPanel';
import ResumeTailor from './studio/ResumeTailor';
import { Target, Sparkles, Upload, LayoutTemplate } from 'lucide-react';

const emptyResumeData = {
    name: '',
    email: '',
    phone: '',
    title: '',
    location: '',
    linkedin: '',
    summary: '',
    experience: [{ company: '', title: '', duration: '', description: '' }],
    degree: '',
    institution: '',
    gradYear: '',
    cgpa: '',
    skills: '',
    projects: ''
};

const ResumeStudio = ({ initialData, initialPdfUrl, selectedJob, onResumeUpdate }) => {
    // Initialize from localStorage as fallback
    const [resumeData, setResumeData] = useState(() => {
        const saved = localStorage.getItem('parsedResumeData');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (import.meta.env.DEV) console.log('ResumeStudio: Loaded from localStorage');
                return {
                    ...emptyResumeData,
                    ...parsed,
                    experience: parsed.experience && parsed.experience.length > 0
                        ? parsed.experience
                        : emptyResumeData.experience
                };
            } catch (e) {
                console.error('Failed to parse localStorage:', e);
            }
        }
        return emptyResumeData;
    });
    const [originalPdfUrl, setOriginalPdfUrl] = useState(null);
    const [zoom, setZoom] = useState(80);
    const [studioMode, setStudioMode] = useState('editor'); // 'editor' | 'tailor'
    const [mobilePanel, setMobilePanel] = useState('form'); // 'form' | 'ai' | 'preview'
    const [toastMsg, setToastMsg] = useState(null); // inline toast replacement for alert()

    // Only update from initialData when it genuinely changes (not same reference)
    const prevInitialRef = useRef(null);

    useEffect(() => {
        if (initialData && initialData !== prevInitialRef.current) {
            // Check if content actually differs to avoid overwriting user edits
            const serialized = JSON.stringify(initialData);
            if (serialized !== JSON.stringify(prevInitialRef.current)) {
                prevInitialRef.current = initialData;
                setResumeData({
                    ...emptyResumeData,
                    ...initialData,
                    experience: initialData.experience && initialData.experience.length > 0
                        ? initialData.experience
                        : emptyResumeData.experience
                });
            }
        }
        if (initialPdfUrl) {
            setOriginalPdfUrl(initialPdfUrl);
        }
    }, [initialData, initialPdfUrl]);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleAISuggestion = (suggestion) => {
        if (import.meta.env.DEV) console.log('AI Suggestion received:', suggestion);
        if (suggestion && typeof suggestion === 'object') {
            setResumeData(prev => ({ ...prev, ...suggestion }));
            showToast('AI suggestion applied!');
        }
    };

    // Debounced auto-save to localStorage + sync to parent App state
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'
    const saveTimerRef = useRef(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Skip auto-save on initial mount (data just loaded)
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        setSaveStatus('saving');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem('parsedResumeData', JSON.stringify(resumeData));
            } catch (e) {
                console.warn('Auto-save to localStorage failed:', e);
            }
            // Sync to parent App state
            if (onResumeUpdate) {
                onResumeUpdate(resumeData);
            }
            setSaveStatus('saved');
        }, 800); // 800ms debounce

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [resumeData, onResumeUpdate]);

    // Check if we have saved data in localStorage
    const hasSavedData = localStorage.getItem('parsedResumeData') !== null;

    const loadFromStorage = () => {
        const saved = localStorage.getItem('parsedResumeData');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setResumeData({
                    ...emptyResumeData,
                    ...parsed,
                    experience: parsed.experience && parsed.experience.length > 0
                        ? parsed.experience
                        : emptyResumeData.experience
                });
                showToast('Resume data loaded successfully!');
            } catch (e) {
                showToast('Failed to load resume data');
            }
        } else {
            showToast('No saved resume found. Upload a resume first!');
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Sparkles size={20} className="text-blue-500" />
                        Resume Studio
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadFromStorage}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
                        >
                            <Upload size={14} /> Load Resume Data
                        </button>

                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setStudioMode('editor')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${studioMode === 'editor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutTemplate size={14} /> Editor
                        </button>
                        <button
                            onClick={() => setStudioMode('tailor')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${studioMode === 'tailor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Target size={14} /> Job Tailoring
                        </button>
                    </div>
                </div>
                <div className="text-xs text-slate-400">
                    <span className={`font-bold ${saveStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>●</span> {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                </div>
            </div>

            {/* Toast notification */}
            {toastMsg && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-fade-in">
                    {toastMsg}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {studioMode === 'editor' ? (
                    <>
                        {/* Mobile panel switcher */}
                        <div className="flex lg:hidden border-b border-slate-200 bg-white">
                            {[{ id: 'form', label: 'Editor' }, { id: 'ai', label: 'AI Chat' }, { id: 'preview', label: 'Preview' }].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMobilePanel(tab.id)}
                                    className={`flex-1 py-2.5 text-xs font-bold transition-all ${mobilePanel === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Left Panel - Form Editor */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={`w-full lg:w-80 flex-shrink-0 border-r border-slate-200 ${mobilePanel !== 'form' ? 'hidden lg:block' : ''}`}
                        >
                            <ResumeFormPanel resumeData={resumeData} setResumeData={setResumeData} />
                        </motion.div>

                        {/* Center Panel - AI Chat */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`w-full lg:w-80 flex-shrink-0 border-r border-slate-200 ${mobilePanel !== 'ai' ? 'hidden lg:block' : ''}`}
                        >
                            <AIChatPanel resumeData={resumeData} onSuggestion={handleAISuggestion} />
                        </motion.div>

                        {/* Right Panel - Live Preview */}
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className={`flex-1 ${mobilePanel !== 'preview' ? 'hidden lg:block' : ''}`}
                        >
                            <ResumePreviewPanel resumeData={resumeData} zoom={zoom} setZoom={setZoom} originalPdfUrl={originalPdfUrl} />
                        </motion.div>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 w-full bg-slate-50"
                    >
                        <ResumeTailor resumeData={resumeData} selectedJob={selectedJob} onUpdate={(newData) => { const updated = { ...resumeData, ...newData }; setResumeData(updated); if (onResumeUpdate) onResumeUpdate(updated); }} />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ResumeStudio;
