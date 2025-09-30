-- Fix RLS policies and database issues for appointment creation
-- This addresses the 400 error when receptionists try to create appointments

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing appointment policies
DROP POLICY IF EXISTS "SuperAdmin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view relevant appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their appointments" ON appointments;

-- Create new appointment policies that work with the current schema
-- Allow superadmins to view all appointments
CREATE POLICY "SuperAdmin can view all appointments" ON appointments FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin');

-- Allow patients to view their own appointments
CREATE POLICY "Patients can view their appointments" ON appointments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
  );

-- Allow clinical staff to view appointments
CREATE POLICY "Clinical staff can view appointments" ON appointments FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'receptionist', 'lab_tech')
  );

-- Allow receptionists, superadmins, and providers to manage appointments
CREATE POLICY "Staff can manage appointments" ON appointments FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('receptionist', 'superadmin') OR
    provider_id = auth.uid()
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
