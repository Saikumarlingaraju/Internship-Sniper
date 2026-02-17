# Internship Sniper 🎯

AI-powered internship discovery and resume tailoring platform. Upload your resume, discover matching internships across the web, tailor your resume for each opportunity, edit in a live studio, and download an ATS-ready PDF.

## Core Flow

1. **Upload Resume** — Drag-and-drop your PDF. Multi-tier AI parsing extracts structured data (Gemini Vision → DigitalOcean Qwen3 → NVIDIA Kimi K2.5 → regex fallback).
2. **Select Interests** — Pick from 8 predefined categories or add custom interests.
3. **Discover Internships** — The app searches the web via Serper.dev (Google dorking) and returns matching job listings.
4. **Tailor Resume** — Click "Tailor" on any listing. The app auto-analyzes your resume vs. the job description and suggests improvements.
5. **Open in Studio** — Edit your resume in a three-panel Resume Studio (Form Editor + AI Chat + Live Preview) or use Job Tailoring for side-by-side tailoring.
6. **Download PDF** — Export the tailored resume as an ATS-friendly text-based PDF via jsPDF.

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Backend  | Node.js, Express, Multer, pdfjs-dist, canvas, Tesseract.js |
| Frontend | React 19, Vite 7, Tailwind CSS 3, Framer Motion, Lucide React |
| AI       | Google Gemini, Serper.dev, NVIDIA NIM (Kimi K2.5), DigitalOcean AI (Qwen3) |

## Requirements

- Node.js 18+
- API keys for: Gemini, Serper.dev, NVIDIA NIM, DigitalOcean AI

## Setup

### 1. Environment Variables

Create a `.env` file in the **project root** (`d:\Internship-sniper\.env`):

```text
GEMINI_API_KEY=your_gemini_key
SERPER_API_KEY=your_serper_key
NVIDIA_API_KEY=your_nvidia_key
DO_API_KEY=your_digitalocean_key
```

### 2. Backend

```bash
cd internship-sniper-backend
npm install
npm start
```

Backend runs at **http://localhost:5000**

### 3. Frontend

```bash
cd internship-sniper-frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### VS Code Tasks

Open the Command Palette → `Tasks: Run Task` → choose:
- **Backend: Start Server** — launches the Express server
- **Frontend: Start Dev Server** — launches Vite dev server
- **Run Both: Backend & Frontend** — starts both simultaneously

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload-resume` | Upload PDF, extract structured resume data |
| GET | `/api/jobs?q=...` | Search internships via Serper.dev |
| POST | `/api/analyze-fit` | Analyze resume-vs-job fit (Gemini) |
| POST | `/api/tailor-resume` | AI-tailor resume to job description |
| POST | `/api/generate-cover-letter` | Generate cover letter for a job |
| POST | `/api/ats-audit` | ATS compatibility audit |
| POST | `/api/ai-chat` | AI chat assistant for resume edits |
| POST | `/api/analyze-market-fit` | Market analysis for a role (NVIDIA Kimi) |

## Project Structure

```
internship-sniper-backend/    Express API server
internship-sniper-frontend/   React + Vite frontend
  src/components/
    Header.jsx                 Top navigation
    Sidebar.jsx                Section navigation
    ResumeUpload.jsx           PDF upload with drag-and-drop
    InterestSelector.jsx       Interest category picker
    JobFeed.jsx                Job listings with search & filter
    ResumeTailor.jsx           Full-screen resume-vs-job analysis overlay
    ResumeStudio.jsx           Three-panel Resume Studio
    studio/
      ResumeFormPanel.jsx      Accordion-style resume editor
      AIChatPanel.jsx          AI chat assistant
      ResumePreviewPanel.jsx   Live HTML resume preview + PDF export
      ResumeTailor.jsx         Job Tailoring (side-by-side tailoring)
.env                           API keys (not committed)
.vscode/tasks.json             VS Code run tasks
```
