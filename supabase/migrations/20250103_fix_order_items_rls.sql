-- Fix RLS policies for order_items table
-- This allows residents to create order items when creating orders

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON order_items;

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to insert order items for their own orders
CREATE POLICY "Users can insert their own order items"
ON order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.resident_id = auth.uid()
  )
);

-- Policy 2: Allow users to view order items for their own orders
CREATE POLICY "Users can view their own order items"
ON order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.resident_id = auth.uid()
  )
);

-- Policy 3: Allow staff to manage all order items
CREATE POLICY "Staff can manage order items"
ON order_items
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('staff', 'site_admin', 'superadmin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('staff', 'site_admin', 'superadmin', 'admin')
  )
);

