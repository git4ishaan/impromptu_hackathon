# StudySpot MIT-WPU 🎓

Real-time coordination hub for student study sessions at MIT-WPU campus.

## 🚀 Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** TailwindCSS V4 + Lucide React
- **Backend:** Supabase (Auth, Postgres, Realtime)
- **Deployment:** Vercel

## 🛠️ Setup Instructions
1. **Clone & Install:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Create a `.env.local` file with:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
3. **Database:**
   Paste the SQL schema from `supabase/migrations/00001_initial_schema.sql` into the Supabase SQL Editor.
4. **Run Locally:**
   ```bash
   npm run dev
   ```

## 🎯 Project Vision (Theme 2: Next-Gen Platforms)
StudySpot solves the problem of finding active, focused study clusters on a crowded campus. It features:
- **Live Session Feed:** Real-time discovery of subject-specific prep groups.
- **Interactive Seat Mapper:** Pinpoint your exact seat on campus blueprints.
- **Shared Workspace:** Collaborative checklists that sync across all participants.

---
Built for the MIT-WPU Hackathon.
