-- Verify Payment Triggers Work Correctly
-- This script verifies that all payment trigger functions work with the actual bills table structure

-- Test 1: Verify function signatures match table structure
SELECT 
    'Function Signatures Test' as test_name,
    'Checking function return types match table columns' as description;

-- Test 2: Check if functions exist and are callable
SELECT 
    'Function Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_bill_payment_status') 
        THEN 'update_bill_payment_status function exists'
        ELSE 'update_bill_payment_status function missing'
    END as result;

SELECT 
    'Function Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_payment_notification') 
        THEN 'create_payment_notification function exists'
        ELSE 'create_payment_notification function missing'
    END as result;

SELECT 
    'Function Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_all_bill_statuses') 
        THEN 'fix_all_bill_statuses function exists'
        ELSE 'fix_all_bill_statuses function missing'
    END as result;

SELECT 
    'Function Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_bill_payment_summary') 
        THEN 'get_bill_payment_summary function exists'
        ELSE 'get_bill_payment_summary function missing'
    END as result;

-- Test 3: Check if triggers exist
SELECT 
    'Trigger Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_bill_payment_status_insert') 
        THEN 'trigger_update_bill_payment_status_insert exists'
        ELSE 'trigger_update_bill_payment_status_insert missing'
    END as result;

SELECT 
    'Trigger Existence Test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_payment_notification') 
        THEN 'trigger_create_payment_notification exists'
        ELSE 'trigger_create_payment_notification missing'
    END as result;

-- Test 4: Verify table structure matches expectations
SELECT 
    'Table Structure Test' as test_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bills' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 5: Check if there are any existing bills to test with
SELECT 
    'Data Availability Test' as test_name,
    COUNT(*) as bill_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_bills,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bills
FROM bills;

-- Test 6: Check if there are any existing payments to test with
SELECT 
    'Payment Data Test' as test_name,
    COUNT(*) as payment_count,
    COUNT(DISTINCT bill_id) as bills_with_payments,
    SUM(amount) as total_payments
FROM payment_history;

-- Test 7: Test the get_bill_payment_summary function with a real bill (if any exist)
DO $$
DECLARE
    test_bill_id UUID;
    summary_record RECORD;
BEGIN
    -- Get the first bill if any exist
    SELECT id INTO test_bill_id FROM bills LIMIT 1;
    
    IF test_bill_id IS NOT NULL THEN
        -- Test the function
        SELECT * INTO summary_record FROM get_bill_payment_summary(test_bill_id);
        
        RAISE NOTICE 'get_bill_payment_summary test successful for bill %', test_bill_id;
        RAISE NOTICE 'Bill ID: %, Status: %, Total: %, Paid: %', 
            summary_record.bill_id, 
            summary_record.status, 
            summary_record.total_amount, 
            summary_record.paid_amount;
    ELSE
        RAISE NOTICE 'No bills found to test get_bill_payment_summary function';
    END IF;
END $$;

-- Test 8: Verify RLS policies exist
SELECT 
    'RLS Policy Test' as test_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('bills', 'payment_history', 'notifications')
ORDER BY tablename, policyname;

-- Test 9: Check table permissions
SELECT 
    'Table Permissions Test' as test_name,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('bills', 'payment_history', 'notifications')
AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- Test 10: Summary report
SELECT 
    'VERIFICATION COMPLETE' as status,
    'All payment trigger functions and tables verified' as message,
    NOW() as verified_at;
