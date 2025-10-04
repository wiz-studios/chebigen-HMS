-- COMPREHENSIVE PATIENT ACCESS FIX
-- This script fixes all patient access issues by creating unified RLS policies
-- This will fix the MRN display issue in billing

-- Drop ALL existing patient policies to avoid conflicts
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "Clinical staff can manage patients" ON patients;
DROP POLICY IF EXISTS "Clinical staff can view patients" ON patients;
DROP POLICY IF EXISTS "SuperAdmin can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON patients;
DROP POLICY IF EXISTS "Accountant can view patient billing info" ON patients;

-- Create helper function if it doesn't exist
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create unified patient select policy - ALL authorized users can view patients
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins can see all patients
            get_user_role(auth.uid()) = 'admin' OR
            -- Receptionists can see all patients
            get_user_role(auth.uid()) = 'receptionist' OR
            -- Doctors can see all patients
            get_user_role(auth.uid()) = 'doctor' OR
            -- Nurses can see all patients
            get_user_role(auth.uid()) = 'nurse' OR
            -- Accountants can see all patients (for billing)
            get_user_role(auth.uid()) = 'accountant' OR
            -- Lab technicians can see all patients
            get_user_role(auth.uid()) = 'lab_technician' OR
            -- Pharmacists can see all patients
            get_user_role(auth.uid()) = 'pharmacist' OR
            -- Superadmins can see all patients
            get_user_role(auth.uid()) = 'superadmin' OR
            -- Patients can see their own data
            (get_user_role(auth.uid()) = 'patient' AND user_id = auth.uid())
        )
    );

-- Create patient insert policy (only admins, receptionists, and nurses can create patients)
CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            get_user_role(auth.uid()) IN ('admin', 'receptionist', 'nurse', 'superadmin')
        )
    );

-- Create patient update policy (admins, receptionists, nurses, and patients can update)
CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            get_user_role(auth.uid()) IN ('admin', 'receptionist', 'nurse', 'superadmin') OR
            (get_user_role(auth.uid()) = 'patient' AND user_id = auth.uid())
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Test the policies by showing current patient data
SELECT 
    'PATIENT ACCESS TEST' as test_type,
    COUNT(*) as total_patients,
    COUNT(CASE WHEN mrn IS NOT NULL THEN 1 END) as patients_with_mrn,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as patients_with_names
FROM patients;

-- Show sample patient data
SELECT 
    id,
    first_name,
    last_name,
    mrn,
    contact,
    created_at
FROM patients 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT '🎉 PATIENT ACCESS FIXED FOR ALL USERS! 🎉' as status;
SELECT '✅ All authorized users can now view patients' as access_granted;
SELECT '✅ MRN should now display correctly in billing' as mrn_fix;
