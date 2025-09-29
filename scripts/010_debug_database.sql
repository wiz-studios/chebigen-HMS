-- Debug script to check database setup and permissions

-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'patients', 'appointments', 'notifications');

-- Check RLS status on users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check if policies exist on users table
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'users';

-- Check if auth.uid() function is available
SELECT auth.uid();

-- Check current user count (should be 0 for new database)
SELECT COUNT(*) as user_count FROM users;

-- Check if we can query users table (tests RLS policies)
SELECT COUNT(*) as accessible_users FROM users;
