-- Emergency fix for infinite recursion in RLS policies
-- This is the simplest fix that will immediately resolve the issue

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Drop problematic functions
DROP FUNCTION IF EXISTS is_superadmin();
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS is_superadmin_safe();
DROP FUNCTION IF EXISTS get_user_role_safe();
DROP FUNCTION IF EXISTS get_user_role_simple();

-- Create the most basic policies that won't cause recursion
-- Allow user registration
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record  
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- Temporarily allow all authenticated users to view users
-- This prevents recursion and allows the system to work
-- We can make this more restrictive later once the system is working
CREATE POLICY "Allow authenticated users to view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
