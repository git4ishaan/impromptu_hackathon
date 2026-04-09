-- If is_private already exists, this just silently fails if we don't have it, 
-- but a simpler hackathon approach is to catch errors or just recreate the table.
-- Since is_private ALREADY exists, we skip it entirely.

-- Drop the table and policies so we start fresh without errors
DROP TABLE IF EXISTS session_members CASCADE;

CREATE TABLE session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'kicked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by all" ON session_members FOR SELECT USING (true);

-- Allow users to request to join (insert 'pending' status)
CREATE POLICY "Users can request to join" ON session_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow Host to update status (approve/kick)
CREATE POLICY "Host can update membership" ON session_members FOR UPDATE USING (
  auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id)
);

CREATE POLICY "Users can delete their own membership or Host can delete" ON session_members FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM sessions WHERE id = session_id)
);

-- Enable Realtime for session_members (This safely ignores if already added)
-- ALTER PUBLICATION supabase_realtime ADD TABLE session_members;
