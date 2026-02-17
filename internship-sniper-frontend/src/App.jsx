import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ResumeUpload from './components/ResumeUpload';
import InterestSelector from './components/InterestSelector';
import JobFeed from './components/JobFeed';
import HQDashboard from './components/HQDashboard';
import ResumeStudio from './components/ResumeStudio';
import ErrorBoundary from './components/ErrorBoundary';
import { FileText, Target, Search, ArrowRight, Globe } from 'lucide-react';

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isHQOpen, setIsHQOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null); // Job context for tailoring
  const [userCountry, setUserCountry] = useState(() => {
    return localStorage.getItem('sniper_country') || 'India';
  });

  // Load parsed resume data from localStorage on mount
  const [parsedResumeData, setParsedResumeData] = useState(() => {
    const saved = localStorage.getItem('parsedResumeData');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [originalPdfUrl, setOriginalPdfUrl] = useState(null);

  // Revoke old blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (originalPdfUrl && originalPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(originalPdfUrl);
      }
    };
  }, [originalPdfUrl]);

  // Stable callback to avoid unnecessary child re-renders
  const handleResumeUpdate = useCallback((data) => {
    setParsedResumeData(data);
  }, []);

  // Save parsed resume data to localStorage when it changes
  useEffect(() => {
    if (parsedResumeData) {
      try {
        localStorage.setItem('parsedResumeData', JSON.stringify(parsedResumeData));
      } catch (e) {
        console.warn('Failed to save resume data to localStorage:', e);
      }
    }
  }, [parsedResumeData]);

  const toggleInterest = (id) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCountryChange = (country) => {
    setUserCountry(country);
    localStorage.setItem('sniper_country', country);
  };

  // Map interest IDs to search-friendly labels
  const interestLabels = {
    ai: 'AI Machine Learning',
    web: 'Web Development',
    data: 'Data Analytics',
    security: 'Cyber Security',
    fintech: 'FinTech',
    creative: 'Product Design UX',
    research: 'Research',
    startup: 'Startup'
  };

  const getSearchQuery = () => {
    if (searchQuery) return searchQuery;
    if (selectedInterests.length > 0) {
      return selectedInterests.map(id => interestLabels[id] || id).join(' ');
    }
    return 'internship';
  };

  const handleNavigate = (section) => {
    if (section === 'hq') {
      setIsHQOpen(true);
    } else {
      setActiveSection(section);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setActiveSection('jobs');
  };

  // When user clicks "Open in Studio" from a job tailoring flow
  const handleOpenInStudio = (job, tailoredData) => {
    if (tailoredData) {
      setParsedResumeData(tailoredData);
    }
    setSelectedJob(job);
    setActiveSection('studio');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar activeSection={isHQOpen ? 'hq' : activeSection} onNavigate={handleNavigate} />
      <Header onSearch={handleSearch} />
      <HQDashboard isOpen={isHQOpen} onClose={() => setIsHQOpen(false)} />

      <main className="lg:ml-20 pt-16 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* HOME SECTION */}
            {activeSection === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Hero */}
                <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden">
                  {/* Decorative shapes */}
                  <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-24 -mb-24 blur-2xl" />
                  <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-violet-400/10 rounded-full blur-2xl" />

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="max-w-lg space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-bold text-blue-100 border border-white/10">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        AI-Powered Platform
                      </div>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight">
                        Land Your Dream<br />
                        <span className="text-blue-200">Internship</span> Today
                      </h1>
                      <p className="text-blue-100/80 text-base md:text-lg leading-relaxed max-w-md">
                        Upload your resume, discover matching opportunities, and tailor your application — all in one place.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => setActiveSection('discover')}
                          className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 active:scale-[0.98]"
                        >
                          Start Exploring <ArrowRight size={18} />
                        </button>
                        <button
                          onClick={() => setActiveSection('studio')}
                          className="bg-white/10 backdrop-blur-sm text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all border border-white/20 active:scale-[0.98]"
                        >
                          Open Studio
                        </button>
                      </div>
                    </div>

                    {/* Stats chips */}
                    <div className="flex md:flex-col gap-3">
                      {[
                        { label: 'AI Models', value: '4', color: 'bg-blue-500/30' },
                        { label: 'Job Sources', value: '3+', color: 'bg-indigo-500/30' },
                        { label: 'PDF Export', value: 'ATS', color: 'bg-violet-500/30' },
                      ].map(stat => (
                        <div key={stat.label} className={`${stat.color} backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center min-w-[90px]`}>
                          <p className="text-2xl font-black">{stat.value}</p>
                          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Action Cards */}
                <div>
                  <h2 className="section-heading mb-6">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                      { section: 'discover', icon: FileText, label: 'Analyze Resume', desc: 'Upload and get AI-powered insights', gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', iconColor: 'text-blue-500' },
                      { section: 'jobs', icon: Search, label: 'Browse Internships', desc: 'Explore live opportunities across the web', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', iconColor: 'text-emerald-500' },
                      { section: 'studio', icon: Target, label: 'Resume Studio', desc: 'Edit & tailor resume for specific jobs', gradient: 'from-violet-500 to-violet-600', light: 'bg-violet-50', iconColor: 'text-violet-500' },
                    ].map(card => (
                      <motion.div
                        key={card.section}
                        whileHover={{ y: -6, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveSection(card.section)}
                        className="card-interactive p-6 flex flex-col items-start gap-4 group"
                      >
                        <div className={`w-12 h-12 ${card.light} rounded-xl flex items-center justify-center ${card.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                          <card.icon size={24} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{card.label}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-auto">
                          Get Started <ArrowRight size={14} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Resume status indicator */}
                {parsedResumeData && parsedResumeData.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Resume Loaded: {parsedResumeData.name}</p>
                        <p className="text-xs text-emerald-600/80 mt-0.5">{parsedResumeData.skills ? (Array.isArray(parsedResumeData.skills) ? parsedResumeData.skills.join(', ').substring(0, 80) : String(parsedResumeData.skills).substring(0, 80)) + '...' : 'Ready for tailoring'}</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveSection('studio')} className="text-xs font-bold text-emerald-700 bg-emerald-100 px-4 py-2.5 rounded-xl hover:bg-emerald-200 transition-all shadow-sm">
                      Open Studio
                    </button>
                  </motion.div>
                )}

                {/* Region selector */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Search Region</p>
                      <p className="text-xs text-slate-400 mt-0.5">Jobs will be searched in this country</p>
                    </div>
                  </div>
                  <select
                    value={userCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    {['India', 'United States', 'United Kingdom', 'Canada', 'Germany', 'Australia', 'Singapore', 'UAE'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* DISCOVER SECTION */}
            {activeSection === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="section-heading">Resume Analysis</h2>
                </div>
                <ResumeUpload onParsedResume={(data, pdfUrl) => {
                  setParsedResumeData(data);
                  if (pdfUrl) setOriginalPdfUrl(pdfUrl);
                  setActiveSection('studio');
                }} />

                <div className="pt-8 border-t border-slate-200">
                  <h2 className="section-heading mb-6">Select Your Interests</h2>
                  <InterestSelector
                    selectedInterests={selectedInterests}
                    onToggle={toggleInterest}
                  />
                </div>

                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => {
                      setSearchQuery(''); // Clear manual search so interests are used
                      setActiveSection('jobs');
                    }}
                    disabled={selectedInterests.length === 0}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Find Matching Jobs <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* JOBS SECTION */}
            {activeSection === 'jobs' && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <ErrorBoundary>
                  <JobFeed
                    query={getSearchQuery()}
                    parsedResumeData={parsedResumeData}
                    onOpenInStudio={handleOpenInStudio}
                    country={userCountry}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* STUDIO SECTION */}
            {activeSection === 'studio' && (
              <motion.div
                key="studio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="-m-8"
              >
                <ErrorBoundary>
                  <ResumeStudio
                    initialData={parsedResumeData}
                    initialPdfUrl={originalPdfUrl}
                    selectedJob={selectedJob}
                    onResumeUpdate={handleResumeUpdate}
                  />
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
