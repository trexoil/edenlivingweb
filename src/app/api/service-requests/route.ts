import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ServiceRequest } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('Service requests API called')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { user: user?.id, error: authError?.message })

    if (authError || !user) {
      console.log('Authentication failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('Profile check:', { profile: profile?.role, error: profileError?.message })

    if (profileError || !profile) {
      console.log('Profile not found:', profileError?.message)
      return NextResponse.json({ error: 'Profile not found', details: profileError?.message }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')

    // Build query based on user role
    let query = supabase
      .from('service_requests')
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!service_requests_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (profile.role === 'resident') {
      query = query.eq('resident_id', user.id)
    } else if (profile.role === 'site_admin' || profile.role === 'admin' || profile.role === 'staff') {
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    }
    // Superadmin can see all service requests (no additional filtering)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

    console.log('Executing query for role:', profile.role, 'site_id:', profile.site_id)

    const { data: requests, error: requestsError } = await query

    console.log('Query result:', {
      requestsCount: requests?.length || 0,
      error: requestsError?.message,
      requests: requests?.slice(0, 2) // Log first 2 requests for debugging
    })

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only residents can create service requests for themselves
    if (profile.role !== 'resident') {
      return NextResponse.json({ error: 'Only residents can create service requests' }, { status: 403 })
    }

    if (!profile.site_id) {
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

    // Create service request
    const { data: serviceRequest, error: createError } = await supabase
      .from('service_requests')
      .insert([{
        resident_id: user.id,
        site_id: profile.site_id,
        type,
        title,
        description,
        priority,
        status: 'pending',
        scheduled_date,
        meal_preferences,
        laundry_instructions,
        housekeeping_details,
        transportation_details,
        maintenance_location,
        care_requirements,
        medical_notes
      }])
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (createError) {
      console.error('Error creating service request:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Create notification for site admins
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: user.id, // This will be updated to notify admins in a future enhancement
        title: 'New Service Request',
        message: `New ${type} request: ${title}`,
        type: 'info'
      }])

    if (notificationError) {
      console.warn('Failed to create notification:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      request: serviceRequest
    })

  } catch (error) {
    console.error('Create service request API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
