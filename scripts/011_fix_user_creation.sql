-- Fix RLS policies to allow user creation through UI

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create new policies that allow proper user registration
-- Allow anyone to insert (for user registration)
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- SuperAdmin can view all users
CREATE POLICY "SuperAdmin can view all users" ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- SuperAdmin can manage all users
CREATE POLICY "SuperAdmin can manage all users" ON users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Staff can view basic user info (for patient lookup, etc.)
CREATE POLICY "Staff can view basic user info" ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'accountant')
  )
  AND role != 'superadmin'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a function to check if user is superadmin (for future use)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'superadmin' 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;
