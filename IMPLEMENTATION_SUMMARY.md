# Enhanced Service Workflow - Quick Implementation Guide

## Key Features to Implement

### 1. **Auto-Approval System**
- Resident credit limit field (default RM2000)
- Automatic approval when credit is available
- Email notifications to admin and department

### 2. **QR Code Verification**
- Generate QR codes for service start/completion
- Staff app scans QR to update status
- 24-hour expiration for security

### 3. **Department Management**
- Department-specific dashboards
- Staff can only see their department's requests
- Status updates: assigned → processing → in_progress → completed

### 4. **Invoice Automation**
- Auto-generate draft invoices upon completion
- Admin review and approval workflow
- Integration with existing billing system

## Quick Start Implementation

### Step 1: Database Schema Updates
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 2000.00;
ALTER TABLE profiles ADD COLUMN current_balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN department VARCHAR(50);

-- Extend service_requests table
ALTER TABLE service_requests ADD COLUMN department_assigned VARCHAR(50);
ALTER TABLE service_requests ADD COLUMN assigned_staff_id UUID;
ALTER TABLE service_requests ADD COLUMN estimated_cost DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN actual_cost DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN qr_start_scanned_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN qr_completion_scanned_at TIMESTAMP;

-- Create new tables
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  site_id UUID REFERENCES sites(id),
  service_types TEXT[],
  email_notifications TEXT[],
  manager_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id),
  qr_type VARCHAR(20) CHECK (qr_type IN ('start', 'completion')),
  qr_code VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  scanned_at TIMESTAMP,
  scanned_by UUID REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id),
  resident_id UUID REFERENCES profiles(id),
  site_id UUID REFERENCES sites(id),
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Step 2: Update TypeScript Types
Update `src/types/database.ts` with new interfaces (see full plan for details).

### Step 3: Core API Endpoints
1. `POST /api/service-requests` - Enhanced with auto-approval
2. `POST /api/service-requests/[id]/generate-qr` - QR generation
3. `POST /api/staff/scan-qr` - QR scanning
4. `GET /api/department/requests` - Department requests
5. `POST /api/invoices/generate` - Invoice generation

### Step 4: Key Components to Create
1. **Department Dashboard** - `src/components/department/DepartmentDashboard.tsx`
2. **QR Generator** - `src/components/mobile/ServiceQRGenerator.tsx`
3. **QR Scanner** - `src/components/mobile/QRScanner.tsx`
4. **Credit Limit Manager** - `src/components/admin/CreditLimitManager.tsx`
5. **Auto Invoice Generator** - `src/lib/invoicing/generator.ts`

### Step 5: Notification System
1. Email notifications for admins and departments
2. Real-time updates using Supabase subscriptions
3. In-app notification components

## Testing Flow

### Demo Scenario:
1. **Resident** submits room service request
2. **System** checks credit limit (RM2000) - auto-approves
3. **Admin** receives email notification
4. **Department** receives assignment notification
5. **Staff** logs in, sees request, marks as "processing"
6. **Staff** goes to room, resident generates "start" QR
7. **Staff** scans QR - status becomes "in_progress"
8. **Service** is performed
9. **Resident** generates "completion" QR
10. **Staff** scans completion QR - status becomes "completed"
11. **System** auto-generates draft invoice
12. **Admin** reviews and sends invoice to resident

## Required Libraries

Add to `package.json`:
```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "react-qr-reader": "^3.0.0-beta-1",
    "nodemailer": "^6.9.7",
    "@supabase/realtime-js": "^2.8.4"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/nodemailer": "^6.4.14"
  }
}
```

## Configuration

Add to environment variables:
```env
# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# QR Code Security
QR_SECRET_KEY=your_secret_key_for_qr_generation

# Default Settings
DEFAULT_CREDIT_LIMIT=2000
QR_EXPIRATION_HOURS=24
```

## Next Steps

1. Start with Phase 1 (Database Schema)
2. Implement auto-approval logic
3. Build department dashboard
4. Create mobile QR components
5. Add notification system
6. Test end-to-end workflow

This implementation will create a complete service request workflow that meets Eden Living's requirements for automated approvals, QR verification, and departmental management.