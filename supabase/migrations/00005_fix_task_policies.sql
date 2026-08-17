-- Migration 00005: Restrict task modifications to approved session members & hosts

DROP POLICY IF EXISTS "Authenticated users can insert tasks." ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks." ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks." ON tasks;

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
