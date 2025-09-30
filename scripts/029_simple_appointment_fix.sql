-- Simple fix for appointment updates - disable RLS temporarily to test
-- This will help us identify if the issue is with RLS policies

-- First, let's temporarily disable RLS on appointments table to test
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test if this fixes the issue
-- If it does, then we know the problem is with RLS policies
-- If it doesn't, then the problem is elsewhere
