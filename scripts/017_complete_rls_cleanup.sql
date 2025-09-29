-- Complete RLS cleanup to fix infinite recursion
-- This script drops ALL policies and functions that cause recursion

-- Drop ALL policies on ALL tables that depend on get_user_role function
-- Patients table policies
DROP POLICY IF EXISTS "SuperAdmin can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON patients;
DROP POLICY IF EXISTS "Clinical staff can view patients" ON patients;
DROP POLICY IF EXISTS "Accountant can view patient billing info" ON patients;
DROP POLICY IF EXISTS "Receptionist can manage patients" ON patients;

-- Appointments table policies
DROP POLICY IF EXISTS "SuperAdmin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view relevant appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their appointments" ON appointments;

-- Encounters table policies
DROP POLICY IF EXISTS "SuperAdmin can view all encounters" ON encounters;
DROP POLICY IF EXISTS "Patients can view their encounters" ON encounters;
DROP POLICY IF EXISTS "Clinical staff can view encounters" ON encounters;
DROP POLICY IF EXISTS "Providers can manage encounters" ON encounters;

-- Vitals table policies
DROP POLICY IF EXISTS "SuperAdmin can view all vitals" ON vitals;
DROP POLICY IF EXISTS "Patients can view their vitals" ON vitals;
DROP POLICY IF EXISTS "Clinical staff can view vitals" ON vitals;
DROP POLICY IF EXISTS "Providers can manage vitals" ON vitals;

-- Orders table policies
DROP POLICY IF EXISTS "SuperAdmin can view all orders" ON orders;
DROP POLICY IF EXISTS "Patients can view their orders" ON orders;
DROP POLICY IF EXISTS "Clinical staff can view orders" ON orders;
DROP POLICY IF EXISTS "Providers can manage orders" ON orders;

-- Lab results table policies
DROP POLICY IF EXISTS "SuperAdmin can view all lab results" ON lab_results;
DROP POLICY IF EXISTS "Patients can view their lab results" ON lab_results;
DROP POLICY IF EXISTS "Clinical staff can view lab results" ON lab_results;
DROP POLICY IF EXISTS "Providers can manage lab results" ON lab_results;

-- Prescriptions table policies
DROP POLICY IF EXISTS "SuperAdmin can view all prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Clinical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Providers can manage prescriptions" ON prescriptions;

-- Invoices table policies
DROP POLICY IF EXISTS "SuperAdmin can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Patients can view their invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can view invoices" ON invoices;
DROP POLICY IF EXISTS "Accountant can manage invoices" ON invoices;

-- Files table policies
DROP POLICY IF EXISTS "SuperAdmin can view all files" ON files;
DROP POLICY IF EXISTS "Patients can view their files" ON files;
DROP POLICY IF EXISTS "Clinical staff can view files" ON files;
DROP POLICY IF EXISTS "Providers can manage files" ON files;

-- Users table policies
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Now drop the problematic functions
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_superadmin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_superadmin_safe() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_safe() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_simple() CASCADE;

-- Create simple, non-recursive policies for users table only
-- This is the minimum needed to get the system working

-- Allow user registration
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record  
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- Temporarily allow all authenticated users to view users
-- This prevents recursion and allows the system to work
CREATE POLICY "Allow authenticated users to view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Note: We'll add back the other table policies later once the system is working
-- For now, the focus is on getting user registration working
