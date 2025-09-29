-- Enable RLS on inventory tables
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_categories
CREATE POLICY "inventory_categories_select" ON inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_categories_insert" ON inventory_categories FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist'))
);
CREATE POLICY "inventory_categories_update" ON inventory_categories FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist'))
);

-- Policies for suppliers
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);

-- Policies for inventory_items
CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist'))
);
CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist'))
);

-- Policies for inventory_stock
CREATE POLICY "inventory_stock_select" ON inventory_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_stock_insert" ON inventory_stock FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'nurse'))
);
CREATE POLICY "inventory_stock_update" ON inventory_stock FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'nurse'))
);

-- Policies for inventory_transactions
CREATE POLICY "inventory_transactions_select" ON inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_transactions_insert" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'nurse', 'doctor'))
);

-- Policies for purchase_orders
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);

-- Policies for purchase_order_items
CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);
CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('superadmin', 'pharmacist', 'accountant'))
);
