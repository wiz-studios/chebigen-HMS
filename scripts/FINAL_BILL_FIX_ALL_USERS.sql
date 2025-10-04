-- FINAL COMPREHENSIVE BILL FIX FOR ALL USERS
-- This script fixes the bill amount issue for ALL users (doctors, nurses, receptionists, admins)
-- Based on the successful fix we used for nurses

-- Step 1: Show current state of all bills
SELECT 
    'BEFORE FIX - Current Bill Status' as status,
    COUNT(*) as total_bills,
    COUNT(CASE WHEN total_amount = 0 THEN 1 END) as bills_with_zero_amount,
    COUNT(CASE WHEN total_amount > 0 THEN 1 END) as bills_with_amount
FROM bills;

-- Step 2: Show detailed bill information before fix
SELECT 
    b.id,
    b.created_by,
    u.full_name as created_by_name,
    u.role as created_by_role,
    b.total_amount,
    b.paid_amount,
    b.status,
    b.created_at,
    COUNT(bi.id) as item_count,
    COALESCE(SUM(bi.total_price), 0) as calculated_total
FROM bills b
LEFT JOIN users u ON b.created_by = u.id
LEFT JOIN bill_items bi ON b.id = bi.bill_id
GROUP BY b.id, b.created_by, u.full_name, u.role, b.total_amount, b.paid_amount, b.status, b.created_at
ORDER BY b.created_at DESC;

-- Step 3: Fix ALL bills with incorrect amounts
UPDATE bills 
SET 
    total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM bill_items 
        WHERE bill_items.bill_id = bills.id
    ),
    updated_at = NOW()
WHERE 
    total_amount = 0 
    OR total_amount != (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM bill_items 
        WHERE bill_items.bill_id = bills.id
    );

-- Step 4: Show results after fix
SELECT 
    'AFTER FIX - Updated Bill Status' as status,
    COUNT(*) as total_bills,
    COUNT(CASE WHEN total_amount = 0 THEN 1 END) as bills_with_zero_amount,
    COUNT(CASE WHEN total_amount > 0 THEN 1 END) as bills_with_amount
FROM bills;

-- Step 5: Show detailed results
SELECT 
    b.id,
    b.created_by,
    u.full_name as created_by_name,
    u.role as created_by_role,
    b.total_amount,
    b.paid_amount,
    b.status,
    COUNT(bi.id) as item_count,
    COALESCE(SUM(bi.total_price), 0) as calculated_total,
    CASE 
        WHEN b.total_amount = COALESCE(SUM(bi.total_price), 0) THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as status_check
FROM bills b
LEFT JOIN users u ON b.created_by = u.id
LEFT JOIN bill_items bi ON b.id = bi.bill_id
GROUP BY b.id, b.created_by, u.full_name, u.role, b.total_amount, b.paid_amount, b.status
ORDER BY b.created_at DESC;

-- Step 6: Success message
SELECT '🎉 ALL BILL AMOUNTS FIXED FOR ALL USERS! 🎉' as final_status;
