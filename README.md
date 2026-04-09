# StudySpot MIT-WPU

Real-time campus coordination hub for students. Built for the MIT-WPU Hackathon.

## Features
- **Real-time Session Feed**: See who is studying what and where.
- **SeatMapper**: Interactive library blueprint with pinned session locations.
- **Live Workspaces**: Shared task lists, host moderation, and people tracking.
- **AI Study Tutor**: Integrated Groq (Llama 3.1) for roadmaps, explanations, and exam prep.
- **Resource Stash**: Shared file library with auto-AI scanning for PDFs, Word docs, and text.
- **Access Control**: Public and Private sessions with host approval logic.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **LLM**: Groq (Llama 3.1 8B Instant)

## Getting Started
1. Clone the repo
2. `npm install`
3. Create `.env.local` with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RANDOM_HACK_KEY` (Groq API Key)
4. `npm run dev`
