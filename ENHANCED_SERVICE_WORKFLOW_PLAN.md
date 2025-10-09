# Enhanced Service Request Workflow - Implementation Plan

## Overview
This plan outlines the implementation of an advanced service request workflow featuring:
- Auto-approval when available credit >= RM500
- QR code verification for service start/completion
- Department-specific routing and management
- Automated invoice generation
- Email and app notifications

- Restaurant kitchen single-scan completion flow
- SOS emergency video calls via LiveKit + FCM

## Workflow Diagram

```
Resident Request → Auto Check Credit → Admin Notification → Department Assignment
                                ↓
Staff QR Scan (Start) ← Department Login ← Auto Approval ← Credit Available
        ↓
Service In Progress
        ↓
Staff QR Scan (Complete) → Generate Draft Invoice → Admin Review → Send to Resident
```

## Phase 1: Database Schema Extensions

### 1.1 Profile Table Extensions
```typescript
// Extend src/types/database.ts
export interface Profile {
  // ... existing fields
  credit_limit?: number          // RM credit limit (default: 2000)
  current_balance?: number       // Current outstanding balance
  department?: string            // For staff: which department they belong to
  notification_preferences?: {
    email: boolean
    in_app: boolean
    push: boolean
  }
}
```

### 1.2 Enhanced Service Request
```typescript
export type ServiceRequestStatus =
  | 'pending'           // Initial submission
  | 'auto_approved'     // Approved by system (credit available)
  | 'manual_review'     // Requires admin review (insufficient credit)
  | 'assigned'          // Assigned to department
  | 'processing'        // Department acknowledged
  | 'in_progress'       // Staff started service (QR scanned)
  | 'awaiting_completion' // Service ongoing
  | 'completed'         // Service finished (QR confirmed)
  | 'invoiced'          // Invoice generated
  | 'cancelled'

export interface ServiceRequest {
  // ... existing fields
  department_assigned?: string      // Which department handles this
  assigned_staff_id?: string        // Specific staff member
  estimated_cost?: number           // Cost estimate
  actual_cost?: number              // Final cost
  auto_approved?: boolean           // Was it auto-approved?
  approval_reason?: string          // Why approved/rejected
  start_qr_code?: string           // QR for starting service
  completion_qr_code?: string       // QR for completing service
  qr_start_scanned_at?: string     // When service started
  qr_completion_scanned_at?: string // When service completed
  invoice_id?: string              // Generated invoice reference
}
```

### 1.3 New Tables

```typescript
// Department Configuration
export interface Department {
  id: string
  name: string
  site_id: string
  service_types: ServiceRequestType[] // Which services they handle
  email_notifications: string[]       // Department email addresses
  manager_id?: string                 // Department manager
  is_active: boolean
  created_at: string
  updated_at: string
}

// QR Code Management
export interface ServiceQRCode {
  id: string
  service_request_id: string
  qr_type: 'start' | 'completion'
  qr_code: string                    // Unique QR code
  expires_at: string                 // Expiration time
  scanned_at?: string               // When scanned
  scanned_by?: string               // Staff who scanned
  is_used: boolean
  created_at: string
}

// Invoice Management
export interface ServiceInvoice {
  id: string
  service_request_id: string
  resident_id: string
  site_id: string
  amount: number
  tax_amount?: number
  total_amount: number
  description: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  created_by: string               // Admin who generated
  sent_at?: string
  due_date: string
  created_at: string
  updated_at: string
}

// Notification Log
export interface NotificationLog {
  id: string
  recipient_id: string
  recipient_type: 'admin' | 'staff' | 'resident'
  notification_type: 'email' | 'in_app' | 'push'
  subject: string
  message: string
  related_service_request_id?: string
  sent_at: string
  read_at?: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
}
```

## Phase 2: Enhanced Service Request API

### 2.1 Auto-Approval Logic
```typescript
// src/app/api/service-requests/route.ts
export async function POST(request: Request) {
  const serviceRequest = await request.json()

  // Check resident credit limit
  const resident = await getResidentProfile(serviceRequest.resident_id)
  const estimatedCost = await getServiceCost(serviceRequest.type)

  const availableCredit = (resident.credit_limit ?? 0) - (resident.current_balance ?? 0)
  const autoApprove = availableCredit >= 500

  if (autoApprove) {
    // Auto-approve and route to department
    const updatedRequest = await approveAndAssignToDepartment(serviceRequest)
    await sendDepartmentNotification(updatedRequest)
    await sendAdminNotification(updatedRequest, 'auto_approved')
  } else {
    // Send to admin for manual review
    await sendAdminNotification(serviceRequest, 'manual_review_required')
  }

  return NextResponse.json(updatedRequest)
}
```

### 2.2 QR Code Generation
```typescript
// src/app/api/service-requests/[id]/generate-qr/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { qr_type } = await request.json() // 'start' | 'completion'

  // Generate unique QR code
  const qrCode = generateSecureQRCode(params.id, qr_type)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const qrRecord = await supabase
    .from('service_qr_codes')
    .insert({
      service_request_id: params.id,
      qr_type,
      qr_code: qrCode,
      expires_at: expiresAt.toISOString(),
      is_used: false
    })

  return NextResponse.json({ qr_code: qrCode, expires_at: expiresAt })
}
```

### 2.3 QR Code Scanning
```typescript
// src/app/api/staff/scan-qr/route.ts
export async function POST(request: Request) {
  const { qr_code, staff_id } = await request.json()

  // Validate QR code
  const qrRecord = await validateQRCode(qr_code)
  if (!qrRecord) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
  }

  // Update service request status
  const newStatus = qrRecord.qr_type === 'start' ? 'in_progress' : 'completed'

  await updateServiceRequestStatus(qrRecord.service_request_id, newStatus, {
    scanned_by: staff_id,
    scanned_at: new Date().toISOString()
  })

  // If completion scan, trigger invoice generation
  if (qrRecord.qr_type === 'completion') {
    await generateDraftInvoice(qrRecord.service_request_id)
  }

  return NextResponse.json({ status: 'success', new_status: newStatus })
}
```

## Phase 3: Department Management Interface

### 3.1 Department Dashboard Component
```typescript
// src/components/department/DepartmentDashboard.tsx
export default function DepartmentDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])

  // Filter requests for this department only
  useEffect(() => {
    fetchDepartmentRequests(user.department)
  }, [user.department])

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    await updateRequestStatus(requestId, newStatus)
    // Refresh data
    fetchDepartmentRequests(user.department)
  }

  return (
    <div>
      <h1>Department: {user.department}</h1>

      {/* Pending Requests */}
      <Section title="Pending Assignment">
        {requests.filter(r => r.status === 'assigned').map(request => (
          <RequestCard
            key={request.id}
            request={request}
            onAccept={() => handleStatusUpdate(request.id, 'processing')}
          />
        ))}
      </Section>

      {/* In Progress */}
      <Section title="In Progress">
        {requests.filter(r => r.status === 'processing').map(request => (
          <RequestCard key={request.id} request={request} />
        ))}
      </Section>
    </div>
  )
}
```

### 3.2 Department Routes
```typescript
// src/app/department/page.tsx - New department interface
// src/app/department/requests/page.tsx - Request management
// src/app/department/staff/page.tsx - Staff assignment
```

## Phase 4: Mobile App Components

### 4.1 Resident QR Generation
```typescript
// src/components/mobile/resident/ServiceQRGenerator.tsx
export default function ServiceQRGenerator({ serviceRequestId }: { serviceRequestId: string }) {
  const [qrCode, setQrCode] = useState<string>('')
  const [qrType, setQrType] = useState<'start' | 'completion'>('start')

  const generateQR = async (type: 'start' | 'completion') => {
    const response = await fetch(`/api/service-requests/${serviceRequestId}/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_type: type })
    })

    const data = await response.json()
    setQrCode(data.qr_code)
  }

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => generateQR('start')}
          variant={qrType === 'start' ? 'default' : 'outline'}
        >
          Start Service QR
        </Button>
        <Button
          onClick={() => generateQR('completion')}
          variant={qrType === 'completion' ? 'default' : 'outline'}
        >
          Complete Service QR
        </Button>
      </div>

      {qrCode && (
        <div className="flex flex-col items-center">
          <QRCodeDisplay value={qrCode} />
          <p className="text-sm text-gray-600 mt-2">
            Show this QR code to the service staff
          </p>
        </div>
      )}
    </div>
  )
}
```

### 4.2 Staff QR Scanner
```typescript
// src/components/mobile/staff/QRScanner.tsx
export default function QRScanner() {
  const [scanning, setScanning] = useState(false)
  const { user } = useAuth()

  const handleScan = async (qrCode: string) => {
    setScanning(false)

    const response = await fetch('/api/staff/scan-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: qrCode, staff_id: user.id })
    })

    const result = await response.json()

    if (result.status === 'success') {
      toast.success(`Service ${result.new_status}`)
      // Navigate or update UI
    } else {
      toast.error('Invalid QR code')
    }
  }

  return (
    <div>
      {scanning ? (
        <QRCodeScanner
          onScan={handleScan}
          onCancel={() => setScanning(false)}
        />
      ) : (
        <Button onClick={() => setScanning(true)}>
          Scan Service QR Code
        </Button>
      )}
    </div>
  )
}
```

## Phase 5: Notification System

### 5.1 Email Notifications
```typescript
// src/lib/notifications/email.ts
export class EmailNotificationService {
  async sendAdminNotification(serviceRequest: ServiceRequest, type: string) {
    const admins = await getAdminUsers(serviceRequest.site_id)

    for (const admin of admins) {
      if (admin.notification_preferences?.email) {
        await sendEmail({
          to: admin.email,
          subject: `Service Request ${type}`,
          template: 'service-request-notification',
          data: { serviceRequest, admin }
        })
      }
    }
  }

  async sendDepartmentNotification(serviceRequest: ServiceRequest) {
    const department = await getDepartment(serviceRequest.department_assigned)

    for (const email of department.email_notifications) {
      await sendEmail({
        to: email,
        subject: 'New Service Request Assigned',
        template: 'department-assignment',
        data: { serviceRequest, department }
      })
    }
  }
}
```

### 5.2 Real-time Updates
```typescript
// src/hooks/useServiceRequestUpdates.ts
export function useServiceRequestUpdates(serviceRequestId: string) {
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`service_request_${serviceRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `id=eq.${serviceRequestId}`
        },
        (payload) => {
          setRequest(payload.new as ServiceRequest)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [serviceRequestId])

  return request
}
```

## Phase 6: Invoice Generation

### 6.1 Automated Invoice Creation
```typescript
// src/lib/invoicing/generator.ts
export async function generateDraftInvoice(serviceRequestId: string) {
  const serviceRequest = await getServiceRequest(serviceRequestId)
  const resident = await getResident(serviceRequest.resident_id)
  const serviceCost = await calculateServiceCost(serviceRequest)

  const invoice: ServiceInvoice = {
    id: generateUUID(),
    service_request_id: serviceRequestId,
    resident_id: serviceRequest.resident_id,
    site_id: serviceRequest.site_id,
    amount: serviceCost.base_cost,
    tax_amount: serviceCost.tax,
    total_amount: serviceCost.total,
    description: `${serviceRequest.type} service - ${serviceRequest.title}`,
    status: 'draft',
    created_by: 'system',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  await supabase.from('service_invoices').insert(invoice)

  // Notify admin for review
  await notifyAdminInvoiceReady(invoice)

  return invoice
}
```

## Phase 7: Credit Limit Management

### 7.1 Admin Credit Limit Interface
```typescript
// src/components/admin/CreditLimitManager.tsx
export default function CreditLimitManager() {
  const [residents, setResidents] = useState<Profile[]>([])

  const updateCreditLimit = async (residentId: string, newLimit: number) => {
    await supabase
      .from('profiles')
      .update({ credit_limit: newLimit })
      .eq('id', residentId)

    // Refresh data
    fetchResidents()
  }

  return (
    <div>
      <h2>Resident Credit Limits</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resident</TableHead>
            <TableHead>Current Balance</TableHead>
            <TableHead>Credit Limit</TableHead>
            <TableHead>Available Credit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.map(resident => (
            <TableRow key={resident.id}>
              <TableCell>{resident.first_name} {resident.last_name}</TableCell>
              <TableCell>RM {resident.current_balance || 0}</TableCell>
              <TableCell>
                <EditableField
                  value={resident.credit_limit || 2000}
                  onSave={(value) => updateCreditLimit(resident.id, value)}
                />
              </TableCell>
              <TableCell>
                RM {(resident.credit_limit || 2000) - (resident.current_balance || 0)}
              </TableCell>
              <TableCell>
                <Button size="sm">View History</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

## Implementation Timeline

### Week 1-2: Database & API Foundation
- [ ] Extend database schema
- [ ] Implement auto-approval logic
- [ ] Create QR code generation system
- [ ] Basic notification system

### Week 3-4: Department Management
- [ ] Department dashboard interface
- [ ] Staff assignment system
- [ ] Department-specific routing
- [ ] Status update workflows

### Week 5-6: Mobile Components
- [ ] Resident QR generation
- [ ] Staff QR scanner
- [ ] Real-time status updates
- [ ] Mobile-optimized interfaces

### Week 7-8: Invoice & Credit Management
- [ ] Automated invoice generation
- [ ] Credit limit management
- [ ] Invoice review workflow
- [ ] Payment tracking integration

### Week 9-10: Testing & Refinement
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Security validation
- [ ] User acceptance testing

## Technical Considerations

### Security
- QR codes should have expiration times (24 hours)
- Secure QR code generation with unique tokens
- Staff authentication for QR scanning
- Audit trail for all status changes

### Performance
- Database indexing for service requests and QR codes
- Caching for frequently accessed data
- Optimized real-time subscriptions
- Batch processing for notifications

### Scalability
- Department-based data isolation
- Configurable credit limits per site
- Flexible service type management
- Multi-tenant architecture support

## Integration Points

1. **Existing Service Request System**: Extend current workflow
2. **Supabase Real-time**: For instant updates
3. **Email Service**: Integration with existing notification system
4. **Mobile App Architecture**: Prepare for native apps
5. **Payment System**: Integration with existing billing

This plan provides a comprehensive roadmap for implementing the enhanced service request workflow while maintaining compatibility with the existing Eden Living system.