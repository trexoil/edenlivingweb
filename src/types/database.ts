export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'resident' | 'admin' | 'staff' | 'site_admin' | 'superadmin'
  unit_number?: string
  site_id?: string
  phone_number?: string
  emergency_contact?: string
  dietary_preferences?: string
  credit_limit?: number          // RM credit limit (default: 2000)
  current_balance?: number       // Current outstanding balance
  department?: string            // For staff: which department they belong to
  notification_preferences?: {
    email: boolean
    in_app: boolean
    push: boolean
  }
  created_at: string
  updated_at: string
}

export type ServiceRequestType = 
  | 'meal'
  | 'laundry'
  | 'housekeeping'
  | 'transportation'
  | 'maintenance'
  | 'home_care'
  | 'medical'

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
  id: string
  resident_id: string
  type: ServiceRequestType
  title: string
  description: string
  status: ServiceRequestStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduled_date?: string
  completed_date?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  
  // Enhanced workflow fields
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
  
  // Type-specific fields
  meal_preferences?: string
  laundry_instructions?: string
  housekeeping_details?: string
  transportation_details?: string
  maintenance_location?: string
  care_requirements?: string
  medical_notes?: string
}

export interface Announcement {
  id: string
  site_id: string
  title: string
  content: string
  author_id: string
  priority: 'normal' | 'important' | 'urgent'
  target_audience: 'all' | 'residents' | 'staff'
  is_published: boolean
  published_at?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  site_id: string
  title: string
  description: string
  event_date: string
  event_time: string
  location: string
  organizer_id: string
  max_attendees?: number
  created_at: string
  updated_at: string
}

export interface EventRegistration {
  id: string
  event_id: string
  resident_id: string
  status: 'registered' | 'attended' | 'cancelled'
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  subject: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'alert' | 'reminder'
  is_read: boolean
  created_at: string
}

export interface BillingRecord {
  id: string
  resident_id: string
  description: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  payment_date?: string
  created_at: string
}

export interface CommunityGroup {
  id: string
  name: string
  description: string
  category: 'hobby' | 'support' | 'social' | 'educational'
  created_by: string
  created_at: string
}

export interface GroupMembership {
  id: string
  group_id: string
  resident_id: string
  role: 'member' | 'moderator'
  joined_at: string
}

export interface VehicleRegistration {
  id: string
  resident_id: string
  plate_number: string
  vehicle_type: string
  make: string
  model: string
  color: string
  is_approved: boolean
  created_at: string
}

// Restaurant module types
export interface Menu {
  id: string
  site_id?: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  menu_id: string
  name: string
  description?: string
  price: number
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  resident_id: string
  site_id?: string
  status: 'submitted' | 'processing' | 'ready' | 'delivering' | 'completed' | 'cancelled'
  department_assigned: string
  total: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  item_id: string
  qty: number
  price: number
  created_at: string
}

// Push notifications
export interface PushToken {
  id: string
  token: string
  user_id: string
  department?: string
  platform: 'web' | 'android' | 'ios'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VisitorPass {
  id: string
  resident_id: string
  visitor_name: string
  visitor_phone: string
  visit_date: string
  visit_purpose: string
  vehicle_plate?: string
  qr_code: string
  status: 'pending' | 'approved' | 'used' | 'expired'
  created_at: string
}

export type HelpDeskTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type HelpDeskTicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type HelpDeskTicketCategory = 'maintenance' | 'technical' | 'general' | 'complaint' | 'suggestion'

export interface HelpDeskTicket {
  id: string
  resident_id: string
  site_id: string
  title: string
  description: string
  category: HelpDeskTicketCategory
  priority: HelpDeskTicketPriority
  status: HelpDeskTicketStatus
  assigned_to?: string
  created_at: string
  updated_at: string
  resolved_at?: string

  // Joined data (when fetched with relations)
  resident?: Profile
  assigned_staff?: Profile
}

export interface HelpDeskResponse {
  id: string
  ticket_id: string
  responder_id: string
  message: string
  is_internal: boolean
  created_at: string

  // Joined data
  responder?: Profile
}

// Enhanced workflow interfaces
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
