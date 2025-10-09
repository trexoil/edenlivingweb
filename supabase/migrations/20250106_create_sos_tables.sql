-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL, -- email or phone
  role VARCHAR(100), -- e.g., 'Emergency Coordinator', 'Security', 'Medical Staff'
  priority INTEGER DEFAULT 1, -- 1 = highest priority
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sos_calls table
CREATE TABLE IF NOT EXISTS sos_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  room_name VARCHAR(255) NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_site_id ON emergency_contacts(site_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_is_active ON emergency_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_sos_calls_resident_id ON sos_calls(resident_id);
CREATE INDEX IF NOT EXISTS idx_sos_calls_site_id ON sos_calls(site_id);
CREATE INDEX IF NOT EXISTS idx_sos_calls_status ON sos_calls(status);
CREATE INDEX IF NOT EXISTS idx_sos_calls_room_name ON sos_calls(room_name);

-- Enable Row Level Security
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_contacts

-- Admins and site admins can view emergency contacts for their site
CREATE POLICY "Admins can view emergency contacts"
ON emergency_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin')
      OR (profiles.role = 'site_admin' AND profiles.site_id = emergency_contacts.site_id)
      OR (profiles.role = 'staff' AND profiles.site_id = emergency_contacts.site_id)
    )
  )
);

-- Only admins and site admins can manage emergency contacts
CREATE POLICY "Admins can manage emergency contacts"
ON emergency_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin')
      OR (profiles.role = 'site_admin' AND profiles.site_id = emergency_contacts.site_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin')
      OR (profiles.role = 'site_admin' AND profiles.site_id = emergency_contacts.site_id)
    )
  )
);

-- RLS Policies for sos_calls

-- Residents can view their own SOS calls
CREATE POLICY "Residents can view their own SOS calls"
ON sos_calls
FOR SELECT
TO authenticated
USING (
  resident_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin', 'staff')
      OR (profiles.role = 'site_admin' AND profiles.site_id = sos_calls.site_id)
    )
  )
);

-- Residents can create SOS calls
CREATE POLICY "Residents can create SOS calls"
ON sos_calls
FOR INSERT
TO authenticated
WITH CHECK (
  resident_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'resident'
  )
);

-- Residents and staff can update SOS calls (to end them)
CREATE POLICY "Users can update SOS calls"
ON sos_calls
FOR UPDATE
TO authenticated
USING (
  resident_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin', 'staff')
      OR (profiles.role = 'site_admin' AND profiles.site_id = sos_calls.site_id)
    )
  )
)
WITH CHECK (
  resident_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'superadmin', 'staff')
      OR (profiles.role = 'site_admin' AND profiles.site_id = sos_calls.site_id)
    )
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_calls_updated_at
  BEFORE UPDATE ON sos_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

