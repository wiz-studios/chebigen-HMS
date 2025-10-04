-- FIX PATIENT ACCESS FOR ALL AUTHORIZED USERS
-- This script allows all authorized users to view patient data
-- This will fix the MRN display issue in billing

-- Drop existing patient policies
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;

-- Create comprehensive patient select policy
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins can see all patients
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'admin'
            ) OR
            -- Receptionists can see all patients
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'receptionist'
            ) OR
            -- Doctors can see all patients
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'doctor'
            ) OR
            -- Nurses can see all patients
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'nurse'
            ) OR
            -- Accountants can see all patients (for billing purposes)
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'accountant'
            ) OR
            -- Lab technicians can see all patients (for lab results)
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'lab_technician'
            ) OR
            -- Pharmacists can see all patients (for medication management)
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'pharmacist'
            ) OR
            -- Patients can see their own data
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'patient'
                ) AND user_id = auth.uid()
            )
        )
    );

-- Create patient insert policy (only admins and receptionists can create patients)
CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'receptionist')
            )
        )
    );

-- Create patient update policy (only admins and receptionists can update patients)
CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'receptionist')
            ) OR
            -- Patients can update their own data
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'patient'
                ) AND user_id = auth.uid()
            )
        )
    );

-- Success message
SELECT '🎉 PATIENT ACCESS FIXED FOR ALL USERS! 🎉' as status;
SELECT '✅ Admins can view all patients' as admin_access;
SELECT '✅ Receptionists can view all patients' as receptionist_access;
SELECT '✅ Doctors can view all patients' as doctor_access;
SELECT '✅ Nurses can view all patients' as nurse_access;
SELECT '✅ Accountants can view all patients' as accountant_access;
SELECT '✅ Lab Technicians can view all patients' as lab_tech_access;
SELECT '✅ Pharmacists can view all patients' as pharmacist_access;
SELECT '✅ Patients can view their own data' as patient_access;
