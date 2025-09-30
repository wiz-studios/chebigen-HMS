-- Create a simplified lab tests table that matches the frontend expectations
-- This addresses the "Order Lab Test" button functionality

-- Create lab_tests table (simpler than the existing lab_results structure)
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  ordered_by UUID REFERENCES users(id),
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  ordered_date TIMESTAMP DEFAULT NOW(),
  collected_date TIMESTAMP,
  result_date TIMESTAMP,
  result_value TEXT,
  reference_range TEXT,
  unit TEXT,
  abnormal_flag TEXT CHECK (abnormal_flag IN ('high', 'low', 'critical', 'abnormal')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_ordered_by ON lab_tests(ordered_by);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_lab_tests_ordered_date ON lab_tests(ordered_date);

-- Enable RLS
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lab_tests
CREATE POLICY "SuperAdmin can view all lab tests" ON lab_tests FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Patients can view their lab tests" ON lab_tests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_tests.patient_id AND patients.user_id = auth.uid())
  );

CREATE POLICY "Clinical staff can view lab tests" ON lab_tests FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('doctor', 'nurse', 'lab_tech', 'receptionist')
  );

CREATE POLICY "Doctors can manage lab tests" ON lab_tests FOR ALL
  USING (
    ordered_by = auth.uid() OR 
    get_user_role(auth.uid()) IN ('doctor', 'superadmin')
  );

CREATE POLICY "Lab techs can update lab tests" ON lab_tests FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('lab_tech', 'superadmin')
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_tests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test query to verify the setup works
SELECT COUNT(*) as accessible_lab_tests FROM lab_tests;
