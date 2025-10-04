-- Run Enhanced Billing System Setup
-- This script sets up the comprehensive billing system based on the specification

-- First, run the enhanced billing system script
\i scripts/044_enhanced_billing_system.sql

-- Verify tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bills', 'bill_items', 'payment_history')
ORDER BY table_name;

-- Verify RLS policies are enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('bills', 'bill_items', 'payment_history');

-- Check if triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%bill%'
ORDER BY trigger_name;

-- Test data insertion (optional - for testing)
-- This will be commented out in production
/*
-- Insert a test patient if not exists
INSERT INTO patients (id, first_name, last_name, email, phone, date_of_birth, gender, address, created_at)
VALUES (
    gen_random_uuid(),
    'Test',
    'Patient',
    'test@example.com',
    '+254700000000',
    '1990-01-01',
    'Male',
    'Test Address',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert a test user if not exists
INSERT INTO users (id, email, role, first_name, last_name, created_at)
VALUES (
    gen_random_uuid(),
    'test@example.com',
    'receptionist',
    'Test',
    'User',
    NOW()
) ON CONFLICT (email) DO NOTHING;
*/

-- Show success message
SELECT 'Enhanced billing system setup completed successfully!' as status;
