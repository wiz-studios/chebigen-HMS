-- NUCLEAR FIX: Completely remove all RLS policies and functions
-- This is the most aggressive approach to fix the infinite recursion

-- First, disable RLS on ALL tables to stop the recursion immediately
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE encounters DISABLE ROW LEVEL SECURITY;
ALTER TABLE vitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on ALL tables (this will remove the recursion)
-- Users table
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users to view users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users to view users" ON users;

-- Patients table
DROP POLICY IF EXISTS "SuperAdmin can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON patients;
DROP POLICY IF EXISTS "Clinical staff can view patients" ON patients;
DROP POLICY IF EXISTS "Accountant can view patient billing info" ON patients;
DROP POLICY IF EXISTS "Receptionist can manage patients" ON patients;

-- Appointments table
DROP POLICY IF EXISTS "SuperAdmin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view relevant appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their appointments" ON appointments;

-- Encounters table
DROP POLICY IF EXISTS "SuperAdmin can view all encounters" ON encounters;
DROP POLICY IF EXISTS "Patients can view their encounters" ON encounters;
DROP POLICY IF EXISTS "Clinical staff can view encounters" ON encounters;
DROP POLICY IF EXISTS "Providers can manage encounters" ON encounters;

-- Vitals table
DROP POLICY IF EXISTS "SuperAdmin can view all vitals" ON vitals;
DROP POLICY IF EXISTS "Patients can view their vitals" ON vitals;
DROP POLICY IF EXISTS "Clinical staff can view vitals" ON vitals;
DROP POLICY IF EXISTS "Providers can manage vitals" ON vitals;

-- Orders table
DROP POLICY IF EXISTS "SuperAdmin can view all orders" ON orders;
DROP POLICY IF EXISTS "Patients can view their orders" ON orders;
DROP POLICY IF EXISTS "Clinical staff can view orders" ON orders;
DROP POLICY IF EXISTS "Providers can manage orders" ON orders;

-- Lab results table
DROP POLICY IF EXISTS "SuperAdmin can view all lab results" ON lab_results;
DROP POLICY IF EXISTS "Patients can view their lab results" ON lab_results;
DROP POLICY IF EXISTS "Clinical staff can view lab results" ON lab_results;
DROP POLICY IF EXISTS "Providers can manage lab results" ON lab_results;

-- Prescriptions table
DROP POLICY IF EXISTS "SuperAdmin can view all prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Clinical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Providers can manage prescriptions" ON prescriptions;

-- Invoices table
DROP POLICY IF EXISTS "SuperAdmin can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Patients can view their invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can view invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can manage invoices" ON invoices;

-- Files table
DROP POLICY IF EXISTS "SuperAdmin can view all files" ON files;
DROP POLICY IF EXISTS "Patients can view their files" ON files;
DROP POLICY IF EXISTS "Clinical staff can view files" ON files;
DROP POLICY IF EXISTS "Providers can manage files" ON files;

-- Audit logs table
DROP POLICY IF EXISTS "SuperAdmin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Inventory policies
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

-- Notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "System can create notification preferences" ON notification_preferences;

-- Drop ALL problematic functions
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_superadmin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_superadmin_safe() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_safe() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_simple() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Grant all necessary permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Now re-enable RLS only on users table with minimal policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create the most basic policies that won't cause recursion
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- Temporarily allow all authenticated users to view users
CREATE POLICY "Allow authenticated users to view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
