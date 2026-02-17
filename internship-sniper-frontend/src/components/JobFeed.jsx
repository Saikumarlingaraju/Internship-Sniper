import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Briefcase, Sparkles, MapPin, Star, Bookmark, Target, Zap, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';

import ResumeTailor from './ResumeTailor';

const JobCard = ({ job, index, isBookmarked, onBookmark, parsedResumeData, onOpenInStudio }) => {
    const [isTailorOpen, setIsTailorOpen] = useState(false);
    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', damping: 25, stiffness: 200 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 group relative"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg uppercase tracking-wider border border-blue-100">
                            {job.source}
                        </span>
                        {job.simulated && (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg uppercase tracking-wider border border-amber-200">
                                Sample
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <MapPin size={13} className="text-slate-300" /> {job.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                            <Star size={13} className="text-amber-400 fill-amber-400" /> {job.salary}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors duration-200 truncate">
                            {job.title}
                        </h3>
                        <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                            <Briefcase size={15} className="text-slate-300 flex-shrink-0" />
                            {job.company}
                        </p>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{job.description}</p>
                </div>

                {/* Match Score Circle */}
                <div className="flex-shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full border-[3px] border-slate-100 p-1 group-hover:border-blue-100 transition-colors duration-200">
                        <div className="w-full h-full rounded-full bg-slate-50 flex flex-col items-center justify-center">
                            {job.score >= 0 ? (
                                <>
                                    <span className="text-xl font-black text-slate-900">{job.score}%</span>
                                    <span className="text-[7px] uppercase font-bold text-blue-500 tracking-wider">Match</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-base font-bold text-slate-300">N/A</span>
                                    <span className="text-[7px] uppercase font-bold text-slate-300 tracking-wider">Upload CV</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 pt-5 border-t border-slate-50 flex flex-wrap justify-between items-center gap-4 relative z-10">
                <div className="flex items-center gap-2.5">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onBookmark(job)}
                        className={`p-2.5 rounded-xl transition-all duration-200 border ${isBookmarked ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'}`}
                    >
                        <Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} />
                    </motion.button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 hidden sm:inline">
                        {isBookmarked ? 'Saved' : 'Save'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsTailorOpen(true)}
                        className="px-5 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-100 hover:border-blue-100 transition-all duration-200 flex items-center gap-2"
                    >
                        <Target size={14} />
                        <span className="hidden sm:inline">Tailor Resume</span>
                        <span className="sm:hidden">Tailor</span>
                    </motion.button>

                    <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-blue-600/20 hover:bg-blue-700 hover:shadow-md transition-all duration-200"
                    >
                        <span>Apply</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {isTailorOpen && (
                <ResumeTailor
                    isOpen={isTailorOpen}
                    onClose={() => setIsTailorOpen(false)}
                    job={job}
                    parsedResumeData={parsedResumeData}
                    onOpenInStudio={onOpenInStudio}
                />
            )}
        </motion.div>
    );
};

const JobFeed = ({ query = 'internship', parsedResumeData, onOpenInStudio, country = 'India' }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [bookmarks, setBookmarks] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sniper_bookmarks') || '[]'); }
        catch { return []; }
    });
    const [filterSource, setFilterSource] = useState('All');
    const [sortBy, setSortBy] = useState('relevance'); // relevance | score
    const [filterRemote, setFilterRemote] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        localStorage.setItem('sniper_bookmarks', JSON.stringify(bookmarks));
        window.dispatchEvent(new Event('bookmarks-changed'));
    }, [bookmarks]);

    const handleBookmark = (job) => {
        if (bookmarks.some(b => b.id === job.id)) {
            setBookmarks(bookmarks.filter(b => b.id !== job.id));
        } else {
            setBookmarks([...bookmarks, job]);
        }
    };

    const controllerRef = React.useRef(null);
    const pageRef = React.useRef(1);

    const fetchJobs = React.useCallback(async (loadMore = false) => {
        if (!loadMore && controllerRef.current) controllerRef.current.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const currentPage = loadMore ? pageRef.current + 1 : 1;
        try {
            if (loadMore) setLoadingMore(true);
            else { setLoading(true); pageRef.current = 1; setHasMore(true); }
            setError(null);
            const params = { query, country, page: currentPage };
            if (parsedResumeData?.skills) {
                params.userSkills = parsedResumeData.skills;
            }
            const response = await axios.get(`/api/jobs`, {
                params,
                signal: controller.signal
            });
            const newJobs = response.data;
            if (loadMore) {
                setJobs(prev => [...prev, ...newJobs]);
                pageRef.current = currentPage;
            } else {
                setJobs(newJobs);
            }
            // Backend returns ~15 results (3 platforms × 5). "No more" if fewer.
            setHasMore(newJobs.length >= 10);
            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            if (err.name === 'CanceledError') return;
            console.error('Fetch error:', err);
            setError('Failed to load internships. Please check your connection and try again.');
            setLoading(false);
            setLoadingMore(false);
        }
    }, [query, parsedResumeData?.skills, country]);

    useEffect(() => {
        fetchJobs();
        return () => { if (controllerRef.current) controllerRef.current.abort(); };
    }, [fetchJobs]);

    let filteredJobs = filterSource === 'All' ? jobs : jobs.filter(j => j.source.includes(filterSource));
    if (filterRemote) {
        filteredJobs = filteredJobs.filter(j => /remote|work from home|wfh/i.test(j.location + ' ' + j.description));
    }
    if (sortBy === 'score') {
        filteredJobs = [...filteredJobs].sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Skeleton header */}
                <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                    <div className="space-y-3">
                        <div className="skeleton h-5 w-24 rounded-full" />
                        <div className="skeleton h-6 w-40" />
                    </div>
                    <div className="flex gap-2">
                        {[1,2,3].map(i => <div key={i} className="skeleton h-9 w-20 rounded-xl" />)}
                    </div>
                </div>

                {/* Skeleton cards */}
                {[1,2,3].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="space-y-4 flex-1">
                                <div className="flex gap-2">
                                    <div className="skeleton h-5 w-16 rounded-lg" />
                                    <div className="skeleton h-5 w-24 rounded-lg" />
                                </div>
                                <div className="skeleton h-6 w-3/4" />
                                <div className="skeleton h-4 w-1/3" />
                                <div className="skeleton h-4 w-full" />
                                <div className="skeleton h-4 w-2/3" />
                            </div>
                            <div className="skeleton w-[72px] h-[72px] rounded-full flex-shrink-0" />
                        </div>
                        <div className="border-t border-slate-50 pt-5 flex justify-between">
                            <div className="skeleton h-10 w-10 rounded-xl" />
                            <div className="flex gap-3">
                                <div className="skeleton h-10 w-28 rounded-xl" />
                                <div className="skeleton h-10 w-20 rounded-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 bg-white rounded-2xl border border-rose-100 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                    <Target size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Connection Issue</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">{error}</p>
                <button
                    onClick={fetchJobs}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 pb-6">
                    <div>
                        {jobs.length > 0 && jobs.every(j => j.simulated) ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                                <Sparkles size={12} /> Sample Data
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                                <Sparkles size={12} /> Live Data
                            </div>
                        )}
                        <h2 className="section-heading">Internships</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['All', 'Unstop', 'Internshala', 'LinkedIn'].map(source => (
                            <button
                                key={source}
                                onClick={() => setFilterSource(source)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterSource === source ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                            >
                                {source}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                        >
                            <SlidersHorizontal size={14} />
                        </button>
                    </div>

                    {showFilters && (
                        <div className="flex flex-wrap gap-3 mt-3">
                            <button
                                onClick={() => setFilterRemote(!filterRemote)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterRemote ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}
                            >
                                Remote Only
                            </button>
                            <button
                                onClick={() => setSortBy(sortBy === 'score' ? 'relevance' : 'score')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${sortBy === 'score' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}
                            >
                                Sort by Match %
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {filteredJobs.map((job, idx) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            index={idx}
                            isBookmarked={bookmarks.some(b => b.id === job.id)}
                            onBookmark={handleBookmark}
                            parsedResumeData={parsedResumeData}
                            onOpenInStudio={onOpenInStudio}
                        />
                    ))}
                </div>

                {/* Load More */}
                {hasMore && (
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={() => fetchJobs(true)}
                            disabled={loadingMore}
                            className="px-6 py-2.5 bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'Load More Results'}
                        </button>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-80 space-y-8">
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
                        <Zap size={20} className="text-amber-500" />
                        Market Intelligence
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Skills in Demand</p>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    // Extract real skills from loaded job snippets
                                    const allText = jobs.map(j => `${j.title} ${j.description}`).join(' ').toLowerCase();
                                    const skillKeywords = ['react', 'python', 'javascript', 'node.js', 'java', 'sql', 'aws', 'docker', 'figma', 'excel', 'machine learning', 'typescript', 'next.js', 'flutter', 'django', 'tailwind', 'git', 'mongodb', 'kubernetes', 'c++'];
                                    const found = skillKeywords.filter(s => allText.includes(s)).slice(0, 6);
                                    return (found.length > 0 ? found : ['Upload resume', 'to see matches']).map(s => (
                                        <span key={s} className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded border border-blue-100 capitalize">{s}</span>
                                    ));
                                })()}
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Listings Found</p>
                            <p className="text-slate-700 text-xs font-bold">{jobs.length} results from {[...new Set(jobs.map(j => j.source))].join(', ') || 'search'}</p>
                        </div>
                    </div>
                </div>

                {bookmarks.length > 0 && (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-base font-bold text-slate-800">Saved ({bookmarks.length})</h3>
                        <div className="space-y-3">
                            {bookmarks.slice(0, 5).map(b => (
                                <div key={b.id} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-800 text-xs font-bold truncate">{b.title}</p>
                                    <p className="text-slate-500 text-[10px] font-medium">{b.company}</p>
                                </div>
                            ))}
                            {bookmarks.length > 5 && <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">+ {bookmarks.length - 5} more saved</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobFeed;
