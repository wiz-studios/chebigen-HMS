-- Complete Hospital Management System Database Setup
-- Run this script to set up the entire database from scratch

-- Step 1: Clean up any existing policies and functions
\i scripts/000_cleanup_existing_policies.sql

-- Step 2: Create core database schema
\i scripts/001_create_database_schema.sql

-- Step 3: Enable Row Level Security policies
\i scripts/002_enable_rls_policies.sql

-- Step 4: Create utility functions and triggers
\i scripts/003_create_functions.sql

-- Step 5: Create inventory management schema
\i scripts/004_create_inventory_schema.sql

-- Step 6: Enable inventory RLS policies
\i scripts/005_inventory_rls_policies.sql

-- Step 7: Create notifications system
\i scripts/006_create_notifications_schema.sql

-- Step 8: Enable notifications RLS policies
\i scripts/007_notifications_rls_policies.sql

-- Step 9: Create enhanced notifications
\i scripts/008_enhanced_notifications.sql

-- Final verification
SELECT 'Database setup completed successfully!' as status;
