-- Enhanced Billing System
-- Based on comprehensive billing module specification

-- Drop existing simple billing tables if they exist
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Create enhanced bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'partial', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'insurance')),
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bill_items table for detailed billing
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL 
        CHECK (item_type IN ('appointment', 'lab_test', 'procedure', 'medication')),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_history table for tracking payments
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL 
        CHECK (payment_method IN ('cash', 'card', 'insurance')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_type ON bill_items(item_type);
CREATE INDEX IF NOT EXISTS idx_payment_history_bill_id ON payment_history(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paid_by ON payment_history(paid_by);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS policies with role-based access
-- Bills policies
CREATE POLICY "bills_select_policy" ON bills
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins can see all bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'admin'
            ) OR
            -- Receptionists can see all bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'receptionist'
            ) OR
            -- Doctors can see bills they created or for their patients
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'doctor'
                ) AND (
                    created_by = auth.uid() OR
                    EXISTS (
                        SELECT 1 FROM appointments a
                        WHERE a.patient_id = bills.patient_id 
                        AND a.provider_id = auth.uid()
                    )
                )
            ) OR
            -- Nurses can see bills they created
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'nurse'
                ) AND created_by = auth.uid()
            ) OR
            -- Patients can see their own bills
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'patient'
                ) AND patient_id = auth.uid()
            )
        )
    );

CREATE POLICY "bills_insert_policy" ON bills
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Admins, receptionists, doctors, and nurses can create bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'receptionist', 'doctor', 'nurse')
            )
        )
    );

CREATE POLICY "bills_update_policy" ON bills
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins can update all bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'admin'
            ) OR
            -- Receptionists can update bills before payment
            (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'receptionist'
                ) AND status = 'pending'
            )
        )
    );

-- Bill items policies
CREATE POLICY "bill_items_policy" ON bill_items
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = bill_items.bill_id
        )
    );

-- Payment history policies
CREATE POLICY "payment_history_policy" ON payment_history
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins and receptionists can manage all payments
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'receptionist')
            ) OR
            -- Users can see payments they made
            paid_by = auth.uid()
        )
    );

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
