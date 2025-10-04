-- UNIFORM BILLING ACCESS FOR ALL AUTHORIZED USERS
-- This script updates RLS policies so that all authorized users can see all bills
-- Doctors, Nurses, Receptionists, Admins can all view all bills regardless of who created them

-- Drop existing policies
DROP POLICY IF EXISTS "bills_select_policy" ON bills;
DROP POLICY IF EXISTS "bills_insert_policy" ON bills;
DROP POLICY IF EXISTS "bills_update_policy" ON bills;
DROP POLICY IF EXISTS "bill_items_policy" ON bill_items;
DROP POLICY IF EXISTS "payment_history_policy" ON payment_history;

-- Create uniform bills select policy
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
            -- Doctors can see all bills (uniform access)
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'doctor'
            ) OR
            -- Nurses can see all bills (uniform access)
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'nurse'
            ) OR
            -- Accountants can see all bills
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() AND role = 'accountant'
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

-- Create bills insert policy
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

-- Create bills update policy
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

-- Create bill items policy
CREATE POLICY "bill_items_policy" ON bill_items
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = bill_items.bill_id
        )
    );

-- Create payment history policy
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
SELECT '🎉 UNIFORM BILLING ACCESS ENABLED! 🎉' as status;
SELECT '✅ Doctors can see all bills' as doctor_access;
SELECT '✅ Nurses can see all bills' as nurse_access;
SELECT '✅ Receptionists can see all bills' as receptionist_access;
SELECT '✅ Admins can see all bills' as admin_access;
SELECT '✅ Accountants can see all bills' as accountant_access;
