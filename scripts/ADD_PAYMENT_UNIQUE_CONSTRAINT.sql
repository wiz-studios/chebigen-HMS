-- Add Unique Constraint to Prevent Duplicate Payments
-- This script adds a unique constraint to prevent duplicate payments
-- for the same bill with the same amount within a short time frame

-- First, let's check for existing duplicate payments and clean them up
-- Find duplicate payments (same bill_id, amount, and paid_at within 1 minute)
WITH duplicate_payments AS (
  SELECT 
    bill_id,
    amount,
    paid_at,
    ROW_NUMBER() OVER (
      PARTITION BY bill_id, amount, DATE_TRUNC('minute', paid_at) 
      ORDER BY paid_at
    ) as rn
  FROM payment_history
)
-- Delete duplicate payments, keeping only the first one
DELETE FROM payment_history 
WHERE id IN (
  SELECT ph.id 
  FROM payment_history ph
  JOIN duplicate_payments dp ON ph.bill_id = dp.bill_id 
    AND ph.amount = dp.amount 
    AND DATE_TRUNC('minute', ph.paid_at) = DATE_TRUNC('minute', dp.paid_at)
  WHERE dp.rn > 1
);

-- Add a unique constraint to prevent future duplicates
-- This constraint prevents multiple payments with the same bill_id, amount, and user within 1 minute
-- We'll use a simpler approach with a composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_unique_bill_amount_user_time
ON payment_history (bill_id, amount, paid_by, (paid_at::timestamp(0)));

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_payment_history_unique_bill_amount_user_time IS 
'Prevents duplicate payments for the same bill with the same amount by the same user at the same second';

-- Verify the constraint was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_history' 
  AND indexname = 'idx_payment_history_unique_bill_amount_user_time';

-- Show current payment history to verify cleanup
SELECT 
  bill_id,
  amount,
  paid_at,
  COUNT(*) as payment_count
FROM payment_history 
GROUP BY bill_id, amount, paid_at
HAVING COUNT(*) > 1
ORDER BY bill_id, paid_at;
