import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createMobileClientWithSession(request)
    const { searchParams } = new URL(request.url)
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile to check role and site
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, site_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, first_name, last_name),
        registrations:event_registrations(id, resident_id, status)
      `)

    // Filter based on user role and site
    if (profile.role === 'resident' || profile.role === 'site_admin' || profile.role === 'staff') {
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    }
    // Superadmin can see all events (no additional filter)

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Get paginated data
    const { data: events, error } = await query
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    // Add user registration status to each event
    const eventsWithRegistration = events?.map(event => ({
      ...event,
      isRegistered: event.registrations?.some(
        (reg: any) => reg.resident_id === user.id && reg.status === 'registered'
      ) || false,
      registrationCount: event.registrations?.filter(
        (reg: any) => reg.status === 'registered'
      ).length || 0
    })) || []

    return NextResponse.json({
      success: true,
      data: eventsWithRegistration,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Mobile events GET error:', error)
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
