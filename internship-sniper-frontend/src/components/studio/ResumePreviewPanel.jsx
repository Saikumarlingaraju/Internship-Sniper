import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, ZoomIn, ZoomOut, FileText, PenLine, AlertCircle } from 'lucide-react';

const ResumePreviewPanel = ({ resumeData, zoom, setZoom, originalPdfUrl }) => {
    const resumeRef = useRef(null);
    // Default to original PDF if available, otherwise show edited view
    const [viewMode, setViewMode] = useState(originalPdfUrl ? 'original' : 'edited');
    const [isExporting, setIsExporting] = useState(false);

    // Safe accessors for AI-parsed data that might have unexpected types
    const safeSkills = typeof resumeData?.skills === 'string' ? resumeData.skills
        : Array.isArray(resumeData?.skills) ? resumeData.skills.join(', ')
        : '';
    const safeExperience = Array.isArray(resumeData?.experience) ? resumeData.experience : [];

    // Projects can be a string, a single object {name, tech, ...}, or an array of such objects
    const safeProjects = useMemo(() => {
        const p = resumeData?.projects;
        if (!p) return [];
        if (typeof p === 'string') return [{ name: '', description: p }];
        if (Array.isArray(p)) return p.map(item => typeof item === 'string' ? { name: '', description: item } : item);
        if (typeof p === 'object') return [p];
        return [{ name: '', description: String(p) }];
    }, [resumeData?.projects]);

    // Capture the initial resume data snapshot from PROPS (not localStorage, which auto-save overwrites)
    const initialDataRef = useRef(null);
    if (initialDataRef.current === null && resumeData) {
        initialDataRef.current = JSON.parse(JSON.stringify(resumeData));
    }
    const initialData = initialDataRef.current;

    const isFieldEdited = (field) => {
        if (!initialData || !resumeData) return false;
        const orig = initialData[field];
        const curr = resumeData[field];
        if (typeof curr === 'object' || typeof orig === 'object') {
            return JSON.stringify(orig) !== JSON.stringify(curr);
        }
        return orig !== curr;
    };

    const hasAnyEdits = initialData && resumeData && (
        isFieldEdited('name') || isFieldEdited('title') || isFieldEdited('email') ||
        isFieldEdited('phone') || isFieldEdited('summary') || isFieldEdited('skills') ||
        isFieldEdited('experience') || isFieldEdited('degree') || isFieldEdited('projects')
    );

    const handleDownloadPDF = async () => {
        if (viewMode === 'original' && originalPdfUrl) {
            const link = document.createElement('a');
            link.href = originalPdfUrl;
            link.download = `${resumeData?.name || 'Resume'}_Original.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        // Generate ATS-friendly text-based PDF with structured sections
        if (!resumeData) return;
        setIsExporting(true);

        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const usableWidth = pageWidth - margin * 2;
            let y = margin;

            const checkPage = (needed = 10) => {
                if (y + needed > pageHeight - margin) { doc.addPage(); y = margin; }
            };

            const addSectionHeader = (text) => {
                checkPage(16);
                y += 4;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(text.toUpperCase(), margin, y);
                y += 2;
                doc.setDrawColor(200, 200, 210);
                doc.line(margin, y, pageWidth - margin, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
            };

            const addWrappedText = (text, fontSize = 10, color = [51,51,51]) => {
                doc.setFontSize(fontSize);
                doc.setTextColor(...color);
                const lines = doc.splitTextToSize(text, usableWidth);
                for (const line of lines) {
                    checkPage(6);
                    doc.text(line, margin, y);
                    y += 5;
                }
            };

            // Header â€” Name
            if (resumeData.name) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(resumeData.name, margin, y);
                y += 8;
            }

            // Contact row
            const contactParts = [resumeData.email, resumeData.phone, resumeData.location, resumeData.linkedin].filter(Boolean);
            if (contactParts.length > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(contactParts.join('  |  '), margin, y);
                y += 6;
            }

            if (resumeData.title) {
                doc.setFontSize(11);
                doc.setTextColor(79, 70, 229);
                doc.text(resumeData.title, margin, y);
                y += 8;
            }

            // Summary
            if (resumeData.summary) {
                addSectionHeader('Professional Summary');
                addWrappedText(resumeData.summary);
                y += 2;
            }

            // Experience
            if (safeExperience.length > 0 && safeExperience.some(e => e.company || e.description)) {
                addSectionHeader('Experience');
                for (const exp of safeExperience) {
                    if (!exp.company && !exp.title && !exp.description) continue;
                    checkPage(14);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 41, 59);
                    doc.text(`${exp.title || 'Role'}${exp.company ? ' â€” ' + exp.company : ''}`, margin, y);
                    y += 5;
                    if (exp.duration) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(9);
                        doc.setTextColor(100, 116, 139);
                        doc.text(exp.duration, margin, y);
                        y += 5;
                    }
                    doc.setFont('helvetica', 'normal');
                    if (exp.description) {
                        addWrappedText(exp.description, 10);
                    }
                    y += 3;
                }
            }

            // Education
            if (resumeData.degree || resumeData.institution) {
                addSectionHeader('Education');
                const eduLine = [resumeData.degree, resumeData.institution, resumeData.gradYear].filter(Boolean).join(' â€” ');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(eduLine, margin, y);
                y += 5;
                if (resumeData.cgpa) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`CGPA: ${resumeData.cgpa}`, margin, y);
                    y += 5;
                }
                y += 2;
            }

            // Skills
            if (safeSkills) {
                addSectionHeader('Skills');
                addWrappedText(safeSkills);
                y += 2;
            }

            // Projects
            if (safeProjects.length > 0) {
                addSectionHeader('Projects');
                for (const proj of safeProjects) {
                    checkPage(10);
                    if (proj.name) {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(30, 41, 59);
                        doc.text(proj.name, margin, y);
                        y += 5;
                        doc.setFont('helvetica', 'normal');
                    }
                    if (proj.description) addWrappedText(proj.description, 10);
                    y += 3;
                }
            }

            doc.save(`${resumeData?.name || 'Resume'}_Edited.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const hasData = resumeData && (resumeData.name || resumeData.summary || safeSkills);

    // Renders a small "edited" badge next to modified sections
    const EditedBadge = () => (
        <span style={{ display: 'inline-block', fontSize: '8px', fontWeight: '700', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '3px', marginLeft: '8px', verticalAlign: 'middle', letterSpacing: '0.5px' }}>
            EDITED
        </span>
    );

    return (
        <div className="h-full flex flex-col bg-slate-100">
            {/* Toolbar */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom out" className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-all">
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 w-12 text-center">{zoom}%</span>
                        <button onClick={() => setZoom(Math.min(150, zoom + 10))} aria-label="Zoom in" className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-all">
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {originalPdfUrl && (
                            <button
                                onClick={() => setViewMode('original')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <FileText size={12} /> Your Resume
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('edited')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'edited' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <PenLine size={12} /> Edited Version
                            {hasAnyEdits && <span className="w-2 h-2 bg-amber-400 rounded-full" />}
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                    <Download size={14} /> {isExporting ? 'Exporting...' : 'Download PDF'}
                </button>
            </div>

            {/* Info banner when showing original */}
            {viewMode === 'original' && hasAnyEdits && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                        <span className="font-bold">You have unsaved edits.</span> Switch to "Edited Version" to preview your changes, or download from there.
                    </p>
                </div>
            )}

            {/* ATS warning when in edited mode */}
            {viewMode === 'edited' && (
                <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
                    <AlertCircle size={12} className="text-blue-500 flex-shrink-0" />
                    <p className="text-[10px] text-blue-600">
                        <span className="font-bold">Note:</span> Edited PDF exports as an image. For best ATS compatibility, use the <span className="font-bold">Job Tailoring</span> text-based export.
                    </p>
                </div>
            )}

            {/* Preview */}
            <div className="flex-1 overflow-auto bg-slate-200 flex justify-center p-8">
                <motion.div
                    animate={{ scale: zoom / 100 }}
                    className="origin-top"
                    style={{ transformOrigin: 'top center' }}
                >
                    {viewMode === 'original' && originalPdfUrl ? (
                        /* ===== ORIGINAL PDF VIEW ===== */
                        <object
                            data={originalPdfUrl}
                            type="application/pdf"
                            width="595"
                            height="842"
                            className="bg-white shadow-2xl"
                            style={{ minHeight: '842px' }}
                        >
                            <div className="flex items-center justify-center h-full bg-white p-10 text-center">
                                <p>PDF preview not available. <a href={originalPdfUrl} download className="text-blue-500 underline">Download instead</a></p>
                            </div>
                        </object>
                    ) : hasData ? (
                        /* ===== EDITED DOCUMENT VIEW =====
                           Styled as a clean, traditional resume document â€” NOT a flashy template.
                           Uses standard serif/sans-serif fonts, no colored backgrounds, no icons,
                           no pill badges. This should feel like a real document. */
                        <div
                            ref={resumeRef}
                            className="bg-white shadow-2xl"
                            style={{
                                width: '595px',
                                minHeight: '842px',
                                padding: '48px 54px',
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                color: '#1a1a1a',
                                fontSize: '11px',
                                lineHeight: '1.5',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* â”€â”€ Name & Contact â”€â”€ */}
                            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1.5px solid #333', paddingBottom: '14px' }}>
                                <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 2px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Georgia', serif" }}>
                                    {resumeData.name || 'Your Name'}
                                    {isFieldEdited('name') && <EditedBadge />}
                                </h1>
                                {resumeData.title && (
                                    <p style={{ fontSize: '12px', margin: '0 0 8px', color: '#444', fontStyle: 'italic' }}>
                                        {resumeData.title}
                                        {isFieldEdited('title') && <EditedBadge />}
                                    </p>
                                )}
                                <p style={{ fontSize: '10px', color: '#555', margin: 0, wordSpacing: '4px' }}>
                                    {[resumeData.email, resumeData.phone, resumeData.location, resumeData.linkedin]
                                        .filter(Boolean)
                                        .join('  |  ')}
                                </p>
                            </div>

                            {/* â”€â”€ Summary / Objective â”€â”€ */}
                            {resumeData.summary && (
                                <div style={{ marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '6px', fontFamily: "'Georgia', serif" }}>
                                        Professional Summary
                                        {isFieldEdited('summary') && <EditedBadge />}
                                    </h2>
                                    <p style={{ fontSize: '10.5px', lineHeight: '1.6', color: '#2a2a2a', margin: 0, textAlign: 'justify' }}>
                                        {resumeData.summary}
                                    </p>
                                </div>
                            )}

                            {/* â”€â”€ Experience â”€â”€ */}
                            {safeExperience.length > 0 && safeExperience.some(e => e && (e.company || e.title)) && (
                                <div style={{ marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '6px', fontFamily: "'Georgia', serif" }}>
                                        Experience
                                        {isFieldEdited('experience') && <EditedBadge />}
                                    </h2>
                                    {safeExperience.filter(e => e && (e.company || e.title)).map((exp, i) => (
                                        <div key={i} style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700' }}>{exp.title || ''}</span>
                                                <span style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>{exp.duration || ''}</span>
                                            </div>
                                            {exp.company && (
                                                <p style={{ fontSize: '10.5px', color: '#444', margin: '1px 0 4px', fontStyle: 'italic' }}>{exp.company}</p>
                                            )}
                                            {exp.description && (
                                                <p style={{ fontSize: '10.5px', lineHeight: '1.55', color: '#2a2a2a', margin: 0, paddingLeft: '12px', textAlign: 'justify' }}>
                                                    {exp.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* â”€â”€ Education â”€â”€ */}
                            {(resumeData.degree || resumeData.institution) && (
                                <div style={{ marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '6px', fontFamily: "'Georgia', serif" }}>
                                        Education
                                        {isFieldEdited('degree') && <EditedBadge />}
                                    </h2>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{resumeData.degree || ''}</span>
                                            {resumeData.institution && (
                                                <span style={{ fontSize: '10.5px', color: '#444', fontStyle: 'italic' }}> â€” {resumeData.institution}</span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#666' }}>
                                            {[resumeData.gradYear, resumeData.cgpa ? `CGPA: ${resumeData.cgpa}` : ''].filter(Boolean).join(' | ')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* â”€â”€ Skills â”€â”€ */}
                            {safeSkills && (
                                <div style={{ marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '6px', fontFamily: "'Georgia', serif" }}>
                                        Technical Skills
                                        {isFieldEdited('skills') && <EditedBadge />}
                                    </h2>
                                    <p style={{ fontSize: '10.5px', lineHeight: '1.6', color: '#2a2a2a', margin: 0 }}>
                                        {safeSkills}
                                    </p>
                                </div>
                            )}

                            {/* â”€â”€ Projects â”€â”€ */}
                            {safeProjects.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '6px', fontFamily: "'Georgia', serif" }}>
                                        Projects
                                        {isFieldEdited('projects') && <EditedBadge />}
                                    </h2>
                                    {safeProjects.map((proj, i) => (
                                        <div key={i} style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                {proj.name && <span style={{ fontSize: '11px', fontWeight: '700' }}>{proj.name}</span>}
                                                {proj.duration && <span style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>{proj.duration}</span>}
                                            </div>
                                            {proj.tech && (
                                                <p style={{ fontSize: '10px', color: '#555', margin: '1px 0 3px', fontStyle: 'italic' }}>{proj.tech}</p>
                                            )}
                                            {proj.description && (
                                                <p style={{ fontSize: '10.5px', lineHeight: '1.55', color: '#2a2a2a', margin: 0, paddingLeft: '12px', textAlign: 'justify' }}>{proj.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white w-[595px] min-h-[842px] p-12 flex flex-col items-center justify-center text-slate-400 shadow-2xl gap-4">
                            <FileText size={48} className="text-slate-300" />
                            <p className="text-center font-bold">Upload a resume or fill in the form to see a live preview</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ResumePreviewPanel;
