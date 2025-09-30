-- Diagnostic script to identify prescription creation issues
-- Run this to check table structure, RLS policies, and permissions

-- 1. Check if prescriptions table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prescriptions' 
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'prescriptions';

-- 3. Check existing RLS policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'prescriptions';

-- 4. Check if the helper function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_role';

-- 5. Test basic access (this should work if RLS is properly configured)
SELECT COUNT(*) as prescription_count FROM prescriptions;

-- 6. Check current user and role
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM users WHERE id = auth.uid()) as current_user_role;

-- 7. Check if there are any patients to test with
SELECT id, first_name, last_name, mrn 
FROM patients 
LIMIT 5;

-- 8. Check prescriptions table constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'prescriptions'::regclass;
