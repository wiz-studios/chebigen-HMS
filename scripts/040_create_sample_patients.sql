-- Create Sample Patients for Testing
-- This script creates sample patients for testing the billing system

-- Insert sample patients
INSERT INTO patients (user_id, first_name, last_name, mrn, dob, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, created_at)
SELECT 
  u.id,
  'John',
  'Doe',
  'MRN-001',
  '1985-03-15',
  'male',
  '+254712345678',
  'john.doe@example.com',
  '123 Main Street, Nairobi',
  'Jane Doe',
  '+254712345679',
  NOW()
FROM users u
WHERE u.role = 'patient'
LIMIT 1
ON CONFLICT (mrn) DO NOTHING;

INSERT INTO patients (user_id, first_name, last_name, mrn, dob, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, created_at)
SELECT 
  u.id,
  'Mary',
  'Smith',
  'MRN-002',
  '1990-07-22',
  'female',
  '+254712345680',
  'mary.smith@example.com',
  '456 Oak Avenue, Nairobi',
  'John Smith',
  '+254712345681',
  NOW()
FROM users u
WHERE u.role = 'patient'
LIMIT 1
ON CONFLICT (mrn) DO NOTHING;

INSERT INTO patients (user_id, first_name, last_name, mrn, dob, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, created_at)
SELECT 
  u.id,
  'David',
  'Johnson',
  'MRN-003',
  '1978-11-08',
  'male',
  '+254712345682',
  'david.johnson@example.com',
  '789 Pine Street, Nairobi',
  'Sarah Johnson',
  '+254712345683',
  NOW()
FROM users u
WHERE u.role = 'patient'
LIMIT 1
ON CONFLICT (mrn) DO NOTHING;

-- If no patient users exist, create some sample patient records without user accounts
INSERT INTO patients (user_id, first_name, last_name, mrn, dob, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, created_at)
VALUES 
  (NULL, 'Alice', 'Brown', 'MRN-004', '1992-05-10', 'female', '+254712345684', 'alice.brown@example.com', '321 Elm Street, Nairobi', 'Bob Brown', '+254712345685', NOW()),
  (NULL, 'Robert', 'Wilson', 'MRN-005', '1987-09-14', 'male', '+254712345686', 'robert.wilson@example.com', '654 Maple Drive, Nairobi', 'Lisa Wilson', '+254712345687', NOW()),
  (NULL, 'Sarah', 'Davis', 'MRN-006', '1995-12-03', 'female', '+254712345688', 'sarah.davis@example.com', '987 Cedar Lane, Nairobi', 'Mike Davis', '+254712345689', NOW())
ON CONFLICT (mrn) DO NOTHING;

-- Add comments
COMMENT ON TABLE patients IS 'Patient records for the hospital management system';
