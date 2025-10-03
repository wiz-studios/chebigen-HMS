-- Billing System RLS Policies
-- This script creates Row Level Security policies for the billing tables
-- Based on the HMS Access Control Matrix

-- Enable RLS on billing tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "invoices_access_policy" ON invoices;
DROP POLICY IF EXISTS "payments_access_policy" ON payments;

-- Invoices RLS Policies
-- SuperAdmin: Full access to all invoices
-- Accountant: Full CRUD access to all invoices
-- Patient: View own invoices only
CREATE POLICY "invoices_access_policy" ON invoices
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
    -- Patient can only see their own invoices
    (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'patient'
      )
      AND patient_id IN (
        SELECT p.id FROM patients p
        WHERE p.user_id = auth.uid()
      )
    )
  );

-- Payments RLS Policies
-- SuperAdmin: Full access to all payments
-- Accountant: Full CRUD access to all payments
-- Patient: View own payments only
CREATE POLICY "payments_access_policy" ON payments
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
    -- Patient can only see their own payments
    (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'patient'
      )
      AND patient_id IN (
        SELECT p.id FROM patients p
        WHERE p.user_id = auth.uid()
      )
    )
  );

-- Create function to check if user can create invoices
CREATE OR REPLACE FUNCTION can_create_invoices()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('superadmin', 'accountant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can manage payments
CREATE OR REPLACE FUNCTION can_manage_payments()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('superadmin', 'accountant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add additional constraints for data integrity
-- Ensure payment amount doesn't exceed invoice amount
CREATE OR REPLACE FUNCTION check_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total NUMERIC(10,2);
  paid_total NUMERIC(10,2);
BEGIN
  -- Get invoice total amount
  SELECT amount INTO invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;
  
  -- Get total paid amount (excluding current payment if updating)
  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM payments
  WHERE invoice_id = NEW.invoice_id
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Check if new payment would exceed invoice amount
  IF (paid_total + NEW.amount) > invoice_total THEN
    RAISE EXCEPTION 'Payment amount (%.2f) exceeds remaining invoice balance (%.2f)', 
      NEW.amount, (invoice_total - paid_total);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate payment amounts
DROP TRIGGER IF EXISTS trigger_check_payment_amount ON payments;
CREATE TRIGGER trigger_check_payment_amount
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION check_payment_amount();

-- Create function to generate unique invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_number TEXT;
  counter INTEGER;
BEGIN
  -- Generate invoice number with format: INV-YYYYMMDD-XXXX
  counter := 1;
  
  LOOP
    invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Check if this invoice number already exists
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_number) THEN
      RETURN invoice_number;
    END IF;
    
    counter := counter + 1;
    
    -- Prevent infinite loop
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Unable to generate unique invoice number';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique payment reference numbers
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
  reference_number TEXT;
  counter INTEGER;
BEGIN
  -- Generate reference number with format: PAY-YYYYMMDD-XXXX
  counter := 1;
  
  LOOP
    reference_number := 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Check if this reference number already exists
    IF NOT EXISTS (SELECT 1 FROM payments WHERE reference_number = reference_number) THEN
      RETURN reference_number;
    END IF;
    
    counter := counter + 1;
    
    -- Prevent infinite loop
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Unable to generate unique payment reference number';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION can_create_invoices() IS 'Checks if the current user can create invoices (SuperAdmin or Accountant)';
COMMENT ON FUNCTION can_manage_payments() IS 'Checks if the current user can manage payments (SuperAdmin or Accountant)';
COMMENT ON FUNCTION check_payment_amount() IS 'Validates that payment amount does not exceed invoice balance';
COMMENT ON FUNCTION generate_invoice_number() IS 'Generates unique invoice numbers with format INV-YYYYMMDD-XXXX';
COMMENT ON FUNCTION generate_payment_reference() IS 'Generates unique payment reference numbers with format PAY-YYYYMMDD-XXXX';
