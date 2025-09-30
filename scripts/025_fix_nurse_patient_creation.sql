-- Fix RLS policies to allow nurses to create patients
-- This addresses the 400 error when nurses try to register patients

-- First, create the helper function
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Receptionist can manage patients" ON patients;

-- Create a new policy that allows nurses, receptionists, and superadmins to manage patients
CREATE POLICY "Clinical staff can manage patients" ON patients FOR ALL
  USING (get_user_role(auth.uid()) IN ('nurse', 'receptionist', 'superadmin'));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
