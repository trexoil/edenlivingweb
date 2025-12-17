-- Migration: Update service_requests status check constraint
-- This adds new status values to support the enhanced workflow

-- Drop the old constraint
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Add new constraint with all status values
ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending',
  'auto_approved',
  'manual_review',
  'assigned',
  'processing',
  'in_progress',
  'awaiting_completion',
  'completed',
  'invoiced',
  'cancelled'
));
