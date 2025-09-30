-- Fix appointment status constraint to include all frontend status values
-- This addresses the check constraint violation error

-- First, drop the existing check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add the new check constraint with all valid status values
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'arrived'));

-- Update any existing appointments that might have invalid status values
-- (This is a safety measure in case there are any existing records)
UPDATE appointments 
SET status = 'scheduled' 
WHERE status NOT IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'arrived');

-- Verify the constraint is working
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'appointments' AND constraint_name = 'appointments_status_check';
