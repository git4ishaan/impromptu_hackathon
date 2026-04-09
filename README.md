# StudySpot MIT-WPU 🎓

**Real-time coordination hub for student study sessions at MIT-WPU campus.**

StudySpot solves the problem of finding active, focused study clusters on a crowded campus. It allows students to discover subject-specific prep groups, coordinate seating on library floor plans, and collaborate in real-time.

## 🚀 Key Features
- **Live Session Feed**: Real-time discovery of subject-specific prep groups.
- **Interactive Seat Mapper**: Visual blueprint overlay showing exactly where groups are sitting.
- **AI Study Tutor**: Integrated Groq (Llama 3.1) for roadmaps, explanations, and exam prep.
- **Live Workspaces**: Shared task lists, host moderation, and people tracking.
- **Resource Stash**: Shared file library with auto-AI scanning for PDFs, Word docs, and text.
- **Access Control**: Public and Private sessions with host approval/moderation logic.

## 🛠️ Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS V4
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **LLM**: Groq (Llama 3.1 8B Instant)

## 🎯 Getting Started
1. **Clone & Install:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Create a `.env.local` file with:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_RANDOM_HACK_KEY=your_groq_api_key
   ```
3. **Database Setup:**
   Run the migration scripts in `supabase/migrations/` in your Supabase SQL Editor.
4. **Run Locally:**
   ```bash
   npm run dev
   ```

---
Built for the MIT-WPU Hackathon. Innovation for campus navigability.
