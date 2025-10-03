-- Create Service Catalog Table
-- This script creates a service catalog for standardized pricing

-- Create service_catalog table
CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('consultation','laboratory','radiology','procedure','medication')) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON service_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_service_catalog_name ON service_catalog(name);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_service_catalog_updated_at ON service_catalog;
CREATE TRIGGER trigger_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_service_catalog_updated_at();

-- Enable RLS on service_catalog
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_catalog
DROP POLICY IF EXISTS "service_catalog_access_policy" ON service_catalog;

CREATE POLICY "service_catalog_access_policy" ON service_catalog
  FOR ALL
  USING (
    -- SuperAdmin has full access
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
    OR
    -- Accountant has full access
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'accountant'
    )
    OR
    -- Other staff can view active services only
    (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist')
      )
      AND is_active = true
    )
  );

-- Insert sample service catalog data
INSERT INTO service_catalog (name, description, category, price, is_active) VALUES
('General Consultation', 'Standard doctor consultation', 'consultation', 1500.00, true),
('Specialist Consultation', 'Specialist doctor consultation', 'consultation', 3000.00, true),
('Follow-up Consultation', 'Follow-up visit consultation', 'consultation', 1000.00, true),
('Blood Test - Basic', 'Complete blood count and basic panel', 'laboratory', 800.00, true),
('Blood Test - Comprehensive', 'Full blood panel with liver and kidney function', 'laboratory', 1500.00, true),
('Urine Analysis', 'Complete urine analysis', 'laboratory', 500.00, true),
('X-Ray - Chest', 'Chest X-ray examination', 'radiology', 1200.00, true),
('X-Ray - Limb', 'Limb X-ray examination', 'radiology', 800.00, true),
('Ultrasound - Abdomen', 'Abdominal ultrasound examination', 'radiology', 2500.00, true),
('Ultrasound - Pelvis', 'Pelvic ultrasound examination', 'radiology', 2000.00, true),
('Minor Surgery', 'Minor surgical procedure', 'procedure', 5000.00, true),
('Wound Dressing', 'Wound cleaning and dressing', 'procedure', 500.00, true),
('Injection', 'Therapeutic injection', 'procedure', 300.00, true),
('Prescription Medication', 'Prescribed medication', 'medication', 0.00, true)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE service_catalog IS 'Stores service catalog with standardized pricing';
COMMENT ON COLUMN service_catalog.name IS 'Service name';
COMMENT ON COLUMN service_catalog.description IS 'Service description';
COMMENT ON COLUMN service_catalog.category IS 'Service category: consultation, laboratory, radiology, procedure, medication';
COMMENT ON COLUMN service_catalog.price IS 'Standard price for the service in KES';
COMMENT ON COLUMN service_catalog.is_active IS 'Whether the service is currently available';
