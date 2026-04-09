-- Add duration field to sessions table
ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60;
