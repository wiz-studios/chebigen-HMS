-- COMPREHENSIVE BILL AMOUNTS FIX
-- This script ensures ALL bills have correct amounts

-- First, let's see what bills have 0 amounts
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

-- Fix ALL bills with incorrect amounts
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

-- Verify the fix
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
        WHEN b.total_amount = COALESCE(SUM(bi.total_price), 0) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status_check
FROM bills b
LEFT JOIN users u ON b.created_by = u.id
LEFT JOIN bill_items bi ON b.id = bi.bill_id
GROUP BY b.id, b.created_by, u.full_name, u.role, b.total_amount, b.paid_amount, b.status
ORDER BY b.created_at DESC;

-- Success message
SELECT 'Bill amounts fixed! All bills now have correct totals.' as status;
