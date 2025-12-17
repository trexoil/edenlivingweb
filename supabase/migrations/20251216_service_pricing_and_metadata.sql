-- Migration: Add service_pricing table and metadata column to service_requests
-- Date: 2025-12-16

-- Create service_pricing table for storing pricing by service type
CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, item_code)
);

-- Add index for faster lookups by service type
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON service_pricing(service_type, is_active);

-- Add metadata JSONB column to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Insert sample pricing data (site_id NULL = applies to all sites)
INSERT INTO service_pricing (site_id, service_type, item_code, item_name, description, unit, price) VALUES
-- Housekeeping
(NULL, 'housekeeping', 'HK_HOURLY', 'Hourly Cleaning', 'Basic cleaning service per hour', 'hour', 50.00),
(NULL, 'housekeeping', 'HK_HALF_DAY', 'Half Day (4 hours)', 'Comprehensive cleaning - 4 hours', 'session', 180.00),
(NULL, 'housekeeping', 'HK_FULL_DAY', 'Full Day (8 hours)', 'Deep cleaning - full day service', 'session', 320.00),
(NULL, 'housekeeping', 'HK_DEEP_CLEAN', 'Deep Cleaning Add-on', 'Extra thorough cleaning for specific areas', 'service', 100.00),

-- Transportation
(NULL, 'transportation', 'TR_CLINIC', 'Clinic/Hospital', 'Transport to medical facilities', 'trip', 30.00),
(NULL, 'transportation', 'TR_SHOPPING', 'Shopping Mall', 'Transport to shopping centers', 'trip', 25.00),
(NULL, 'transportation', 'TR_AIRPORT', 'Airport Transfer', 'Airport pickup or drop-off', 'trip', 80.00),
(NULL, 'transportation', 'TR_HOURLY', 'Hourly Rental', 'Vehicle with driver per hour', 'hour', 50.00),
(NULL, 'transportation', 'TR_CUSTOM', 'Custom Destination', 'Other destinations', 'trip', 40.00),

-- Laundry
(NULL, 'laundry', 'LN_WASH_FOLD', 'Wash & Fold', 'Standard washing and folding service', 'kg', 8.00),
(NULL, 'laundry', 'LN_DRY_CLEAN', 'Dry Cleaning', 'Professional dry cleaning per item', 'item', 15.00),
(NULL, 'laundry', 'LN_IRON', 'Ironing Only', 'Press and iron service', 'item', 5.00),
(NULL, 'laundry', 'LN_EXPRESS', 'Express Service', '50% surcharge for same-day service', 'multiplier', 1.50),

-- Maintenance
(NULL, 'maintenance', 'MT_PLUMBING', 'Plumbing Repair', 'Plumbing fixes and repairs', 'job', 80.00),
(NULL, 'maintenance', 'MT_ELECTRICAL', 'Electrical Work', 'Electrical repairs and installations', 'job', 100.00),
(NULL, 'maintenance', 'MT_AIRCON', 'Aircon Service', 'AC maintenance and repair', 'unit', 60.00),
(NULL, 'maintenance', 'MT_GENERAL', 'General Repair', 'General handyman services', 'hour', 40.00),

-- Home Care
(NULL, 'home_care', 'HC_COMPANION', 'Companion Care', 'Social companionship and assistance', 'hour', 35.00),
(NULL, 'home_care', 'HC_PERSONAL', 'Personal Care', 'Bathing, dressing, grooming assistance', 'hour', 45.00),
(NULL, 'home_care', 'HC_MEAL_ASSIST', 'Meal Assistance', 'Meal preparation and feeding help', 'session', 30.00),
(NULL, 'home_care', 'HC_MOBILITY', 'Mobility Support', 'Walking and transfer assistance', 'hour', 40.00),
(NULL, 'home_care', 'HC_NIGHT', 'Night Care', 'Overnight care and monitoring', 'night', 200.00),

-- Medical
(NULL, 'medical', 'MD_NURSE_VISIT', 'Nurse Visit', 'Registered nurse home visit', 'visit', 120.00),
-- Migration: Add service_pricing table and metadata column to service_requests
-- Date: 2025-12-16

-- Create service_pricing table for storing pricing by service type
CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, item_code)
);

-- Add index for faster lookups by service type
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON service_pricing(service_type, is_active);

-- Add metadata JSONB column to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Insert sample pricing data (site_id NULL = applies to all sites)
INSERT INTO service_pricing (site_id, service_type, item_code, item_name, description, unit, price) VALUES
-- Housekeeping
(NULL, 'housekeeping', 'HK_HOURLY', 'Hourly Cleaning', 'Basic cleaning service per hour', 'hour', 50.00),
(NULL, 'housekeeping', 'HK_HALF_DAY', 'Half Day (4 hours)', 'Comprehensive cleaning - 4 hours', 'session', 180.00),
(NULL, 'housekeeping', 'HK_FULL_DAY', 'Full Day (8 hours)', 'Deep cleaning - full day service', 'session', 320.00),
(NULL, 'housekeeping', 'HK_DEEP_CLEAN', 'Deep Cleaning Add-on', 'Extra thorough cleaning for specific areas', 'service', 100.00),

-- Transportation
(NULL, 'transportation', 'TR_CLINIC', 'Clinic/Hospital', 'Transport to medical facilities', 'trip', 30.00),
(NULL, 'transportation', 'TR_SHOPPING', 'Shopping Mall', 'Transport to shopping centers', 'trip', 25.00),
(NULL, 'transportation', 'TR_AIRPORT', 'Airport Transfer', 'Airport pickup or drop-off', 'trip', 80.00),
(NULL, 'transportation', 'TR_HOURLY', 'Hourly Rental', 'Vehicle with driver per hour', 'hour', 50.00),
(NULL, 'transportation', 'TR_CUSTOM', 'Custom Destination', 'Other destinations', 'trip', 40.00),

-- Laundry
(NULL, 'laundry', 'LN_WASH_FOLD', 'Wash & Fold', 'Standard washing and folding service', 'kg', 8.00),
(NULL, 'laundry', 'LN_DRY_CLEAN', 'Dry Cleaning', 'Professional dry cleaning per item', 'item', 15.00),
(NULL, 'laundry', 'LN_IRON', 'Ironing Only', 'Press and iron service', 'item', 5.00),
(NULL, 'laundry', 'LN_EXPRESS', 'Express Service', '50% surcharge for same-day service', 'multiplier', 1.50),

-- Maintenance
(NULL, 'maintenance', 'MT_PLUMBING', 'Plumbing Repair', 'Plumbing fixes and repairs', 'job', 80.00),
(NULL, 'maintenance', 'MT_ELECTRICAL', 'Electrical Work', 'Electrical repairs and installations', 'job', 100.00),
(NULL, 'maintenance', 'MT_AIRCON', 'Aircon Service', 'AC maintenance and repair', 'unit', 60.00),
(NULL, 'maintenance', 'MT_GENERAL', 'General Repair', 'General handyman services', 'hour', 40.00),

-- Home Care
(NULL, 'home_care', 'HC_COMPANION', 'Companion Care', 'Social companionship and assistance', 'hour', 35.00),
(NULL, 'home_care', 'HC_PERSONAL', 'Personal Care', 'Bathing, dressing, grooming assistance', 'hour', 45.00),
(NULL, 'home_care', 'HC_MEAL_ASSIST', 'Meal Assistance', 'Meal preparation and feeding help', 'session', 30.00),
(NULL, 'home_care', 'HC_MOBILITY', 'Mobility Support', 'Walking and transfer assistance', 'hour', 40.00),
(NULL, 'home_care', 'HC_NIGHT', 'Night Care', 'Overnight care and monitoring', 'night', 200.00),

-- Medical
(NULL, 'medical', 'MD_NURSE_VISIT', 'Nurse Visit', 'Registered nurse home visit', 'visit', 120.00),
(NULL, 'medical', 'MD_PHYSIO', 'Physiotherapy', 'Physical therapy session', 'session', 100.00),
(NULL, 'medical', 'MD_CHECKUP', 'Health Checkup', 'Basic health assessment', 'visit', 80.00),
(NULL, 'medical', 'MD_MEDICATION', 'Medication Management', 'Medicine organization and reminders', 'week', 50.00),
(NULL, 'medical', 'MD_WOUND_CARE', 'Wound Care', 'Wound dressing and care', 'visit', 60.00)
ON CONFLICT (site_id, item_code) DO NOTHING;

-- Enable RLS on service_pricing
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read pricing
DROP POLICY IF EXISTS "Anyone can read active pricing" ON service_pricing;
CREATE POLICY "Anyone can read active pricing" ON service_pricing
  FOR SELECT USING (is_active = true);

-- Only admins can modify pricing
DROP POLICY IF EXISTS "Admins can manage pricing" ON service_pricing;
CREATE POLICY "Admins can manage pricing" ON service_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'site_admin', 'superadmin')
    )
  );


-- Backfill existing service requests with correct department assignments
UPDATE service_requests SET department_assigned = 'housekeeping' WHERE type = 'housekeeping' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'transportation' WHERE type = 'transportation' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'housekeeping' WHERE type = 'laundry' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'kitchen' WHERE type = 'meal' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'maintenance' WHERE type = 'maintenance' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'medical' WHERE type = 'home_care' AND department_assigned IS NULL;
UPDATE service_requests SET department_assigned = 'medical' WHERE type = 'medical' AND department_assigned IS NULL;
