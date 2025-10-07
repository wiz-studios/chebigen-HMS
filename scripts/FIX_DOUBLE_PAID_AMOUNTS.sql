-- Fix Double Paid Amounts
-- This script fixes bills that have incorrect paid_amount values due to double counting
-- from both application code and database triggers

-- First, let's see the current state
SELECT 
  'Current State' as status,
  COUNT(*) as total_bills,
  COUNT(CASE WHEN paid_amount > total_amount THEN 1 END) as overpaid_bills,
  COUNT(CASE WHEN paid_amount = total_amount AND status != 'paid' THEN 1 END) as inconsistent_status
FROM bills;

-- Show bills with incorrect paid amounts
SELECT 
  id,
  total_amount,
  paid_amount,
  status,
  (paid_amount - total_amount) as overpayment,
  CASE 
    WHEN paid_amount > total_amount THEN 'OVERPAID'
    WHEN paid_amount = total_amount AND status != 'paid' THEN 'INCONSISTENT_STATUS'
    ELSE 'OK'
  END as issue_type
FROM bills 
WHERE paid_amount > total_amount OR (paid_amount = total_amount AND status != 'paid')
ORDER BY paid_amount DESC;

-- Fix the paid_amount by recalculating from payment_history
UPDATE bills 
SET 
  paid_amount = COALESCE((
    SELECT SUM(amount) 
    FROM payment_history 
    WHERE payment_history.bill_id = bills.id
  ), 0),
  status = CASE 
    WHEN COALESCE((
      SELECT SUM(amount) 
      FROM payment_history 
      WHERE payment_history.bill_id = bills.id
    ), 0) >= bills.total_amount THEN 'paid'
    WHEN COALESCE((
      SELECT SUM(amount) 
      FROM payment_history 
      WHERE payment_history.bill_id = bills.id
    ), 0) > 0 THEN 'partial'
    ELSE 'pending'
  END,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM bills
);

-- Verify the fix
SELECT 
  'After Fix' as status,
  COUNT(*) as total_bills,
  COUNT(CASE WHEN paid_amount > total_amount THEN 1 END) as overpaid_bills,
  COUNT(CASE WHEN paid_amount = total_amount AND status != 'paid' THEN 1 END) as inconsistent_status
FROM bills;

-- Show the corrected bills
SELECT 
  id,
  total_amount,
  paid_amount,
  status,
  (paid_amount - total_amount) as overpayment
FROM bills 
ORDER BY paid_amount DESC
LIMIT 10;

-- Show payment history for verification
SELECT 
  ph.bill_id,
  b.total_amount,
  b.paid_amount,
  b.status,
  COUNT(ph.id) as payment_count,
  SUM(ph.amount) as total_payments,
  MAX(ph.paid_at) as last_payment
FROM payment_history ph
JOIN bills b ON ph.bill_id = b.id
GROUP BY ph.bill_id, b.total_amount, b.paid_amount, b.status
ORDER BY total_payments DESC
LIMIT 10;
