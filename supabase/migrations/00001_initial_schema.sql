-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  location_name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  host_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions are viewable by everyone." ON sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions." ON sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  task_content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are viewable by everyone." ON tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tasks." ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tasks." ON tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tasks." ON tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
