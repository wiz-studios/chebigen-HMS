-- Utility functions for the Hospital Management System

-- Function to generate MRN (Medical Record Number)
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TEXT AS $$
DECLARE
  new_mrn TEXT;
  counter INT;
BEGIN
  -- Get current year
  SELECT EXTRACT(YEAR FROM NOW()) INTO counter;
  
  -- Generate MRN with format: HMS-YYYY-NNNNNN
  SELECT 'HMS-' || counter || '-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(mrn FROM 9) AS INT)), 0) + 1
    FROM patients 
    WHERE mrn LIKE 'HMS-' || counter || '-%'
  )::TEXT, 6, '0') INTO new_mrn;
  
  RETURN new_mrn;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_invoice_number TEXT;
  counter INT;
BEGIN
  -- Get current year and month
  SELECT EXTRACT(YEAR FROM NOW()) * 100 + EXTRACT(MONTH FROM NOW()) INTO counter;
  
  -- Generate invoice number with format: INV-YYYYMM-NNNN
  SELECT 'INV-' || counter || '-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 11) AS INT)), 0) + 1
    FROM invoices 
    WHERE invoice_number LIKE 'INV-' || counter || '-%'
  )::TEXT, 4, '0') INTO new_invoice_number;
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vitals_updated_at BEFORE UPDATE ON vitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON lab_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-generate MRN for new patients
CREATE OR REPLACE FUNCTION auto_generate_mrn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
    NEW.mrn = generate_mrn();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_patient_mrn BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION auto_generate_mrn();

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION auto_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number = generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_invoice_number_trigger BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION auto_generate_invoice_number();
