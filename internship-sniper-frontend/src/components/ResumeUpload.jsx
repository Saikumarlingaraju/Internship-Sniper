import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, Sparkles, Wand2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ResumeUpload = ({ onParsedResume }) => {
    const [file, setFile] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [auditResult, setAuditResult] = useState(null);
    const [isParsed, setIsParsed] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);

    const startScan = useCallback(async (uploadedFile) => {
        setIsScanning(true);
        setProgress(0);
        setAuditResult(null);
        setIsParsed(false);
        setUploadError(null);

        // Progress Animation
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 5;
            });
        }, 50);

        try {
            // Upload actual file and parse resume using FormData FIRST
            const formData = new FormData();
            formData.append('resume', uploadedFile);

            if (import.meta.env.DEV) console.log('Uploading resume file:', uploadedFile.name);

            const parseResponse = await axios.post('/api/upload-resume', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (import.meta.env.DEV) console.log('ResumeUpload: Parse response received:', parseResponse.data);

            // Run ATS Audit AFTER parsing, using real resume content
            try {
                const data = parseResponse.data;
                const resumeText = [
                    data.name, data.email, data.phone, data.title, data.location,
                    data.summary,
                    ...(Array.isArray(data.experience) ? data.experience.map(e =>
                        [e.company, e.title, e.duration, e.description].filter(Boolean).join(' ')
                    ) : []),
                    data.degree, data.institution, data.gradYear,
                    data.skills, data.projects
                ].filter(Boolean).join('\n');

                if (resumeText.trim().length > 20) {
                    const auditResponse = await axios.post('/api/ats-audit', {
                        resume: resumeText
                    });
                    setAuditResult(auditResponse.data);
                }
            } catch (auditError) {
                console.warn('ATS Audit failed but continuing with scan:', auditError);
            }

            // Create PDF data URL from the uploaded file (for preview display)
            const createPdfDataUrl = () => {
                return new Promise((resolve) => {
                    // Only create data URL for PDFs
                    if (uploadedFile.type === 'application/pdf') {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve(reader.result);
                        };
                        reader.readAsDataURL(uploadedFile);
                    } else {
                        resolve(null); // Not a PDF, no preview needed
                    }
                });
            };

            const pdfDataUrl = await createPdfDataUrl();

            // Store parsed data for "Continue to Studio" button (don't auto-navigate)
            setParsedData(parseResponse.data);
            setPdfUrl(pdfDataUrl);

            // Also save to localStorage directly as backup
            try {
                localStorage.setItem('parsedResumeData', JSON.stringify(parseResponse.data));
            } catch (storageErr) {
                console.warn('localStorage save failed (quota exceeded):', storageErr);
            }
            // Note: PDF data URL is NOT stored in localStorage (too large, causes quota errors)
            // It is kept in React state only via the onParsedResume callback

            setIsParsed(true);

            setProgress(100);
            setTimeout(() => setIsScanning(false), 500);
        } catch (error) {
            clearInterval(interval);
            console.error('Scan failed:', error);
            const msg = error.response?.data?.message || error.message || 'Upload failed. Please try again.';
            setUploadError(msg);
            setIsScanning(false);
        }
    }, []);

    const onDrop = useCallback((acceptedFiles) => {
        const droppedFile = acceptedFiles[0];
        if (droppedFile) {
            setFile(droppedFile);
            startScan(droppedFile);
        }
    }, [startScan]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'text/plain': ['.txt'],
        },
        multiple: false
    });

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <motion.div
                {...getRootProps()}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={`relative group p-12 rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer ${isDragActive
                    ? 'border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-500/10'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 shadow-sm'
                    }`}
            >
                <input {...getInputProps()} />

                {/* Subtle gradient overlay on drag */}
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"
                    />
                )}

                <div className="flex flex-col items-center justify-center space-y-5 relative z-10">
                    <motion.div
                        initial={false}
                        animate={isDragActive ? { scale: 1.1, rotate: 5 } : file ? { scale: 1 } : {}}
                        className={`p-5 rounded-2xl transition-colors duration-300 ${file ? 'bg-emerald-100 text-emerald-500' : isDragActive ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400'}`}
                    >
                        {file ? <FileText size={36} /> : <Upload size={36} />}
                    </motion.div>

                    {!file ? (
                        <div className="text-center space-y-2">
                            <p className="text-slate-700 font-bold text-lg">
                                {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
                            </p>
                            <p className="text-sm text-slate-400">
                                Drag & drop or <span className="text-blue-500 font-medium">browse</span> — PDF, PNG, JPEG, or TXT (max 5MB)
                            </p>
                        </div>
                    ) : (
                        <div className="text-center space-y-1.5">
                            <p className="text-emerald-700 font-bold text-base">{file.name}</p>
                            <p className="text-xs text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB — ready for analysis</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Progress Bar */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Sparkles size={16} className="animate-pulse" />
                                <span className="text-sm font-bold">AI Analysis in Progress...</span>
                            </div>
                            <span className="text-sm font-bold text-slate-500">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Error */}
            <AnimatePresence>
                {uploadError && !isScanning && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 rounded-xl p-5 border border-red-200 shadow-sm flex items-start gap-3"
                    >
                        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-800">Upload Failed</p>
                            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                        </div>
                        <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
                {auditResult && !isScanning && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${auditResult.score >= 80 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">ATS Compatibility Score</p>
                                    <p className="text-xs text-slate-400">Based on AI structural analysis</p>
                                </div>
                            </div>
                            <div className={`text-3xl font-black ${auditResult.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {auditResult.score}%
                            </div>
                        </div>

                        {auditResult.findings && auditResult.findings.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Findings</p>
                                <ul className="space-y-1">
                                    {auditResult.findings.map((finding, idx) => (
                                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                            <span className="text-blue-400">•</span> {finding}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isParsed && (
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <Wand2 size={16} />
                                    <span className="text-sm font-bold">Resume data extracted successfully!</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (onParsedResume && parsedData) {
                                            onParsedResume(parsedData, pdfUrl);
                                        }
                                    }}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    Continue to Studio →
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResumeUpload;
