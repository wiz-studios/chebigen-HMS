-- Fix RLS policies to allow doctors to view patients for appointment scheduling
-- This addresses the issue where doctors can't see patients in the dropdown

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL existing patient policies to avoid conflicts
DROP POLICY IF EXISTS "Clinical staff can manage patients" ON patients;
DROP POLICY IF EXISTS "Clinical staff can view patients" ON patients;
DROP POLICY IF EXISTS "SuperAdmin can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON patients;
DROP POLICY IF EXISTS "Accountant can view patient billing info" ON patients;

-- Create a new policy that allows doctors, nurses, receptionists, and superadmins to view patients
CREATE POLICY "Clinical staff can view patients" ON patients FOR SELECT
  USING (get_user_role(auth.uid()) IN ('doctor', 'nurse', 'receptionist', 'superadmin'));

-- Create a separate policy for managing patients (creating, updating, deleting)
CREATE POLICY "Clinical staff can manage patients" ON patients FOR ALL
  USING (get_user_role(auth.uid()) IN ('nurse', 'receptionist', 'superadmin'));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
