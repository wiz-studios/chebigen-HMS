-- Simple Payment Duplicate Prevention
-- This script provides a simpler approach to prevent duplicate payments
-- without using complex timestamp functions

-- First, let's clean up existing duplicates by keeping only the first payment
-- for each combination of bill_id, amount, and user within the same minute
WITH duplicate_payments AS (
  SELECT 
    id,
    bill_id,
    amount,
    paid_by,
    paid_at,
    ROW_NUMBER() OVER (
      PARTITION BY bill_id, amount, paid_by, DATE_TRUNC('minute', paid_at)
      ORDER BY paid_at
    ) as rn
  FROM payment_history
)
DELETE FROM payment_history 
WHERE id IN (
  SELECT id 
  FROM duplicate_payments 
  WHERE rn > 1
);

-- Add a simple unique constraint on bill_id, amount, and paid_by
-- This prevents the same user from recording the same amount for the same bill
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_unique_bill_amount_user
ON payment_history (bill_id, amount, paid_by);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_payment_history_unique_bill_amount_user IS 
'Prevents the same user from recording the same amount for the same bill';

-- Verify the constraint was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname = 'idx_payment_history_unique_bill_amount_user';

-- Show current payment history to verify cleanup
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

-- Show summary of payments per bill
SELECT 
  bill_id,
  COUNT(*) as total_payments,
  SUM(amount) as total_paid,
  MIN(paid_at) as first_payment,
  MAX(paid_at) as last_payment
FROM payment_history 
GROUP BY bill_id
ORDER BY bill_id;
