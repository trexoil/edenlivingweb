import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
  try {
    console.log('Mobile service requests GET - Starting')
    const authHeader = request.headers.get('authorization')
    console.log('Mobile service requests GET - Auth header:', authHeader ? 'Present' : 'Missing')

    const supabase = await createMobileClientWithSession(request)
    const { searchParams } = new URL(request.url)

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Check if this is a demo token
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (accessToken && accessToken.startsWith('demo-token-')) {
      console.log('Demo token detected, returning mock service requests')

      // Return mock service requests for demo user
      const mockServiceRequests = [
        {
          id: 'demo-sr-1',
          type: 'maintenance',
          title: 'Leaky Faucet',
          description: 'The kitchen faucet is dripping constantly',
          priority: 'medium',
          status: 'pending',
          resident_id: 'demo-resident-id',
          site_id: '00000000-0000-0000-0000-000000000001',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          resident: {
            id: 'demo-resident-id',
            first_name: 'Demo',
            last_name: 'Resident',
            email: 'resident@eden.com',
            unit_number: '101'
          },
          assigned_staff: null
        },
        {
          id: 'demo-sr-2',
          type: 'housekeeping',
          title: 'Weekly Cleaning',
          description: 'Regular weekly housekeeping service',
          priority: 'low',
          status: 'completed',
          resident_id: 'demo-resident-id',
          site_id: '00000000-0000-0000-0000-000000000001',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          resident: {
            id: 'demo-resident-id',
            first_name: 'Demo',
            last_name: 'Resident',
            email: 'resident@eden.com',
            unit_number: '101'
          },
          assigned_staff: {
            id: 'demo-staff-id',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@eden.com'
          }
        }
      ]

      return NextResponse.json({
        success: true,
        data: mockServiceRequests,
        pagination: {
          page,
          limit,
          total: mockServiceRequests.length,
          totalPages: 1
        }
      })
    }

    // Get current user from session
    console.log('Mobile service requests GET - Getting user')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Mobile service requests GET - User:', user ? user.id : 'None', 'Error:', authError?.message || 'None')

    if (authError || !user) {
      console.log('Mobile service requests GET - Authentication failed')
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, site_id, department')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    let query = supabase
      .from('service_requests')
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!service_requests_assigned_to_fkey(id, first_name, last_name, email)
      `)

    // Filter based on user role
    if (profile.role === 'resident') {
      query = query.eq('resident_id', user.id)
    } else if (profile.role === 'staff') {
      // Staff can only see requests for their department
      if (profile.department) {
        query = query.ilike('department_assigned', profile.department)
      } else {
        // Staff without department should see nothing or get an error
        console.warn('Staff user has no department assigned', user.id)
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 }
        })
      }
      // Also filter by site just in case
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    } else if (profile.role === 'site_admin') {
      // Site admin can see requests for their site
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    }
    // Superadmin can see all requests (no additional filter)

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Get paginated data
    const { data: serviceRequests, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serviceRequests || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Mobile service requests GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


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

export async function POST(request: NextRequest) {
  try {
    console.log('Mobile service requests POST - Starting')
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const requestData = await request.json()
    console.log('Mobile service requests POST - Request data:', requestData)

    // Check if this is a demo token
    if (accessToken && accessToken.startsWith('demo-token-')) {
      console.log('Demo token detected, creating mock service request')

      // Create mock service request for demo user
      const mockServiceRequest = {
        id: 'demo-sr-' + Date.now(),
        type: requestData.type,
        title: requestData.title,
        description: requestData.description,
        priority: requestData.priority || 'medium',
        status: 'pending',
        resident_id: 'demo-resident-id',
        site_id: '00000000-0000-0000-0000-000000000001',
        scheduled_date: requestData.scheduled_date,
        metadata: requestData.metadata || {},
        estimated_cost: requestData.estimated_cost || 0,
        department_assigned: SERVICE_DEPARTMENT_MAPPING[requestData.type as keyof typeof SERVICE_DEPARTMENT_MAPPING],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resident: {
          id: 'demo-resident-id',
          first_name: 'Demo',
          last_name: 'Resident',
          email: 'resident@eden.com',
          unit_number: '101'
        },
        assigned_staff: null
      }

      return NextResponse.json({
        success: true,
        data: mockServiceRequest
      })
    }

    const supabase = await createMobileClientWithSession(request)

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('site_id')
      .eq('id', user.id)
      .single()

    // Determine department assignment
    const departmentName = SERVICE_DEPARTMENT_MAPPING[requestData.type as keyof typeof SERVICE_DEPARTMENT_MAPPING]

    console.log('Mobile POST - Type:', requestData.type)
    console.log('Mobile POST - Mapped Department:', departmentName)

    // Create service request
    const { data: serviceRequest, error } = await supabase
      .from('service_requests')
      .insert([{
        ...requestData,
        resident_id: user.id,
        site_id: profile?.site_id,
        status: 'pending',
        department_assigned: departmentName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serviceRequest
    })

  } catch (error) {
    console.error('Mobile service requests POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enable CORS for mobile app
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
