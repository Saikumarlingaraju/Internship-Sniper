import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, User, Briefcase, GraduationCap, Code, FolderOpen, Plus, X } from 'lucide-react';

const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} className="text-blue-500" />
                    <span className="font-bold text-slate-700">{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const InputField = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="input-field"
        />
    </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3 }) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="input-field resize-none"
        />
    </div>
);

const ResumeFormPanel = ({ resumeData, setResumeData }) => {
    // Safe accessor: ensure experience is always an array
    const safeExperience = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
    const safeStr = (val) => {
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) return val.map(v => typeof v === 'object' && v !== null ? (v.name || v.description || JSON.stringify(v)) : String(v || '')).join(', ');
        if (typeof val === 'object' && val !== null) return val.name || val.description || JSON.stringify(val);
        return String(val || '');
    };

    const updateField = (field, value) => {
        setResumeData(prev => ({ ...prev, [field]: value }));
    };

    const addExperience = () => {
        setResumeData(prev => ({
            ...prev,
            experience: [...(Array.isArray(prev.experience) ? prev.experience : []), { company: '', title: '', duration: '', description: '' }]
        }));
    };

    const updateExperience = (index, field, value) => {
        setResumeData(prev => ({
            ...prev,
            experience: (Array.isArray(prev.experience) ? prev.experience : []).map((exp, i) => i === index ? { ...exp, [field]: value } : exp)
        }));
    };

    const removeExperience = (index) => {
        setResumeData(prev => ({
            ...prev,
            experience: (Array.isArray(prev.experience) ? prev.experience : []).filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="h-full bg-white border-r border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-800">Resume Editor</h2>
                <p className="text-xs text-slate-500">Fill in your details below</p>
            </div>

            <Section title="Personal Information" icon={User} defaultOpen={true}>
                <InputField label="Full Name" value={safeStr(resumeData.name)} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g., Sai Kumar" />
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Email" value={safeStr(resumeData.email)} onChange={(e) => updateField('email', e.target.value)} placeholder="email@example.com" type="email" />
                    <InputField label="Phone" value={safeStr(resumeData.phone)} onChange={(e) => updateField('phone', e.target.value)} placeholder="+91 98765 43210" />
                </div>
                <InputField label="Job Title" value={safeStr(resumeData.title)} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g., Software Developer" />
                <InputField label="Location" value={safeStr(resumeData.location)} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g., Hyderabad, India" />
                <InputField label="LinkedIn" value={safeStr(resumeData.linkedin)} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="linkedin.com/in/yourprofile" />
            </Section>

            <Section title="Professional Summary" icon={Briefcase}>
                <TextAreaField label="Summary" value={safeStr(resumeData.summary)} onChange={(e) => updateField('summary', e.target.value)} placeholder="Write a brief professional summary..." rows={4} />
            </Section>

            <Section title="Work Experience" icon={Briefcase}>
                {safeExperience.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3 relative">
                        <button onClick={() => removeExperience(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={16} />
                        </button>
                        <InputField label="Company" value={safeStr(exp?.company)} onChange={(e) => updateExperience(idx, 'company', e.target.value)} placeholder="Company Name" />
                        <InputField label="Job Title" value={safeStr(exp?.title)} onChange={(e) => updateExperience(idx, 'title', e.target.value)} placeholder="Your role" />
                        <InputField label="Duration" value={safeStr(exp?.duration)} onChange={(e) => updateExperience(idx, 'duration', e.target.value)} placeholder="e.g., Jan 2023 - Present" />
                        <TextAreaField label="Description" value={safeStr(exp?.description)} onChange={(e) => updateExperience(idx, 'description', e.target.value)} placeholder="Describe your responsibilities..." rows={3} />
                    </div>
                ))}
                <button onClick={addExperience} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-500 transition-all text-sm font-bold">
                    <Plus size={16} /> Add Experience
                </button>
            </Section>

            <Section title="Education" icon={GraduationCap}>
                <InputField label="Degree" value={safeStr(resumeData.degree)} onChange={(e) => updateField('degree', e.target.value)} placeholder="e.g., B.Tech in Computer Science" />
                <InputField label="Institution" value={safeStr(resumeData.institution)} onChange={(e) => updateField('institution', e.target.value)} placeholder="University/College name" />
                <InputField label="Graduation Year" value={safeStr(resumeData.gradYear)} onChange={(e) => updateField('gradYear', e.target.value)} placeholder="e.g., 2024" />
                <InputField label="CGPA/Percentage" value={safeStr(resumeData.cgpa)} onChange={(e) => updateField('cgpa', e.target.value)} placeholder="e.g., 8.5" />
            </Section>

            <Section title="Skills" icon={Code}>
                <TextAreaField label="Technical Skills" value={safeStr(resumeData.skills)} onChange={(e) => updateField('skills', e.target.value)} placeholder="e.g., Python, React, Machine Learning..." rows={3} />
            </Section>

            <Section title="Projects" icon={FolderOpen}>
                <TextAreaField label="Key Projects" value={safeStr(resumeData.projects)} onChange={(e) => updateField('projects', e.target.value)} placeholder="Describe your notable projects..." rows={4} />
            </Section>
        </div>
    );
};

export default ResumeFormPanel;
