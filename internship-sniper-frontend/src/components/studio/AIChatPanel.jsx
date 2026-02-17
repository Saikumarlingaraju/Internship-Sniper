import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Wand2, Target, FileSearch, TrendingUp } from 'lucide-react';
import axios from 'axios';

const MAX_MESSAGES = 50;

const quickActions = [
    { id: 'improve', label: 'Improve my summary', icon: Wand2 },
    { id: 'keywords', label: 'Suggest ATS keywords', icon: Target },
    { id: 'experience', label: 'Enhance experience bullet points', icon: FileSearch },
    { id: 'market_fit', label: 'Deep Job Market Analysis (Kimi)', icon: TrendingUp },
];

const AIChatPanel = ({ resumeData, onSuggestion }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I can help you improve your resume. Ask me for feedback, or use the quick actions below.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Cap messages to prevent unbounded growth
    const addMessage = (msg) => {
        setMessages(prev => {
            const updated = [...prev, msg];
            return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
        });
    };

    const handleMarketFit = async () => {
        const userMessage = { role: 'user', content: 'Analyze my Market Fit using NVIDIA Kimi...' };
        addMessage(userMessage);
        setIsLoading(true);

        try {
            const country = localStorage.getItem('sniper_country') || 'India';
            const response = await axios.post('/api/analyze-market-fit', {
                resumeContext: resumeData,
                country
            });

            addMessage({ role: 'assistant', content: response.data.message });
        } catch (error) {
            addMessage({ role: 'assistant', content: 'Market Analysis failed. Please ensure backend is running.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (query) => {
        if (!query.trim()) return;

        const userMessage = { role: 'user', content: query };
        addMessage(userMessage);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/ai-chat', {
                query,
                resumeContext: resumeData,
                conversationHistory: messages.slice(-10).map(m => ({
                    role: m.role, content: m.content
                }))
            });

            addMessage({ role: 'assistant', content: response.data.message });

            if (response.data.suggestion) {
                onSuggestion(response.data.suggestion);
            }
        } catch (error) {
            addMessage({ role: 'assistant', content: 'I encountered an issue. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-500" />
                    <h2 className="font-bold text-slate-800">AI Assistant</h2>
                </div>
                <p className="text-xs text-slate-500">Get suggestions to improve your resume</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm whitespace-pre-wrap'
                            }`}>
                            {msg.content}
                        </div>
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md p-3 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Sparkles size={14} className="animate-pulse" />
                                <span className="text-xs">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap gap-2">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => action.id === 'market_fit' ? handleMarketFit() : handleSend(action.label)}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-50 ${action.id === 'market_fit'
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                    : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                }`}
                        >
                            <action.icon size={12} /> {action.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Ask anything about your resume..."
                        className="input-field flex-1 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl px-4 outline-none border focus:border-blue-400"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        disabled={isLoading || !input.trim()}
                        className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
