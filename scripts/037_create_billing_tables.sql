-- Create Billing System Tables
-- This script creates the missing payments table and updates the invoices table
-- to match the billing management component expectations

-- First, let's check if we need to update the existing invoices table structure
-- The billing component expects these fields:
-- - amount (instead of total_amount)
-- - status values: 'draft', 'sent', 'paid', 'overdue', 'cancelled' (instead of 'draft','finalized','paid','cancelled')
-- - due_date as DATE (already correct)

-- Update invoices table to match component expectations
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;

-- Update existing records to copy total_amount to amount
UPDATE invoices SET amount = total_amount WHERE amount = 0 AND total_amount > 0;

-- Add new status values to the check constraint
ALTER TABLE invoices 
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft','sent','paid','overdue','cancelled'));

-- Update existing 'finalized' status to 'sent'
UPDATE invoices SET status = 'sent' WHERE status = 'finalized';

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','card','bank_transfer','insurance')) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON payments(reference_number);

-- Add trigger to update invoice status when payments are made
CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the invoice's paid_amount
  UPDATE invoices 
  SET paid_amount = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM payments 
    WHERE invoice_id = NEW.invoice_id
  )
  WHERE id = NEW.invoice_id;
  
  -- Update invoice status based on payment amount
  UPDATE invoices 
  SET status = CASE 
    WHEN paid_amount >= amount THEN 'paid'
    WHEN due_date < CURRENT_DATE AND paid_amount < amount THEN 'overdue'
    ELSE 'sent'
  END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payments
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON payments;
CREATE TRIGGER trigger_update_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status_on_payment();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payments updated_at
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for invoices updated_at (if not already exists)
DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional - remove in production)
-- This will help verify the billing system works correctly

-- Sample invoice data
INSERT INTO invoices (patient_id, created_by, invoice_number, amount, status, due_date)
SELECT 
  p.id,
  u.id,
  'INV-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0'),
  1500.00,
  'sent',
  CURRENT_DATE + INTERVAL '30 days'
FROM patients p
CROSS JOIN users u
WHERE u.role = 'accountant'
LIMIT 1
ON CONFLICT (invoice_number) DO NOTHING;

-- Sample payment data
INSERT INTO payments (invoice_id, patient_id, amount, payment_method, payment_date, reference_number, notes)
SELECT 
  i.id,
  i.patient_id,
  750.00,
  'card',
  CURRENT_DATE,
  'PAY-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0'),
  'Partial payment - first installment'
FROM invoices i
WHERE i.status = 'sent'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant necessary permissions for RLS (Row Level Security)
-- These will be set up in the RLS policies script

COMMENT ON TABLE payments IS 'Stores payment records for invoices';
COMMENT ON COLUMN payments.amount IS 'Payment amount in the base currency';
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment: cash, card, bank_transfer, or insurance';
COMMENT ON COLUMN payments.reference_number IS 'External reference number (transaction ID, check number, etc.)';
COMMENT ON COLUMN payments.notes IS 'Additional notes about the payment';

COMMENT ON TABLE invoices IS 'Stores billing invoices for patients';
COMMENT ON COLUMN invoices.amount IS 'Total invoice amount (replaces total_amount for component compatibility)';
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft, sent, paid, overdue, or cancelled';
