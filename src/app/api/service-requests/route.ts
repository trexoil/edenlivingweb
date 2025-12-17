import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ServiceRequest, Department } from '@/types/database'
import { EmailNotificationService } from '@/lib/notifications/email'
import { estimateServiceCost } from '@/lib/invoicing/generator'
import { sendPushToTokens, getDepartmentTokens } from '@/lib/notifications/push-server'
import { v4 as uuidv4 } from 'uuid'

const emailService = new EmailNotificationService()
const AUTO_APPROVE_THRESHOLD = 500 // RM 500 available credit

// Department mapping for service types (lowercase to match staff profile department field)
const SERVICE_DEPARTMENT_MAPPING = {
  meal: 'kitchen',
  laundry: 'housekeeping',
  housekeeping: 'housekeeping',
  transportation: 'transportation',
  maintenance: 'maintenance',
  home_care: 'medical',
  medical: 'medical'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const department = searchParams.get('department')

    // Build query based on user role
    let query = supabase
      .from('service_requests')
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!service_requests_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    // Debug logging
    console.log('Service requests GET - User:', user.id, 'Role:', profile.role, 'Department:', profile.department, 'Site:', profile.site_id)

    // Apply role-based filtering
    // Apply role-based filtering
    if (profile.role === 'resident') {
      query = query.eq('resident_id', user.id)
    } else if (profile.role === 'staff') {
      // Staff can only see requests assigned to their department
      if (profile.department) {
        console.log('Staff filtering by department:', profile.department)
        query = query.ilike('department_assigned', profile.department)
      } else {
        // Fallback for staff with no department - show nothing
        console.warn('Staff user has no department assigned:', user.id)
        // Return empty result immediately to avoid executing query
        return NextResponse.json({ requests: [] })
      }

      // Also ensure they only see their site
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    } else if (profile.role === 'site_admin' || profile.role === 'admin') {
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    }
    // Superadmin can see all service requests (no additional filtering)

    // Apply filters
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)
    if (priority) query = query.eq('priority', priority)
    if (department) {
      console.log('Additional department filter:', department)
      query = query.ilike('department_assigned', department)
    }

    const { data: requests, error: requestsError } = await query

    if (requestsError) {
      console.error('Error fetching service requests:', requestsError)
      return NextResponse.json({
        error: 'Failed to fetch service requests',
        details: requestsError.message
      }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })

  } catch (error) {
    console.error('Get service requests API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get resident profile (with credit limit info)
    const { data: resident, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !resident) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only residents can create service requests for themselves
    if (resident.role !== 'resident') {
      return NextResponse.json({ error: 'Only residents can create service requests' }, { status: 403 })
    }

    if (!resident.site_id) {
      return NextResponse.json({ error: 'User must be assigned to a site' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const {
      type,
      title,
      description,
      priority = 'medium',
      scheduled_date,
      meal_preferences,
      laundry_instructions,
      housekeeping_details,
      transportation_details,
      maintenance_location,
      care_requirements,
      medical_notes
    } = body

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate type and priority
    const validTypes = ['meal', 'laundry', 'housekeeping', 'transportation', 'maintenance', 'home_care', 'medical']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Estimate service cost
    const estimatedCost = estimateServiceCost(type)

    // Check credit limit for auto-approval (available credit ≥ RM500)
    const creditLimit = resident.credit_limit ?? 0
    const currentBalance = resident.current_balance ?? 0
    const availableCredit = creditLimit - currentBalance

    const autoApprove = availableCredit >= AUTO_APPROVE_THRESHOLD

    // Determine department assignment
    const departmentName = SERVICE_DEPARTMENT_MAPPING[type as keyof typeof SERVICE_DEPARTMENT_MAPPING]

    // Determine initial status
    let initialStatus = 'pending'
    if (autoApprove) {
      initialStatus = 'auto_approved'
    } else {
      initialStatus = 'manual_review'
    }

    // Create service request
    const serviceRequestData = {
      id: uuidv4(),
      resident_id: user.id,
      site_id: resident.site_id,
      type,
      title,
      description,
      priority,
      status: initialStatus,
      scheduled_date,
      estimated_cost: estimatedCost,
      department_assigned: departmentName,
      auto_approved: autoApprove,
      approval_reason: autoApprove
        ? `Auto-approved: Available credit RM${availableCredit.toFixed(2)} >= Service cost RM${estimatedCost.toFixed(2)}`
        : `Manual review required: Available credit RM${availableCredit.toFixed(2)} < Service cost RM${estimatedCost.toFixed(2)}`,
      meal_preferences,
      laundry_instructions,
      housekeeping_details,
      transportation_details,
      maintenance_location,
      care_requirements,
      medical_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: serviceRequest, error: createError } = await supabase
      .from('service_requests')
      .insert([serviceRequestData])
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (createError) {
      console.error('Error creating service request:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Handle post-creation workflow
    if (autoApprove) {
      // Auto-approved: notify admin and assign to department
      await handleAutoApproval(serviceRequest, resident)

      // Send push notification to department
      try {
        const tokens = await getDepartmentTokens(supabase as any, departmentName)
        if (tokens.length > 0) {
          await sendPushToTokens(
            tokens,
            {
              title: 'New Service Request',
              body: `${serviceRequest.type}: ${serviceRequest.title}`
            },
            { type: 'service_request_assigned', request_id: serviceRequest.id }
          )
        }
      } catch (pushError) {
        console.warn('Push notification failed:', pushError)
      }
    } else {
      // Manual review required: notify admin only
      await handleManualReview(serviceRequest, resident)

      // Send push notification to admins
      try {
        const adminTokens = await getDepartmentTokens(supabase as any, 'admin')
        if (adminTokens.length > 0) {
          await sendPushToTokens(
            adminTokens,
            {
              title: 'Manual Review Required',
              body: `Service request needs approval: ${serviceRequest.title}`
            },
            { type: 'manual_review_required', request_id: serviceRequest.id }
          )
        }
      } catch (pushError) {
        console.warn('Push notification failed:', pushError)
      }
    }

    console.log(`Service request ${serviceRequest.id} created with status: ${initialStatus}`)

    return NextResponse.json({
      success: true,
      request: serviceRequest,
      auto_approved: autoApprove,
      estimated_cost: estimatedCost,
      available_credit: availableCredit
    })

  } catch (error) {
    console.error('Create service request API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Handle auto-approved service request workflow
 */
async function handleAutoApproval(serviceRequest: any, resident: any) {
  const supabase = await createClient()

  try {
    // Get admin users for notifications
    const { data: admins } = await supabase
      .from('profiles')
      .select('*')
      .eq('site_id', resident.site_id)
      .in('role', ['admin', 'site_admin', 'superadmin'])

    // Get department info
    const { data: department } = await supabase
      .from('departments')
      .select('*')
      .eq('site_id', resident.site_id)
      .eq('name', serviceRequest.department_assigned)
      .single()

    // Send notifications
    if (admins && admins.length > 0) {
      await emailService.sendAdminNotification(serviceRequest, 'auto_approved', admins)
    }

    if (department) {
      await emailService.sendDepartmentNotification(serviceRequest, department, resident)
    }

    // Update service request to 'assigned' status for department processing
    await supabase
      .from('service_requests')
      .update({
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceRequest.id)

  } catch (error) {
    console.error('Error in auto-approval workflow:', error)
  }
}

/**
 * Handle manual review service request workflow
 */
async function handleManualReview(serviceRequest: any, resident: any) {
  const supabase = await createClient()

  try {
    // Get admin users for notifications
    const { data: admins } = await supabase
      .from('profiles')
      .select('*')
      .eq('site_id', resident.site_id)
      .in('role', ['admin', 'site_admin', 'superadmin'])

    // Send notification to admins for manual review
    if (admins && admins.length > 0) {
      await emailService.sendAdminNotification(serviceRequest, 'manual_review_required', admins)
    }

  } catch (error) {
    console.error('Error in manual review workflow:', error)
  }
}
