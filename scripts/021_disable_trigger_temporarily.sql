-- Temporarily disable the handle_new_user trigger
-- This allows the setup page to handle user creation manually

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Ensure RLS policies allow user creation
-- Drop all existing policies
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users to view users" ON users;

-- Create minimal policies that definitely work
-- Allow anyone to insert users (for registration)
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- Allow all authenticated users to view users (temporary)
CREATE POLICY "Allow all authenticated users to view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant all necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
