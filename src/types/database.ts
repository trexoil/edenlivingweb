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
  | 'pending'
  | 'in_progress'
  | 'completed'
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
