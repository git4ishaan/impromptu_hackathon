-- ====================================================================
-- StudySpot MIT-WPU Master Database Schema
-- Includes Profiles, Sessions, Tasks, Session Members, RLS Policies, Indexes, and Realtime
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  location_name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_private BOOLEAN DEFAULT false,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions are viewable by everyone." ON sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions." ON sessions;
DROP POLICY IF EXISTS "Host can delete their session" ON sessions;
DROP POLICY IF EXISTS "Host can update their session" ON sessions;

CREATE POLICY "Sessions are viewable by everyone." ON sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions." ON sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can delete their session" ON sessions FOR DELETE USING (auth.uid() = host_id);
CREATE POLICY "Host can update their session" ON sessions FOR UPDATE USING (auth.uid() = host_id);

-- 3. Session Members Table
CREATE TABLE IF NOT EXISTS session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'kicked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members viewable by all" ON session_members;
DROP POLICY IF EXISTS "Users can request to join" ON session_members;
DROP POLICY IF EXISTS "Host can update membership" ON session_members;
DROP POLICY IF EXISTS "Users can delete their own membership or Host can delete" ON session_members;

CREATE POLICY "Members viewable by all" ON session_members FOR SELECT USING (true);
CREATE POLICY "Users can request to join" ON session_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Host can update membership" ON session_members FOR UPDATE USING (
  auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id)
);
CREATE POLICY "Users can delete their own membership or Host can delete" ON session_members FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id)
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  task_content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks are viewable by everyone." ON tasks;
DROP POLICY IF EXISTS "Session members and host can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Session members and host can update tasks" ON tasks;
DROP POLICY IF EXISTS "Session members and host can delete tasks" ON tasks;

CREATE POLICY "Tasks are viewable by everyone." ON tasks FOR SELECT USING (true);
CREATE POLICY "Session members and host can insert tasks" ON tasks FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id) OR
  auth.uid() IN (SELECT user_id FROM session_members WHERE session_id = tasks.session_id AND status = 'approved')
);
CREATE POLICY "Session members and host can update tasks" ON tasks FOR UPDATE USING (
  auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id) OR
  auth.uid() IN (SELECT user_id FROM session_members WHERE session_id = tasks.session_id AND status = 'approved')
);
CREATE POLICY "Session members and host can delete tasks" ON tasks FOR DELETE USING (
  auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id) OR
  auth.uid() IN (SELECT user_id FROM session_members WHERE session_id = tasks.session_id AND status = 'approved')
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_members_session_id ON session_members(session_id);
CREATE INDEX IF NOT EXISTS idx_session_members_user_id ON session_members(user_id);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE session_members;
