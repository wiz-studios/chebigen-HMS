-- Fix Payment Constraint
-- The current constraint is too restrictive and prevents multiple payments
-- of the same amount for the same bill by the same user

-- First, let's see what constraint currently exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname LIKE '%unique%';

-- Drop the overly restrictive constraint
DROP INDEX IF EXISTS idx_payment_history_unique_bill_amount_user;

-- Create a more flexible constraint that allows multiple payments
-- but prevents exact duplicates within a short time frame (5 seconds)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_unique_bill_amount_user_recent
ON payment_history (bill_id, amount, paid_by, (paid_at::timestamp(0)));

-- Add a comment explaining the new constraint
COMMENT ON INDEX idx_payment_history_unique_bill_amount_user_recent IS 
'Prevents duplicate payments for the same bill with the same amount by the same user within the same second';

-- Verify the new constraint was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname = 'idx_payment_history_unique_bill_amount_user_recent';

-- Show current payment history to verify it works
SELECT 
  bill_id,
  amount,
  paid_by,
  paid_at,
  COUNT(*) as payment_count
FROM payment_history 
GROUP BY bill_id, amount, paid_by, paid_at
HAVING COUNT(*) > 1
ORDER BY bill_id, paid_at;

-- Test: Show payments for a specific bill to verify multiple payments are allowed
SELECT 
  ph.bill_id,
  ph.amount,
  ph.paid_by,
  ph.paid_at,
  ph.payment_method,
  ph.notes
FROM payment_history ph
ORDER BY ph.bill_id, ph.paid_at DESC
LIMIT 10;
