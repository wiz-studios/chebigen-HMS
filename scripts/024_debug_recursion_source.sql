-- Debug script to find the source of infinite recursion
-- This will help identify what's still causing the issue

-- Check if RLS is enabled on any tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Check all existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check all functions that might be causing issues
SELECT 
    routine_name, 
    routine_type, 
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- Check all triggers
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement,
    trigger_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Check if there are any views that might be causing issues
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'VIEW'
ORDER BY table_name;

-- Test if we can query the users table directly
SELECT COUNT(*) as user_count FROM users;

-- Test if we can insert into users table (this should work if RLS is properly disabled)
DO $$
DECLARE
    test_id UUID;
BEGIN
    test_id := gen_random_uuid();
    
    -- Try to insert a test user
    INSERT INTO users (id, full_name, email, password_hash, role, status) 
    VALUES (test_id, 'Debug Test User', 'debug@example.com', '', 'patient', 'active');
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    
    RAISE NOTICE 'Direct insert into users table works - RLS is properly disabled';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Direct insert failed: %', SQLERRM;
END $$;
