-- FIX BILL STATUS TRIGGERS
-- This script ensures bill status is updated after payments are recorded

-- Drop existing triggers and functions to ensure clean installation
DROP TRIGGER IF EXISTS trigger_update_bill_paid_amount ON payment_history;
DROP TRIGGER IF EXISTS trigger_update_bill_status ON payment_history;

DROP FUNCTION IF EXISTS update_bill_paid_amount();
DROP FUNCTION IF EXISTS update_bill_status();

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

-- Create function to update bill status based on payments
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    bill_total DECIMAL(10,2);
    bill_paid DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    -- Get bill total and paid amounts
    SELECT total_amount, paid_amount 
    INTO bill_total, bill_paid
    FROM bills 
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    -- Determine new status
    IF bill_paid >= bill_total THEN
        new_status := 'paid';
    ELSIF bill_paid > 0 THEN
        new_status := 'partial';
    ELSE
        new_status := 'pending';
    END IF;
    
    -- Update bill status
    UPDATE bills 
    SET status = new_status,
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

-- Test the triggers by showing current bill statuses
SELECT 
    'BEFORE TRIGGER TEST' as test_phase,
    COUNT(*) as total_bills,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_bills,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills
FROM bills;

-- Update all existing bills to have correct status based on their payments
UPDATE bills 
SET status = CASE 
    WHEN paid_amount >= total_amount THEN 'paid'
    WHEN paid_amount > 0 THEN 'partial'
    ELSE 'pending'
END,
updated_at = NOW();

-- Show results after trigger installation
SELECT 
    'AFTER TRIGGER INSTALLATION' as test_phase,
    COUNT(*) as total_bills,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_bills,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills
FROM bills;

-- Success message
SELECT '🎉 BILL STATUS TRIGGERS FIXED! 🎉' as status;
SELECT '✅ Triggers will now update bill status after payments' as trigger_status;
SELECT '✅ All existing bills updated with correct status' as existing_bills;
