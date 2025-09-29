-- Fix foreign key constraints to handle user deletions properly
-- This script updates the audit_logs foreign key to allow user deletion

-- Drop the existing foreign key constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Recreate the foreign key constraint with CASCADE delete
-- This means when a user is deleted, their audit logs will also be deleted
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Alternative: If you prefer to keep audit logs but set user_id to NULL when user is deleted
-- Uncomment the following lines and comment out the above CASCADE version:

-- ALTER TABLE audit_logs 
-- ADD CONSTRAINT audit_logs_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Note: CASCADE is recommended for audit logs as they should be deleted with the user
-- SET NULL would keep the audit logs but lose the connection to the user
