-- Cleanup script to remove all existing RLS policies and functions
-- Run this before re-running the RLS setup scripts

-- Drop all existing policies on core tables
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

DROP POLICY IF EXISTS "SuperAdmin can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON patients;
DROP POLICY IF EXISTS "Clinical staff can view patients" ON patients;
DROP POLICY IF EXISTS "Accountant can view patient billing info" ON patients;
DROP POLICY IF EXISTS "Receptionist can manage patients" ON patients;

DROP POLICY IF EXISTS "SuperAdmin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view relevant appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their appointments" ON appointments;

DROP POLICY IF EXISTS "SuperAdmin can view all encounters" ON encounters;
DROP POLICY IF EXISTS "Patients can view their encounters" ON encounters;
DROP POLICY IF EXISTS "Clinical staff can view encounters" ON encounters;
DROP POLICY IF EXISTS "Providers can manage encounters" ON encounters;

DROP POLICY IF EXISTS "SuperAdmin can view all vitals" ON vitals;
DROP POLICY IF EXISTS "Patients can view their vitals" ON vitals;
DROP POLICY IF EXISTS "Clinical staff can view vitals" ON vitals;
DROP POLICY IF EXISTS "Providers can manage vitals" ON vitals;

DROP POLICY IF EXISTS "SuperAdmin can view all orders" ON orders;
DROP POLICY IF EXISTS "Patients can view their orders" ON orders;
DROP POLICY IF EXISTS "Clinical staff can view orders" ON orders;
DROP POLICY IF EXISTS "Providers can manage orders" ON orders;

DROP POLICY IF EXISTS "SuperAdmin can view all lab results" ON lab_results;
DROP POLICY IF EXISTS "Patients can view their lab results" ON lab_results;
DROP POLICY IF EXISTS "Clinical staff can view lab results" ON lab_results;
DROP POLICY IF EXISTS "Providers can manage lab results" ON lab_results;

DROP POLICY IF EXISTS "SuperAdmin can view all prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Clinical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Providers can manage prescriptions" ON prescriptions;

DROP POLICY IF EXISTS "SuperAdmin can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Patients can view their invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can view invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can manage invoices" ON invoices;

DROP POLICY IF EXISTS "SuperAdmin can view all files" ON files;
DROP POLICY IF EXISTS "Patients can view their files" ON files;
DROP POLICY IF EXISTS "Clinical staff can view files" ON files;
DROP POLICY IF EXISTS "Providers can manage files" ON files;

DROP POLICY IF EXISTS "SuperAdmin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Drop inventory policies
DROP POLICY IF EXISTS "inventory_categories_select" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_insert" ON inventory_categories;
DROP POLICY IF EXISTS "inventory_categories_update" ON inventory_categories;

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;

DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;

DROP POLICY IF EXISTS "inventory_stock_select" ON inventory_stock;
DROP POLICY IF EXISTS "inventory_stock_insert" ON inventory_stock;
DROP POLICY IF EXISTS "inventory_stock_update" ON inventory_stock;

DROP POLICY IF EXISTS "inventory_transactions_select" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON inventory_transactions;

DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;

DROP POLICY IF EXISTS "purchase_order_items_select" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_update" ON purchase_order_items;

-- Drop notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "System can create notification preferences" ON notification_preferences;

-- Drop existing helper functions
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS is_superadmin(UUID);

-- Disable RLS on all tables (we'll re-enable it in the proper scripts)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS encounters DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lab_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences DISABLE ROW LEVEL SECURITY;

-- Drop existing triggers that might conflict
DROP TRIGGER IF EXISTS trigger_appointment_scheduled ON appointments;
DROP TRIGGER IF EXISTS trigger_lab_result_ready ON lab_results;
DROP TRIGGER IF EXISTS trigger_critical_lab_values ON lab_results;
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;

-- Drop all update triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS update_encounters_updated_at ON encounters;
DROP TRIGGER IF EXISTS update_vitals_updated_at ON vitals;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_lab_results_updated_at ON lab_results;
DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

-- Drop auto-generation triggers
DROP TRIGGER IF EXISTS auto_generate_patient_mrn ON patients;
DROP TRIGGER IF EXISTS auto_generate_invoice_number_trigger ON invoices;

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS notify_appointment_scheduled();
DROP FUNCTION IF EXISTS notify_lab_result_ready();
DROP FUNCTION IF EXISTS check_critical_lab_values();
DROP FUNCTION IF EXISTS create_default_notification_preferences();

-- Drop utility functions
DROP FUNCTION IF EXISTS generate_mrn();
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS auto_generate_mrn();
DROP FUNCTION IF EXISTS auto_generate_invoice_number();

COMMIT;
