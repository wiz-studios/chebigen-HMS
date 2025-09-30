-- Test script to manually insert a prescription
-- This will help identify if the issue is with the table structure or RLS policies

-- First, get a patient ID to test with
-- Replace this with an actual patient ID from your database
DO $$
DECLARE
    test_patient_id UUID;
    test_user_id UUID;
    insert_result UUID;
BEGIN
    -- Get the first available patient
    SELECT id INTO test_patient_id FROM patients LIMIT 1;
    
    -- Get the current user ID
    test_user_id := auth.uid();
    
    -- Check if we have the required data
    IF test_patient_id IS NULL THEN
        RAISE NOTICE 'No patients found in database';
        RETURN;
    END IF;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with patient ID: %', test_patient_id;
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Try to insert a test prescription
    BEGIN
        INSERT INTO prescriptions (
            patient_id,
            provider_id,
            medication_name,
            dose,
            frequency,
            duration,
            instructions,
            status
        ) VALUES (
            test_patient_id,
            test_user_id,
            'Test Medication',
            '10mg',
            'twice_daily',
            '7 days',
            'Test instructions',
            'active'
        ) RETURNING id INTO insert_result;
        
        RAISE NOTICE 'SUCCESS: Prescription inserted with ID: %', insert_result;
        
        -- Clean up the test record
        DELETE FROM prescriptions WHERE id = insert_result;
        RAISE NOTICE 'Test record cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
    END;
    
END $$;
