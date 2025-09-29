-- Enable Row Level Security (RLS) for all tables
-- This ensures data security and proper access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'superadmin' FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "SuperAdmin can view all users" ON users FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own record" ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Staff can view basic user info" ON users FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'receptionist', 'lab_tech', 'accountant')
    AND role != 'superadmin'
  );

CREATE POLICY "SuperAdmin can manage all users" ON users FOR ALL
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can update their own record" ON users FOR UPDATE
  USING (auth.uid() = id);

-- Patients table policies
CREATE POLICY "SuperAdmin can view all patients" ON patients FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their own record" ON patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Clinical staff can view patients" ON patients FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'receptionist', 'lab_tech')
  );

CREATE POLICY "Accountant can view patient billing info" ON patients FOR SELECT
  USING (get_user_role(auth.uid()) = 'accountant');

CREATE POLICY "Receptionist can manage patients" ON patients FOR ALL
  USING (get_user_role(auth.uid()) IN ('receptionist', 'superadmin'));

-- Appointments table policies
CREATE POLICY "SuperAdmin can view all appointments" ON appointments FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their appointments" ON appointments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Staff can view relevant appointments" ON appointments FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'receptionist', 'lab_tech')
  );

CREATE POLICY "Providers can manage their appointments" ON appointments FOR ALL
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) IN ('receptionist', 'superadmin')
  );

-- Encounters table policies
CREATE POLICY "SuperAdmin can view all encounters" ON encounters FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their encounters" ON encounters FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = encounters.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view encounters" ON encounters FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech')
  );

CREATE POLICY "Providers can manage encounters" ON encounters FOR ALL
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'superadmin')
  );

-- Vitals table policies
CREATE POLICY "SuperAdmin can view all vitals" ON vitals FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their vitals" ON vitals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view vitals" ON vitals FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech')
  );

CREATE POLICY "Providers can manage vitals" ON vitals FOR ALL
  USING (
    recorded_by = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'superadmin')
  );

-- Orders table policies
CREATE POLICY "SuperAdmin can view all orders" ON orders FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their orders" ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = orders.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view orders" ON orders FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech')
  );

CREATE POLICY "Providers can manage orders" ON orders FOR ALL
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'superadmin')
  );

-- Lab results table policies
CREATE POLICY "SuperAdmin can view all lab results" ON lab_results FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their lab results" ON lab_results FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients p 
            JOIN orders o ON p.id = o.patient_id 
            WHERE o.id = lab_results.order_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view lab results" ON lab_results FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech')
  );

CREATE POLICY "Providers can manage lab results" ON lab_results FOR ALL
  USING (
    performed_by = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech', 'superadmin')
  );

-- Prescriptions table policies
CREATE POLICY "SuperAdmin can view all prescriptions" ON prescriptions FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their prescriptions" ON prescriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view prescriptions" ON prescriptions FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'pharmacist')
  );

CREATE POLICY "Providers can manage prescriptions" ON prescriptions FOR ALL
  USING (
    provider_id = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'pharmacist', 'superadmin')
  );

-- Invoices table policies
CREATE POLICY "SuperAdmin can view all invoices" ON invoices FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their invoices" ON invoices FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = invoices.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Accountant can view invoices" ON invoices FOR SELECT
  USING (get_user_role(auth.uid()) = 'accountant');

CREATE POLICY "Accountant can manage invoices" ON invoices FOR ALL
  USING (get_user_role(auth.uid()) IN ('accountant', 'superadmin'));

-- Files table policies
CREATE POLICY "SuperAdmin can view all files" ON files FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Patients can view their files" ON files FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = files.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view files" ON files FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech')
  );

CREATE POLICY "Providers can manage files" ON files FOR ALL
  USING (
    uploaded_by = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'superadmin')
  );

-- Audit logs policies (most restrictive)
CREATE POLICY "SuperAdmin can view all audit logs" ON audit_logs FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own audit logs" ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true); -- Allow system to log all actions
