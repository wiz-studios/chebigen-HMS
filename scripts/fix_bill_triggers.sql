-- Fix Bill Triggers Script
-- This script ensures the bill total calculation triggers are properly installed

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_bill_total ON bill_items;
DROP TRIGGER IF EXISTS trigger_update_bill_status ON payment_history;
DROP TRIGGER IF EXISTS trigger_update_bill_paid_amount ON payment_history;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_bill_total();
DROP FUNCTION IF EXISTS update_bill_status();
DROP FUNCTION IF EXISTS update_bill_paid_amount();

-- Create function to automatically update bill totals
CREATE OR REPLACE FUNCTION update_bill_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the total_amount in bills table
    UPDATE bills 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM bill_items 
        WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update bill totals when bill_items change
CREATE TRIGGER trigger_update_bill_total
    AFTER INSERT OR UPDATE OR DELETE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_total();

-- Create function to update bill status based on payments
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    bill_total DECIMAL(10,2);
    bill_paid DECIMAL(10,2);
BEGIN
    -- Get bill total and paid amounts
    SELECT total_amount, paid_amount 
    INTO bill_total, bill_paid
    FROM bills 
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    -- Update bill status based on payment amounts
    UPDATE bills 
    SET status = CASE 
        WHEN bill_paid >= bill_total THEN 'paid'
        WHEN bill_paid > 0 THEN 'partial'
        ELSE 'pending'
    END,
    updated_at = NOW()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update bill status when payments are made
CREATE TRIGGER trigger_update_bill_status
    AFTER INSERT OR UPDATE OR DELETE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_status();

-- Create function to update paid_amount in bills table
CREATE OR REPLACE FUNCTION update_bill_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the paid_amount in bills table
    UPDATE bills 
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payment_history 
        WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update paid_amount when payments change
CREATE TRIGGER trigger_update_bill_paid_amount
    AFTER INSERT OR UPDATE OR DELETE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_paid_amount();

-- Manually update all existing bills with 0 total_amount
UPDATE bills 
SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM bill_items 
    WHERE bill_items.bill_id = bills.id
),
updated_at = NOW()
WHERE total_amount = 0;

-- Success message
SELECT 'Bill triggers and functions installed successfully! All existing bills updated.' as status;
