-- Fix RLS policies for appointment updates
-- This addresses the 400 error when trying to update appointment status

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL existing appointment policies to avoid conflicts
DROP POLICY IF EXISTS "SuperAdmin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view relevant appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON appointments;
DROP POLICY IF EXISTS "Clinical staff can view appointments" ON appointments;

-- Create comprehensive appointment policies
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

-- Allow receptionists and superadmins to create appointments
CREATE POLICY "Staff can create appointments" ON appointments FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('receptionist', 'superadmin')
  );

-- Allow only the assigned doctor and superadmins to update appointments
CREATE POLICY "Providers can update their appointments" ON appointments FOR UPDATE
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) = 'superadmin'
  );

-- Allow receptionists and superadmins to delete appointments
CREATE POLICY "Staff can delete appointments" ON appointments FOR DELETE
  USING (
    get_user_role(auth.uid()) IN ('receptionist', 'superadmin')
  );

-- Fix audit_logs policies to ensure they work
DROP POLICY IF EXISTS "SuperAdmin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Create audit log policies
CREATE POLICY "SuperAdmin can view all audit logs" ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Users can view their own audit logs" ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true); -- Allow system to log all actions

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on both tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
