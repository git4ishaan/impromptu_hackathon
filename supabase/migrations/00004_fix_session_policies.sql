-- Allow host to delete their own session
CREATE POLICY "Host can delete their session" ON sessions FOR DELETE USING (auth.uid() = host_id);

-- Allow host to update their own session
CREATE POLICY "Host can update their session" ON sessions FOR UPDATE USING (auth.uid() = host_id);
