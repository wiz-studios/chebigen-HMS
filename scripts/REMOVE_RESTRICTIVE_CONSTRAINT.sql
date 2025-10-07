-- Remove Restrictive Payment Constraint
-- The current constraint prevents legitimate multiple payments
-- We'll rely on application-level duplicate prevention instead

-- First, let's see what constraints currently exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname LIKE '%unique%';

-- Drop the overly restrictive constraint that prevents multiple payments
DROP INDEX IF EXISTS idx_payment_history_unique_bill_amount_user;
DROP INDEX IF EXISTS idx_payment_history_unique_bill_amount_user_recent;
DROP INDEX IF EXISTS idx_payment_history_unique_bill_amount_user_time;

-- Verify the constraints were removed
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname LIKE '%unique%';

-- Show current payment history to verify multiple payments are now allowed
SELECT 
  ph.bill_id,
  ph.amount,
  ph.paid_by,
  ph.paid_at,
  ph.payment_method,
  ph.notes,
  b.total_amount,
  b.paid_amount,
  b.status
FROM payment_history ph
JOIN bills b ON ph.bill_id = b.id
ORDER BY ph.bill_id, ph.paid_at DESC
LIMIT 20;

-- Show summary of payments per bill
SELECT 
  bill_id,
  COUNT(*) as payment_count,
  SUM(amount) as total_payments,
  MIN(paid_at) as first_payment,
  MAX(paid_at) as last_payment
FROM payment_history 
GROUP BY bill_id
ORDER BY total_payments DESC
LIMIT 10;
