-- Ensure staff and site admins can manage kitchen orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Select access
DROP POLICY IF EXISTS "Staff kitchen can view site orders" ON orders;
CREATE POLICY "Staff kitchen can view site orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- Allow admins to view all orders
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
  OR
  -- Allow site admins to view orders for their site
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'site_admin'
      AND (
        profiles.site_id IS NULL
        OR orders.site_id IS NULL
        OR profiles.site_id = orders.site_id
      )
  )
  OR
  -- Allow department staff (e.g. kitchen) to view orders for their department and site
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
      AND lower(COALESCE(profiles.department, '')) = lower(COALESCE(orders.department_assigned, ''))
      AND (
        profiles.site_id IS NULL
        OR orders.site_id IS NULL
        OR profiles.site_id = orders.site_id
      )
  )
  OR
  -- Always allow the resident who owns the order to see it
  orders.resident_id = auth.uid()
);

-- Update access for status changes
DROP POLICY IF EXISTS "Staff kitchen can update site orders" ON orders;
CREATE POLICY "Staff kitchen can update site orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  -- Allow admins to update all orders
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
  OR
  -- Allow site admins to update orders for their site
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'site_admin'
      AND (
        profiles.site_id IS NULL
        OR orders.site_id IS NULL
        OR profiles.site_id = orders.site_id
      )
  )
  OR
  -- Allow department staff to update orders for their department and site
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
      AND lower(COALESCE(profiles.department, '')) = lower(COALESCE(orders.department_assigned, ''))
      AND (
        profiles.site_id IS NULL
        OR orders.site_id IS NULL
        OR profiles.site_id = orders.site_id
      )
  )
)
WITH CHECK (
  -- Ensure resulting row still matches allowed criteria
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'site_admin'
        AND (
          profiles.site_id IS NULL
          OR orders.site_id IS NULL
          OR profiles.site_id = orders.site_id
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'staff'
        AND lower(COALESCE(profiles.department, '')) = lower(COALESCE(orders.department_assigned, ''))
        AND (
          profiles.site_id IS NULL
          OR orders.site_id IS NULL
          OR profiles.site_id = orders.site_id
        )
    )
  )
);
