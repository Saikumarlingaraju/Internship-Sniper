const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const rateLimit = require('express-rate-limit');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')).toString();
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Development-only logger (suppressed in production)
const devLog = (...args) => { if (!IS_PROD) console.log(...args); };

// Trust proxy for rate limiter behind reverse proxy (Heroku, Railway, etc.)
if (IS_PROD) app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Let frontend handle CSP
}));

// Gzip compression
app.use(compression());

// Robust JSON parser for AI responses (module-level so all routes can use it)
const cleanAndParseJSON = (str) => {
    try {
        str = str.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = str.indexOf('{');
        const lastClose = str.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            str = str.substring(firstOpen, lastClose + 1);
        }
        str = str.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON Parse Error:', e.message);
        return null;
    }
};

// Helper function for PDF text extraction (module-level for reuse)
const extractPdfTextRobust = async (pdfBuffer) => {
    try {
        const data = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText.trim();
    } catch (err) {
        console.error('Text extraction error:', err);
        return '';
    }
};

// Sanitize user input — truncate to limit and strip control chars
const sanitizeInput = (str, maxLen = 10000) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').substring(0, maxLen);
};

// Configure multer for file uploads (store in memory, 5 MB max)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

app.use(cors({
    origin: IS_PROD ? (process.env.CORS_ORIGIN || 'https://internship-sniper.com') : '*',
    methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '2mb' }));

// Rate limiting for AI endpoints (10 requests per minute)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests. Please wait a moment.' }
});
app.use('/api/analyze-fit', aiLimiter);
app.use('/api/generate-cover-letter', aiLimiter);
app.use('/api/ats-audit', aiLimiter);
app.use('/api/ai-chat', aiLimiter);
app.use('/api/analyze-market-fit', aiLimiter);
app.use('/api/tailor-resume', aiLimiter);
app.use('/api/upload-resume', aiLimiter);

// Rate limiting for job search (20 requests per minute)
const jobsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many search requests. Please wait a moment.' }
});
app.use('/api/jobs', jobsLimiter);

// Health-check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0'
    });
});

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Job Search Aggregator (Serper.dev)
app.get('/api/jobs', async (req, res) => {
    try {
        const { query = 'internship', userSkills = '', country = 'India', page = '1' } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const resultsPerPlatform = 5;
        const startOffset = (pageNum - 1) * resultsPerPlatform;

        // Parse user skills for matching
        const skillsList = userSkills
            .toLowerCase()
            .split(/[,;|]+/)
            .map(s => s.trim())
            .filter(s => s.length > 1);

        if (!SERPER_API_KEY || SERPER_API_KEY.includes('your_serper_api_key')) {
            console.warn('Serper API Key missing. Falling back to simulated aggregator.');
            return res.json(getSimulatedJobs(query));
        }

        const platforms = ['unstop.com', 'internshala.com', 'linkedin.com/jobs'];
        const countryMap = { 'india': 'in', 'united states': 'us', 'united kingdom': 'uk', 'canada': 'ca', 'germany': 'de', 'australia': 'au', 'singapore': 'sg', 'uae': 'ae' };
        const countryCode = countryMap[country.toLowerCase()] || 'us';

        // Query all platforms in PARALLEL
        const platformPromises = platforms.map(async (platform) => {
            try {
                const searchQuery = `site:${platform} internship ${query} ${country}`;
                const response = await axios.post('https://google.serper.dev/search', {
                    q: searchQuery,
                    gl: countryCode,
                    hl: 'en',
                    num: resultsPerPlatform,
                    ...(startOffset > 0 ? { start: startOffset } : {})
                }, {
                    headers: {
                        'X-API-KEY': SERPER_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                return (response.data.organic || []).map(result => ({ result, platform }));
            } catch (platformErr) {
                console.warn(`Search failed for ${platform}:`, platformErr.message);
                return [];
            }
        });

        const results = await Promise.allSettled(platformPromises);
        let allJobs = [];
        results.forEach(r => {
            if (r.status === 'fulfilled') {
                r.value.forEach(item => allJobs.push({ ...item, globalIndex: allJobs.length }));
            }
        });

        const jobs = allJobs.map(({ result, platform, globalIndex }) => {
            const rawTitle = result.title || "Internship Position";
            const titleMatch = rawTitle.match(/(.*) Internship/i);
            const title = titleMatch ? titleMatch[1].trim() + " Intern" : rawTitle;

            const snippet = result.snippet || "";
            const salaryMatch = snippet.match(/₹[0-9,]+/);
            const salary = salaryMatch ? salaryMatch[0] + ' /mo' : 'Competitive Stipend';

            const source = result.link.includes('unstop') ? 'Unstop' :
                result.link.includes('internshala') ? 'Internshala' : 'LinkedIn India';

            // Safer location extraction (e.g. "internship in Bangalore, India")
            let location = `${country} (Remote)`;
            if (snippet.toLowerCase().includes('in ')) {
                const parts = snippet.split(/in /i);
                if (parts.length > 1) {
                    location = parts[1].split(/[.,]/)[0].trim().slice(0, 30);
                }
            }

            // Use a longer hash to avoid ID collisions
            const id = crypto.createHash('md5').update(result.link || globalIndex.toString()).digest('hex').slice(0, 16);

            // Skill-based relevance score
            let score = 0;
            if (skillsList.length > 0) {
                const textToMatch = (rawTitle + ' ' + snippet).toLowerCase();
                const matched = skillsList.filter(skill => textToMatch.includes(skill));
                score = Math.round((matched.length / skillsList.length) * 100);
                // Clamp to 5-100 range, with a small positional boost for top results
                score = Math.min(100, Math.max(5, score + Math.max(0, 5 - globalIndex)));
            } else {
                // No skills provided — show a neutral "?" instead of fake high scores
                score = -1; // Frontend will display "N/A" for -1
            }

            return {
                id,
                title,
                company: rawTitle.split(/[|:-]/)[1]?.trim() || rawTitle.split(/at/i)[1]?.trim() || "Company",
                location: location || country,
                source: source,
                source_type: 'Live Verification Ready',
                score,
                url: result.link,
                salary,
                description: snippet
            };
        });

        res.json(jobs);
    } catch (error) {
        console.error('Search orchestration failed:', error);
        res.status(500).json({ error: 'Failed to fetch real-time targets' });
    }
});

// Fallback logic for when API key is missing
function getSimulatedJobs(query) {
    const platforms = ['Unstop', 'Internshala', 'LinkedIn India'];
    const locations = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Pune'];

    return Array.from({ length: 6 }).map((_, i) => ({
        id: `sim-${i}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} Intern`,
        company: "Sample Company",
        location: locations[i % locations.length],
        source: platforms[i % platforms.length],
        source_type: 'Sample',
        score: -1, // No real score for simulated data
        simulated: true,
        url: ['https://unstop.com', 'https://internshala.com', 'https://linkedin.com/jobs'][i % 3],
        salary: "Not specified",
        description: `Sample ${query} listing. Add your SERPER_API_KEY in .env to see real job results from multiple platforms.`
    }));
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Resume-JD Fit Analysis (Gemini AI)
app.post('/api/analyze-fit', async (req, res) => {
    try {
        const { resume, jobDescription } = req.body;
        if (!resume || !jobDescription) {
            return res.status(400).json({ error: 'Missing required fields: resume, jobDescription' });
        }

        const safeResume = sanitizeInput(resume, 10000);
        const safeJD = sanitizeInput(jobDescription, 8000);

        if (!genAI || GEMINI_API_KEY.includes('your_gemini_api_key')) {
            console.warn('Gemini API Key missing. Falling back to simulated analysis.');
            const analysis = {
                matchPercentage: Math.floor(Math.random() * 20) + 75,
                missingKeywords: ['Python', 'Cloud Computing', 'System Architecture'],
                tailoringTips: [
                    "Highlight your experience with 'Agile Methodologies'.",
                    "Add a Gemini API Key to activate real-time intelligence."
                ],
                calibratedResume: "Please add your Gemini API Key in the backend .env to see real suggestions."
            };
            return res.json(analysis);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `
            You are an elite career consultancy AI. 
            Analyze the following Resume against the Job Description.
            
            RESUME:
            ${safeResume}

            JOB DESCRIPTION:
            ${safeJD}

            Provide a response in STRICT JSON format with the following keys:
            - matchPercentage: (number 0-100)
            - missingKeywords: (array of strings of keywords found in JD but not in Resume)
            - tailoringTips: (array of 3 specific, actionable tips to improve the resume for this JD)
            - calibratedResume: (a short 1-2 sentence executive summary of what to change)
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let analysis;
        try {
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        } catch (parseErr) {
            console.error('Failed to parse AI response:', parseErr.message);
            return res.status(500).json({ error: 'AI returned an invalid response. Please try again.' });
        }

        res.json(analysis);
    } catch (error) {
        console.error('AI Analysis failed:', error);
        res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
});

// Cover Letter Generation
app.post('/api/generate-cover-letter', async (req, res) => {
    try {
        const { resume, jobDescription, company, title } = req.body;
        if (!resume || !jobDescription) {
            return res.status(400).json({ error: 'Missing required fields: resume, jobDescription' });
        }

        const safeResume = sanitizeInput(resume, 10000);
        const safeJD = sanitizeInput(jobDescription, 8000);
        const safeCompany = sanitizeInput(company || '', 200);
        const safeTitle = sanitizeInput(title || '', 200);

        if (!genAI || GEMINI_API_KEY.includes('your_gemini_api_key')) {
            return res.json({ coverLetter: "Cover Letter Engine simulated: [Professional letter would appear here]" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const prompt = `
            Write a strategic, high-impact cover letter for an internship.
            COMPANY: ${safeCompany}
            ROLE: ${safeTitle}
            JOB DESCRIPTION / LISTING PREVIEW: ${safeJD}
            NOTE: The job description above may be a brief search preview. Focus on the role title, company, and candidate skills rather than specific JD requirements if the description is short.
            CANDIDATE RESUME: ${safeResume}
            
            TONE: Professional, ambitious, and deeply researched. 
            Keep it strictly under 300 words. Focus on how the candidate's specific skills solve the company's needs.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        res.json({ coverLetter: responseText });
    } catch (error) {
        console.error('Cover letter failed:', error);
        res.status(500).json({ error: 'Cover letter generation failed. Please try again.' });
    }
});

// ATS Structural Audit
app.post('/api/ats-audit', async (req, res) => {
    try {
        const { resume } = req.body;
        if (!resume) {
            return res.status(400).json({ error: 'Missing required field: resume' });
        }

        const safeResume = sanitizeInput(resume, 10000);

        if (!genAI || GEMINI_API_KEY.includes('your_gemini_api_key')) {
            return res.json({
                passed: true,
                score: 85,
                findings: ["Simulated Audit: Structure looks clean."]
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const prompt = `
            Analyze this resume for ATS (Applicant Tracking System) compatibility.
            RESUME: ${safeResume}
            
            Check for:
            1. Presence of contact information.
            2. Clear heading structure.
            3. Absence of complex tables/graphics that break parsers.
            4. Professional formatting.
            
            Respond in STRICT JSON:
            {
                "passed": boolean,
                "score": 0-100,
                "findings": ["finding 1", "finding 2"]
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let auditResult;
        try {
            auditResult = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        } catch (parseErr) {
            console.error('Failed to parse ATS audit response:', parseErr.message);
            return res.status(500).json({ error: 'AI returned an invalid audit response. Please try again.' });
        }
        res.json(auditResult);
    } catch (error) {
        console.error('ATS Audit failed:', error);
        res.status(500).json({ error: 'Audit failed' });
    }
});

// Upload and Parse Resume PDF/DOCX/Image with OCR
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    devLog('Resume upload started');

    const createEmptyResponse = (message = '') => ({
        name: '',
        email: '',
        phone: '',
        title: '',
        location: '',
        linkedin: '',
        summary: message || 'Please fill in your details manually.',
        experience: [{ company: '', title: '', duration: '', description: '' }],
        degree: '',
        institution: '',
        gradYear: '',
        cgpa: '',
        skills: '',
        projects: ''
    });

    try {
        if (!req.file) {
            devLog('No file uploaded');
            return res.json(createEmptyResponse('No file was uploaded. Please select a resume file.'));
        }

        const { originalname, mimetype, buffer, size } = req.file;
        devLog(`File: ${originalname}, Type: ${mimetype}, Size: ${size} bytes`);

        let extractedText = '';

        // ============================================================
        // PRIMARY METHOD: Gemini Vision (Image-based AI parsing)
        // Renders PDF/Image to PNG and sends directly to Gemini Vision.
        // The AI "sees" the resume like a human — no broken text.
        // ============================================================
        if (genAI && !GEMINI_API_KEY.includes('your_gemini_api_key')) {
            devLog('Using Gemini Vision pipeline...');
            // Only use models that actually exist and support vision
            const modelNames = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
            let imagePartsForAI = [];

            try {
                // Step 1: Convert file to image(s)
                const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');
                const isImage = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'].includes(mimetype);

                if (isPdf) {
                    devLog('Converting PDF pages to images for Vision...');
                    const data = new Uint8Array(buffer);
                    const loadingTask = pdfjsLib.getDocument({ data });
                    const pdf = await loadingTask.promise;

                    // Render up to 3 pages to capture full resume content
                    const pagesToRender = Math.min(pdf.numPages, 3);
                    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.0 });
                        const canvas = createCanvas(viewport.width, viewport.height);
                        const context = canvas.getContext('2d');

                        await page.render({ canvasContext: context, viewport }).promise;

                        const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
                        const base64Image = jpegBuffer.toString('base64');

                        imagePartsForAI.push({
                            inlineData: { mimeType: 'image/jpeg', data: base64Image }
                        });
                        devLog(`Page ${pageNum}/${pagesToRender} rendered as JPEG (${Math.round(jpegBuffer.length / 1024)}KB)`);
                    }
                } else if (isImage) {
                    devLog('Using uploaded image directly for Vision...');
                    const imgMime = mimetype === 'image/jpg' ? 'image/jpeg' : mimetype;
                    imagePartsForAI.push({
                        inlineData: { mimeType: imgMime, data: buffer.toString('base64') }
                    });
                }

                // Step 2: Send image to Gemini Vision (with retry for rate limits)
                if (imagePartsForAI.length > 0) {
                    const visionPrompt = `You are a resume parser. Extract ALL information from these resume page image(s) into JSON. There may be multiple pages — combine all data into one JSON object.

Respond with ONLY valid JSON. No markdown, no code blocks.

{"name":"","email":"","phone":"","title":"","location":"","linkedin":"","summary":"","experience":[{"company":"","title":"","duration":"","description":""}],"degree":"","institution":"","gradYear":"","cgpa":"","skills":"","projects":""}

Fill every field you can see across all pages. Use "" for missing fields.`;

                    for (const modelName of modelNames) {
                        // Try up to 2 attempts per model (with delay on rate limit)
                        for (let attempt = 0; attempt < 2; attempt++) {
                            try {
                                devLog(`Vision: ${modelName} (attempt ${attempt + 1})...`);
                                const model = genAI.getGenerativeModel({ model: modelName });
                                const result = await model.generateContent([visionPrompt, ...imagePartsForAI]);
                                const responseText = result.response.text();

                                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                                if (jsonMatch) {
                                    const parsed = JSON.parse(jsonMatch[0].trim());
                                    devLog(`Vision success with ${modelName}: ${parsed.name}`);
                                    return res.json(parsed);
                                }
                            } catch (visionError) {
                                const errMsg = visionError.message || '';
                                console.error(`Vision ${modelName} attempt ${attempt + 1} failed:`, errMsg.substring(0, 200));

                                // If rate limited, wait and retry
                                if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                                    devLog('Rate limited. Waiting 5s before retry...');
                                    await new Promise(resolve => setTimeout(resolve, 5000));
                                } else {
                                    break; // Non-rate-limit error, try next model
                                }
                            }
                        }
                    }
                }
            } catch (visionPipelineError) {
                console.error('Vision pipeline error:', visionPipelineError.message);
            }
        }

        // ============================================================
        // FALLBACK 1: DigitalOcean Serverless Qwen3 32B (Text-based AI)
        // Extracts text from PDF, sends to DO for intelligent parsing.
        // Cheap (~$0.0008/resume), no rate limits, very accurate.
        // ============================================================
        // ============================================================
        // FALLBACK TIER 2 & 3: Text-based AI (DigitalOcean & NVIDIA)
        // ============================================================
        const DO_API_KEY = process.env.DO_API_KEY;
        const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

        // cleanAndParseJSON is defined at module scope above

        if (DO_API_KEY || NVIDIA_API_KEY) {
            devLog('Vision unavailable. Preparing text for AI fallbacks...');

            // Shared Text Extraction (reuse module-level helper for PDFs)
            let textForAI = '';
            try {
                if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
                    textForAI = await extractPdfTextRobust(buffer);
                } else if (mimetype === 'text/plain' || originalname.toLowerCase().endsWith('.txt')) {
                    textForAI = buffer.toString('utf-8');
                } else {
                    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
                    textForAI = text;
                }
            } catch (textErr) {
                console.error('Text extraction for AI failed:', textErr.message);
            }

            if (textForAI.trim().length > 10) {
                // TIER 2: DigitalOcean Qwen3 32B
                if (DO_API_KEY) {
                    try {
                        devLog('Trying Tier 2: DigitalOcean Qwen3...');
                        const doResponse = await axios.post(
                            'https://inference.do-ai.run/v1/chat/completions',
                            {
                                model: 'alibaba-qwen3-32b',
                                messages: [
                                    { role: 'system', content: 'You are a resume parser. Respond with ONLY valid JSON.' },
                                    { role: 'user', content: `Parse this resume into JSON:\n\n${textForAI.substring(0, 8000)}\n\nFormat:\n{"name":"","email":"","phone":"","title":"","location":"","linkedin":"","summary":"","experience":[{"company":"","title":"","duration":"","description":""}],"degree":"","institution":"","gradYear":"","cgpa":"","skills":"","projects":""}` }
                                ],
                                max_tokens: 3000, // Increased token limit
                                temperature: 0.1
                            },
                            {
                                headers: { 'Authorization': `Bearer ${DO_API_KEY}`, 'Content-Type': 'application/json' },
                                timeout: 45000 // 45s should be enough for DO
                            }
                        );

                        const aiContent = doResponse.data?.choices?.[0]?.message?.content || '';
                        const parsed = cleanAndParseJSON(aiContent);

                        if (parsed && parsed.name) {
                            devLog(`Tier 2 success (DO Qwen3): ${parsed.name}`);
                            return res.json(parsed);
                        } else {
                            console.error('Tier 2 (DO Qwen3) returned invalid JSON. Raw (first 200 chars):', aiContent.substring(0, 200));
                        }
                    } catch (doError) {
                        console.error('Tier 2 (DO Qwen3) failed:', doError.message);
                    }
                }

                // TIER 3: NVIDIA Kimi K2.5
                if (NVIDIA_API_KEY) {
                    try {
                        devLog('Trying Tier 3: NVIDIA Kimi K2.5...');
                        const nvResponse = await axios.post(
                            'https://integrate.api.nvidia.com/v1/chat/completions',
                            {
                                model: 'moonshotai/kimi-k2.5',
                                messages: [
                                    { role: 'user', content: `You are a resume parser. Extract data from this resume text into JSON.\n\nText:\n${textForAI.substring(0, 10000)}\n\nOutput strictly this JSON structure:\n{"name":"","email":"","phone":"","title":"","location":"","linkedin":"","summary":"","experience":[{"company":"","title":"","duration":"","description":""}],"degree":"","institution":"","gradYear":"","cgpa":"","skills":"","projects":""}` }
                                ],
                                max_tokens: 4000,
                                temperature: 0.1,
                                top_p: 1.0
                            },
                            {
                                headers: { 'Authorization': `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
                                timeout: 90000 // Increased to 90s for large model
                            }
                        );

                        const aiContent = nvResponse.data?.choices?.[0]?.message?.content || '';
                        const parsed = cleanAndParseJSON(aiContent);

                        if (parsed && parsed.name) {
                            devLog(`Tier 3 success (NVIDIA Kimi): ${parsed.name}`);
                            return res.json(parsed);
                        } else {
                            console.error('Tier 3 (NVIDIA Kimi) returned invalid JSON. Raw (first 200 chars):', aiContent.substring(0, 200));
                        }
                    } catch (nvError) {
                        console.error('Tier 3 (NVIDIA Kimi) failed:', nvError.response?.data || nvError.message);
                    }
                }
            }
        }

        // ============================================================
        // FALLBACK 2: Regex (when all AI is unavailable)
        // ============================================================
        devLog('All AI unavailable. Falling back to regex...');

        if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
            extractedText = await extractPdfTextRobust(buffer);
        } else if (mimetype === 'text/plain' || originalname.toLowerCase().endsWith('.txt')) {
            extractedText = buffer.toString('utf-8');
        } else {
            // Image OCR fallback
            try {
                const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
                extractedText = text;
            } catch (e) { extractedText = ''; }
        }

        if (!extractedText || extractedText.trim().length < 10) {
            return res.json(createEmptyResponse('Could not extract text. Please try a different file format.'));
        }

        // Regex sectional parsing with text normalization
        const normalizedText = extractedText
            .replace(/([a-z0-9._%+-])\s+(@)\s+([a-z0-9.-])/gi, '$1$2$3') // Fix broken emails
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n');
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const sectionsArr = { header: '' };
        const sectionHeaders = {
            experience: /experience|work history|employment/i,
            education: /education|academic|qualification/i,
            skills: /skills|technical skills|competencies|technologies/i,
            projects: /projects|academic projects/i,
            summary: /summary|profile|about me|objective/i
        };
        let activeSection = 'header';
        for (const line of lines) {
            let isH = false;
            for (const [key, regex] of Object.entries(sectionHeaders)) {
                if (regex.test(line) && line.length < 40) { activeSection = key; sectionsArr[activeSection] = ''; isH = true; break; }
            }
            if (!isH) sectionsArr[activeSection] = (sectionsArr[activeSection] || '') + line + '\n';
        }

        const emailMatch = normalizedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = normalizedText.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3,}[-\s.]?[0-9]{3,}[-\s.]?[0-9]{2,}/);
        const linkedinMatch = normalizedText.match(/linkedin\.com\/in\/[\w-]+/i);

        let parsedName = lines[0] || '';
        if (/[|,\t]|\s{3,}/.test(parsedName)) parsedName = parsedName.split(/[|,\t]|\s{3,}/)[0].trim();
        parsedName = parsedName.replace(/\b(Hyderabad|Mumbai|Bangalore|Delhi|India|Pune|Chennai|UK|USA)\b/gi, '').trim();

        return res.json({
            name: parsedName.substring(0, 50),
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            title: '',
            location: normalizedText.match(/(?:Hyderabad|New York|London|Bangalore|Pune|Delhi)[^|\n]*/i)?.[0] || '',
            linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
            summary: sectionsArr['summary']?.split('\n').slice(0, 3).join(' ').substring(0, 500) || '',
            experience: sectionsArr['experience'] ? [{ company: sectionsArr['experience'].split('\n')[0], title: '', duration: '', description: sectionsArr['experience'].substring(0, 1500) }] : [],
            degree: sectionsArr['education']?.match(/(?:B\.Tech|Bachelor|M\.Tech|Master|B\.S\.|M\.S\.)[\s\w]*/i)?.[0] || '',
            institution: sectionsArr['education']?.split('\n')[0] || '',
            gradYear: sectionsArr['education']?.match(/\d{4}/)?.[0] || '',
            cgpa: sectionsArr['education']?.match(/\d\.\d/)?.[0] || '',
            skills: sectionsArr['skills']?.replace(/\n/g, ', ').substring(0, 800) || '',
            projects: sectionsArr['projects']?.substring(0, 2000) || ''
        });

    } catch (error) {
        console.error('Resume upload failed:', error);
        return res.json(createEmptyResponse('An error occurred while processing your resume.'));
    }
});

// (Legacy /api/parse-resume endpoint removed — use /api/upload-resume instead)

// AI Chat for Resume Studio
app.post('/api/ai-chat', async (req, res) => {
    try {
        const { query, resumeContext, conversationHistory } = req.body;
        const safeQuery = sanitizeInput(query || '', 2000);
        const safeResumeCtx = sanitizeInput(typeof resumeContext === 'string' ? resumeContext : JSON.stringify(resumeContext || ''), 8000);

        if (!genAI || GEMINI_API_KEY.includes('your_gemini_api_key')) {
            // Simulated responses
            const responses = [
                "Try adding more quantifiable achievements to your experience section. For example, 'Increased efficiency by 30%'.",
                "Your skills section could benefit from industry-specific keywords. Consider adding: Agile, CI/CD, Cloud Computing.",
                "A strong professional summary should be 2-3 sentences highlighting your value proposition.",
                "For ATS compatibility, use standard section headings like 'Work Experience', 'Education', 'Skills'."
            ];
            return res.json({ message: responses[Math.floor(Math.random() * responses.length)] });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        
        // Build conversation context from history
        const historyContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
            ? '\n\nPrevious conversation:\n' + conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
            : '';
        
        const prompt = `
            You are a professional resume coach. The user is building their resume and has asked:
            "${safeQuery}"
            
            Here is their current resume data (JSON):
            ${safeResumeCtx}
            ${historyContext}
            
            Respond in STRICT JSON format:
            {
                "message": "Your helpful 2-3 sentence response here. Be specific and actionable.",
                "suggestion": null
            }
            
            IMPORTANT about the "suggestion" field:
            - If the user asks to CHANGE something specific (like summary, skills, experience), 
              set "suggestion" to an object with the field name(s) as keys and new values.
              Example: {"summary": "New improved summary text here"}
              Example: {"skills": "React, Node.js, Python, Docker"}
            - If the user is just asking a question or wants general advice, set "suggestion" to null.
            - Only include fields that should be changed.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Try to parse as JSON for structured response
        const parsed = cleanAndParseJSON(responseText);
        if (parsed && parsed.message) {
            res.json({ message: parsed.message, suggestion: parsed.suggestion || null });
        } else {
            res.json({ message: responseText.trim(), suggestion: null });
        }
    } catch (error) {
        console.error('AI Chat error:', error);
        res.status(500).json({ message: 'Sorry, I encountered an issue. Please try again.' });
    }
});

// Market Fit Analysis (Powered by NVIDIA Kimi K2.5 Large Context)
app.post('/api/analyze-market-fit', async (req, res) => {
    try {
        const { resumeContext, country } = req.body;
        const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
        const safeCountry = sanitizeInput(country || 'India', 100);
        const safeResumeCtx = typeof resumeContext === 'string'
            ? sanitizeInput(resumeContext, 10000)
            : resumeContext;

        if (!NVIDIA_API_KEY) {
            return res.json({
                message: "To unlock Deep Market Analysis, please add your NVIDIA API Key to the backend .env file.",
                analysis: null
            });
        }

        // 1. Fetch REAL market data from Serper (not simulated)
        let jobsContext = '';
        const searchTitle = (typeof resumeContext === 'object' ? resumeContext.title : '') || 'software engineer';
        const searchSkills = (typeof resumeContext === 'object' ? resumeContext.skills : '') || '';
        const searchQuery = `internship ${searchTitle} ${searchSkills.split(',').slice(0, 3).join(' ')}`.trim();

        if (SERPER_API_KEY && !SERPER_API_KEY.includes('your_serper_api_key')) {
            try {
                const glMap = { 'India': 'in', 'United States': 'us', 'United Kingdom': 'uk', 'Canada': 'ca', 'Australia': 'au', 'Germany': 'de' };
                const gl = glMap[safeCountry] || 'in';
                const response = await axios.post('https://google.serper.dev/search', {
                    q: `${searchQuery} internship ${safeCountry}`,
                    gl, hl: 'en', num: 5
                }, {
                    headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
                    timeout: 10000
                });
                const results = response.data.organic || [];
                jobsContext = results.map((r, i) =>
                    `Job ${i + 1}: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet || 'N/A'}`
                ).join('\n\n');
            } catch (serperErr) {
                console.warn('Serper fetch for market analysis failed:', serperErr.message);
            }
        }

        if (!jobsContext) {
            jobsContext = 'No live job data available. Provide general market advice based on the resume.';
        }

        devLog('Sending Deep Analysis request to NVIDIA Kimi K2.5...');

        // 2. Send to Kimi 
        const response = await axios.post(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
                model: 'moonshotai/kimi-k2.5',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert Career Strategist. Analyze market fit based on real job listings. Be concise and actionable.'
                    },
                    {
                        role: 'user',
                        content: `Analyze this resume against these REAL job listings found online.
                        
                        RESUME:
                        ${JSON.stringify(safeResumeCtx).substring(0, 3000)}

                        LIVE JOB LISTINGS:
                        ${jobsContext}

                        Provide a strategic report in Markdown.
                        Structure:
                        ### 🎯 Market Fit Score: [Score]/100
                        
                        ### 🚨 Critical Skill Gaps
                        - [Skill 1]
                        - [Skill 2]
                        
                        ### 💰 Estimated Market Value
                        [Salary Range based on listings]
                        
                        ### 🚀 Strategic Advice
                        [2-3 actionable sentences]`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.2
            },
            {
                headers: { 'Authorization': `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
                timeout: 120000
            }
        );

        const analysis = response.data?.choices?.[0]?.message?.content;
        res.json({ message: analysis });

    } catch (error) {
        console.error('Market Fit Analysis failed:', error.response?.data || error.message);
        res.status(500).json({ message: "Failed to analyze market fit. Kimi is busy." });
    }
});

// AI Resume Tailoring
app.post('/api/tailor-resume', async (req, res) => {
    try {
        const { resumeData, jobDescription, jobTitle, jobCompany } = req.body;

        if (!resumeData || !jobDescription) {
            return res.status(400).json({ error: 'Resume data and job description are required.' });
        }

        const safeJD = sanitizeInput(jobDescription, 8000);
        const safeTitle = sanitizeInput(jobTitle || '', 200);
        const safeCompany = sanitizeInput(jobCompany || '', 200);

        const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        devLog('Tailoring resume...');

        // Primary: Gemini 2.0 Flash (Fast & Free-tier friendly)
        // Check if genAI is initialized and key is valid (not placeholder)
        if (genAI && GEMINI_API_KEY && !GEMINI_API_KEY.includes('your_gemini_api_key')) {
            try {
                devLog('Using Gemini 2.0 Flash for tailoring...');
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                const prompt = `
                    You are an expert Resume Strategist.
                    Tailor this resume for the following Job Description (JD).
                    
                    TARGET ROLE: ${safeTitle || 'Not specified'}
                    TARGET COMPANY: ${safeCompany || 'Not specified'}
                    
                    RESUME (JSON):
                    ${JSON.stringify(resumeData).substring(0, 6000)}

                    JOB DESCRIPTION:
                    ${safeJD}

                    INSTRUCTIONS:
                    1. Analyze the JD for keywords and required skills.
                    2. Rewrite the 'summary', 'experience' (description bullets), and 'skills' to align with the JD.
                    3. Do NOT invent false information. Only rephrase existing experience to highlight relevance.
                    4. Return the COMPLETE tailored resume as valid JSON.
                    
                    Output strictly JSON.
                `;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const cleaned = cleanAndParseJSON(responseText);

                if (cleaned) {
                    // Validate response has required resume fields
                    if (typeof cleaned === 'object' && (cleaned.name || cleaned.summary || cleaned.skills)) {
                        devLog('Tailoring success (Gemini)');
                        return res.json({ tailoredData: cleaned });
                    }
                    console.warn('AI returned JSON but missing resume fields');
                }
            } catch (geminiError) {
                console.error('Gemini tailoring failed:', geminiError.message);
                // Fallback to Kimi will happen below if this fails
            }
        }

        // Tier 2: NVIDIA Kimi (Fallback)
        if (NVIDIA_API_KEY) {
            try {
                devLog('Fallback: Using Kimi for tailoring...');
                const nvResponse = await axios.post(
                    'https://integrate.api.nvidia.com/v1/chat/completions',
                    {
                        model: 'moonshotai/kimi-k2.5',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert Resume Strategist. Output ONLY valid JSON.'
                            },
                            {
                                role: 'user',
                                content: `Tailor this resume to the JD. Return JSON.
                                
                                RESUME: ${JSON.stringify(resumeData).substring(0, 5000)}
                                JD: ${safeJD.substring(0, 5000)}`
                            }
                        ],
                        max_tokens: 4000,
                        temperature: 0.2
                    },
                    {
                        headers: { 'Authorization': `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
                        timeout: 60000
                    }
                );

                const aiContent = nvResponse.data?.choices?.[0]?.message?.content || '';
                const parsed = cleanAndParseJSON(aiContent);

                if (parsed) {
                    if (typeof parsed === 'object' && (parsed.name || parsed.summary || parsed.skills)) {
                        devLog('Tailoring success (Kimi)');
                        return res.json({ tailoredData: parsed });
                    }
                    console.warn('Kimi returned JSON but missing resume fields');
                }
            } catch (nvError) {
                console.error('Kimi tailoring failed:', nvError.message);
            }
        }

        // No AI keys configured — return original data with a warning
        console.warn('No AI keys configured for tailoring. Returning original resume data.');
        return res.json({
            tailoredData: resumeData,
            warning: 'No AI API keys configured. Your original resume was returned unchanged. Add GEMINI_API_KEY or NVIDIA_API_KEY to .env to enable AI tailoring.'
        });

    } catch (error) {
        console.error('Tailor Resume Error:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../internship-sniper-frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // Express 5 catch-all route syntax
    app.get('{*any}', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendDist, 'index.html'));
        }
    });
}

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
