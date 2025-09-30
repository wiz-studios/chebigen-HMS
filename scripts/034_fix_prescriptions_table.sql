-- Fix prescriptions table to match frontend expectations
-- This addresses the "Create New Prescription" button submit issue

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS prescribed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS dosage TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS refills INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prescribed_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to use provider_id as prescribed_by
UPDATE prescriptions 
SET prescribed_by = provider_id 
WHERE prescribed_by IS NULL;

-- Make prescribed_by NOT NULL after updating existing records
ALTER TABLE prescriptions ALTER COLUMN prescribed_by SET NOT NULL;

-- Update dose column to dosage if it exists
UPDATE prescriptions 
SET dosage = dose 
WHERE dosage IS NULL AND dose IS NOT NULL;

-- Drop old dose column if it exists and is different from dosage
-- (We'll keep both for now to avoid data loss)

-- Update status constraint to match frontend expectations
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check 
  CHECK (status IN ('active', 'completed', 'cancelled', 'expired'));

-- Drop existing prescription policies to avoid conflicts
DROP POLICY IF EXISTS "SuperAdmin can view all prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Clinical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Providers can manage prescriptions" ON prescriptions;

-- Create comprehensive prescription policies
CREATE POLICY "SuperAdmin can view all prescriptions" ON prescriptions FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Patients can view their prescriptions" ON prescriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view prescriptions" ON prescriptions FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'pharmacist', 'receptionist')
  );

CREATE POLICY "Providers can manage prescriptions" ON prescriptions FOR ALL
  USING (
    prescribed_by = auth.uid() OR 
    provider_id = auth.uid() OR
    get_user_role(auth.uid()) IN ('doctor', 'pharmacist', 'superadmin')
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON prescriptions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on prescriptions table
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Test query to verify the setup works
SELECT COUNT(*) as accessible_prescriptions FROM prescriptions;
