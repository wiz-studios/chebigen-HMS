-- Performance optimization indexes for Chebigen HMS
-- Safe to run multiple times due to IF NOT EXISTS clauses

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Appointment-related indexes
CREATE INDEX IF NOT EXISTS idx_appointments_provider_scheduled 
ON appointments (provider_id, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_scheduled 
ON appointments (patient_id, scheduled_time);

-- Partial index for recent and upcoming appointments (most queried)
CREATE INDEX IF NOT EXISTS idx_appointments_today_provider 
ON appointments ((scheduled_time::date)) 
WHERE scheduled_time >= NOW() - INTERVAL '7 days';

-- 2. Billing-related indexes
CREATE INDEX IF NOT EXISTS idx_bills_patient_status 
ON bills (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_billingitems_billid 
ON bill_items (bill_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_bill_id 
ON payment_history (bill_id);

CREATE INDEX IF NOT EXISTS idx_bills_created_status 
ON bills (created_at DESC, status) 
WHERE deleted_at IS NULL;

-- 3. Patient-related indexes
CREATE INDEX IF NOT EXISTS idx_patients_mrn 
ON patients (mrn);

CREATE INDEX IF NOT EXISTS idx_patients_name_search 
ON patients (lower(first_name), lower(last_name)) 
WHERE deleted_at IS NULL;

-- 4. Lab-related indexes
CREATE INDEX IF NOT EXISTS idx_lab_results_order_id 
ON lab_results (order_id);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_date 
ON lab_results (patient_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- 5. User and role indexes
CREATE INDEX IF NOT EXISTS idx_users_role_status 
ON users (role, status) 
WHERE deleted_at IS NULL;

-- 6. Prescription and medication indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date 
ON prescriptions (patient_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- 7. Audit and notification indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications (user_id, read) 
WHERE deleted_at IS NULL;

-- Vacuum analyze recommendation (to be run after significant data changes)
-- VACUUM ANALYZE appointments;
-- VACUUM ANALYZE bills;
-- VACUUM ANALYZE patients;
-- VACUUM ANALYZE lab_results;
-- VACUUM ANALYZE users;

-- Note: Connection pooling configuration
-- If using Supabase, append ?pgbouncer=true to connection URL
-- Recommended pool settings:
-- max_connections = 100 (Postgres level)
-- pool_size = 20 (Application level, via PG_POOL_MAX env var)
-- pool_timeout = 30 (seconds)