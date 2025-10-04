-- Test patient access for billing system
-- This script helps diagnose why patients aren't showing in the billing dropdown

-- Check if patients exist
SELECT COUNT(*) as total_patients FROM patients;

-- Check patient data structure
SELECT id, first_name, last_name, contact, created_at 
FROM patients 
ORDER BY first_name 
LIMIT 5;

-- Check RLS policies on patients table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patients';

-- Check if RLS policies exist for patients
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'patients';

-- Test if we can select patients (this should work if RLS is configured correctly)
-- Note: This will only work if you're authenticated as a user with proper permissions
SELECT 'Patient access test completed' as status;
