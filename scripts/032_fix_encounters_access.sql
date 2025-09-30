-- Fix encounters table access and ensure proper RLS policies
-- This addresses the "Failed to load encounters" error

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing encounter policies to avoid conflicts
DROP POLICY IF EXISTS "SuperAdmin can view all encounters" ON encounters;
DROP POLICY IF EXISTS "Patients can view their encounters" ON encounters;
DROP POLICY IF EXISTS "Clinical staff can view encounters" ON encounters;
DROP POLICY IF EXISTS "Providers can manage encounters" ON encounters;

-- Create comprehensive encounter policies
-- Allow superadmins to view all encounters
CREATE POLICY "SuperAdmin can view all encounters" ON encounters FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin');

-- Allow patients to view their own encounters
CREATE POLICY "Patients can view their encounters" ON encounters FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = encounters.patient_id AND patients.user_id = auth.uid())
  );

-- Allow clinical staff to view encounters
CREATE POLICY "Clinical staff can view encounters" ON encounters FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech', 'receptionist')
  );

-- Allow providers to manage their encounters
CREATE POLICY "Providers can manage encounters" ON encounters FOR ALL
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'superadmin')
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON encounters TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on encounters table
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

-- Test query to verify the setup works
-- This should return the count of encounters accessible to the current user
SELECT COUNT(*) as accessible_encounters FROM encounters;
