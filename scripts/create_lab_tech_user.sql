-- Create a lab technician user for testing
-- Replace the email and password with your desired values

INSERT INTO users (
    id,
    full_name,
    email,
    password_hash,
    role,
    status
) VALUES (
    gen_random_uuid(),
    'Lab Technician',
    'labtech@hospital.com',
    '', -- Password will be set by Supabase Auth
    'lab_tech',
    'active'
) ON CONFLICT (email) DO UPDATE SET
    role = 'lab_tech',
    status = 'active',
    updated_at = NOW();
