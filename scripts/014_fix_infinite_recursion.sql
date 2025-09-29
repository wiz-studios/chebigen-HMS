-- Fix infinite recursion in RLS policies for users table
-- The issue is that policies are querying the users table from within users table policies

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Drop the problematic helper function that causes recursion
DROP FUNCTION IF EXISTS is_superadmin();
DROP FUNCTION IF EXISTS get_user_role(UUID);

-- Create simple, non-recursive policies
-- Allow anyone to insert (for user registration)
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- For now, allow all authenticated users to view users (we'll restrict this later)
-- This prevents the recursion issue
CREATE POLICY "Authenticated users can view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a simple helper function that doesn't cause recursion
CREATE OR REPLACE FUNCTION get_user_role_simple()
RETURNS TEXT AS $$
BEGIN
  -- This function will be used by the application, not by RLS policies
  RETURN (
    SELECT role 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_role_simple() TO authenticated;
