-- Fix Accountant RLS Policies
-- This script adds accountant role to the billing RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "bills_select_policy" ON bills;
DROP POLICY IF EXISTS "bills_insert_policy" ON bills;
DROP POLICY IF EXISTS "bills_update_policy" ON bills;
DROP POLICY IF EXISTS "bill_items_policy" ON bill_items;
DROP POLICY IF EXISTS "payment_history_policy" ON payment_history;

-- Create updated bills select policy with accountant role
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
            -- Accountants can see all bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'accountant'
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

-- Create updated bills insert policy
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

-- Create updated bills update policy
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

-- Create updated bill items policy
CREATE POLICY "bill_items_policy" ON bill_items
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = bill_items.bill_id
        )
    );

-- Create updated payment history policy
CREATE POLICY "payment_history_policy" ON payment_history
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND (
            -- Admins, receptionists, and accountants can manage all payments
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'receptionist', 'accountant')
            ) OR
            -- Users can see payments they made
            paid_by = auth.uid()
        )
    );

-- Success message
SELECT 'Accountant RLS policies updated successfully!' as status;
