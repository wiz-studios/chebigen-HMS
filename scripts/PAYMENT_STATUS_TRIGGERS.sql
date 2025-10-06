-- Payment Status Update Triggers
-- This script creates database triggers to automatically update bill status
-- when payments are recorded, ensuring system-wide consistency

-- Function to update bill status and paid amount
CREATE OR REPLACE FUNCTION update_bill_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    bill_record RECORD;
    total_paid NUMERIC(10,2) := 0;
    new_status TEXT;
BEGIN
    -- Get the bill information
    SELECT total_amount, paid_amount, status INTO bill_record
    FROM bills 
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    -- Calculate total paid amount for this bill
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payment_history 
    WHERE payment_history.bill_id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    -- Determine new status
    IF total_paid >= bill_record.total_amount THEN
        new_status := 'paid';
    ELSIF total_paid > 0 THEN
        new_status := 'partial';
    ELSE
        new_status := 'pending';
    END IF;
    
    -- Update the bill with new status and paid amount
    UPDATE bills 
    SET 
        status = new_status,
        paid_amount = total_paid,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    
    -- Log the update
    RAISE NOTICE 'Bill % status updated to % with paid amount %', 
        COALESCE(NEW.bill_id, OLD.bill_id), new_status, total_paid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_bill_payment_status_insert ON payment_history;
DROP TRIGGER IF EXISTS trigger_update_bill_payment_status_update ON payment_history;
DROP TRIGGER IF EXISTS trigger_update_bill_payment_status_delete ON payment_history;

-- Create triggers for INSERT, UPDATE, and DELETE on payment_history
CREATE TRIGGER trigger_update_bill_payment_status_insert
    AFTER INSERT ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

CREATE TRIGGER trigger_update_bill_payment_status_update
    AFTER UPDATE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

CREATE TRIGGER trigger_update_bill_payment_status_delete
    AFTER DELETE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

-- Payment notifications removed to avoid policy conflicts
-- The billing service will handle notifications at the application level

-- Function to update all existing bills with correct status
CREATE OR REPLACE FUNCTION fix_all_bill_statuses()
RETURNS TABLE(
    bill_id UUID,
    old_status TEXT,
    new_status TEXT,
    total_amount NUMERIC(10,2),
    paid_amount NUMERIC(10,2)
) AS $$
BEGIN
    -- Update all bills with correct status and paid amount
    UPDATE bills 
    SET 
        paid_amount = COALESCE((
            SELECT SUM(amount) 
            FROM payment_history 
            WHERE payment_history.bill_id = bills.id
        ), 0),
        status = CASE 
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM payment_history 
                WHERE payment_history.bill_id = bills.id
            ), 0) >= bills.total_amount THEN 'paid'
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM payment_history 
                WHERE payment_history.bill_id = bills.id
            ), 0) > 0 THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id IN (
        SELECT id FROM bills
    );
    
    -- Return the results
    RETURN QUERY
    SELECT 
        b.id as bill_id,
        'updated'::TEXT as old_status,
        b.status::TEXT as new_status,
        b.total_amount,
        b.paid_amount
    FROM bills b
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix function
SELECT * FROM fix_all_bill_statuses();

-- Create a function to get payment summary for a bill
CREATE OR REPLACE FUNCTION get_bill_payment_summary(bill_uuid UUID)
RETURNS TABLE(
    bill_id UUID,
    total_amount NUMERIC(10,2),
    paid_amount NUMERIC(10,2),
    remaining_amount NUMERIC(10,2),
    status TEXT,
    payment_count BIGINT,
    last_payment_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bill_id,
        b.total_amount,
        COALESCE(SUM(ph.amount), 0) as paid_amount,
        b.total_amount - COALESCE(SUM(ph.amount), 0) as remaining_amount,
        b.status::TEXT,
        COUNT(ph.id) as payment_count,
        MAX(ph.paid_at) as last_payment_date
    FROM bills b
    LEFT JOIN payment_history ph ON b.id = ph.bill_id
    WHERE b.id = bill_uuid
    GROUP BY b.id, b.total_amount, b.status;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_bill_payment_status() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_bill_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION get_bill_payment_summary(UUID) TO authenticated;

-- RLS policies already exist, skipping to avoid conflicts
-- Payment history and bills table policies are already configured

COMMENT ON FUNCTION update_bill_payment_status() IS 'Automatically updates bill status and paid amount when payment_history changes';
COMMENT ON FUNCTION fix_all_bill_statuses() IS 'Fixes all existing bill statuses and paid amounts';
COMMENT ON FUNCTION get_bill_payment_summary(UUID) IS 'Returns comprehensive payment summary for a bill';
