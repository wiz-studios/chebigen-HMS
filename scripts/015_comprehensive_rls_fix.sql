-- Comprehensive fix for RLS policies to prevent infinite recursion
-- This script creates a more secure and non-recursive policy structure

-- First, let's create a function that safely gets user role without causing recursion
CREATE OR REPLACE FUNCTION get_user_role_safe()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use a direct query that won't trigger RLS recursion
  SELECT role INTO user_role
  FROM users 
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if current user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role_safe() = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_role_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION is_superadmin_safe() TO authenticated;

-- Now create proper RLS policies that don't cause recursion
-- Drop all existing policies
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Create new policies that are safe and non-recursive
-- Allow user registration (anyone can create a user account)
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- SuperAdmin can view all users (using the safe function)
CREATE POLICY "SuperAdmin can view all users" ON users FOR SELECT
USING (is_superadmin_safe());

-- SuperAdmin can manage all users
CREATE POLICY "SuperAdmin can manage all users" ON users FOR ALL
USING (is_superadmin_safe());

-- Staff can view basic user info (for patient lookup, etc.)
-- This policy is more restrictive and only shows non-superadmin users
CREATE POLICY "Staff can view basic user info" ON users FOR SELECT
USING (
  get_user_role_safe() IN ('doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'accountant')
  AND role != 'superadmin'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
