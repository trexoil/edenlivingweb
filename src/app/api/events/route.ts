import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Event } from '@/types/database'

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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const upcoming = searchParams.get('upcoming') === 'true'

    // Build query based on user role
    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, first_name, last_name, email),
        registrations:event_registrations(id, resident_id, status)
      `)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })

    // Apply role-based filtering
    if (profile.role === 'resident' || profile.role === 'admin' || profile.role === 'staff') {
      // Regular users see events for their site only
      query = query.eq('site_id', profile.site_id)
    } else if (profile.role === 'site_admin') {
      // Site admins see events for their site only
      query = query.eq('site_id', profile.site_id)
    }
    // Superadmins can see all events (no additional filtering)

    // Apply date filters
    if (startDate) {
      query = query.gte('event_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    // If upcoming is requested, filter to future events
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0]
      query = query.gte('event_date', today)
    }

    const { data: events, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching events:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    // For residents, add registration status for each event
    const eventsWithRegistrationStatus = events?.map(event => {
      const userRegistration = event.registrations?.find(
        (reg: any) => reg.resident_id === user.id && reg.status === 'registered'
      )
      
      return {
        ...event,
        is_registered: !!userRegistration,
        registration_count: event.registrations?.filter((reg: any) => reg.status === 'registered').length || 0,
        registrations: profile.role === 'site_admin' || profile.role === 'superadmin' ? event.registrations : undefined
      }
    })

    return NextResponse.json({
      success: true,
      events: eventsWithRegistrationStatus || []
    })

  } catch (error) {
    console.error('Events API error:', error)
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only site admins and superadmins can create events
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, event_date, event_time, location, max_attendees } = body

    // Validate required fields
    if (!title || !event_date || !event_time || !location) {
      return NextResponse.json({ 
        error: 'Title, event date, event time, and location are required' 
      }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(event_date)) {
      return NextResponse.json({ 
        error: 'Event date must be in YYYY-MM-DD format' 
      }, { status: 400 })
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(event_time)) {
      return NextResponse.json({ 
        error: 'Event time must be in HH:MM format' 
      }, { status: 400 })
    }

    // Validate max_attendees if provided
    if (max_attendees !== undefined && (max_attendees < 1 || max_attendees > 1000)) {
      return NextResponse.json({ 
        error: 'Max attendees must be between 1 and 1000' 
      }, { status: 400 })
    }

    // Prepare event data
    const eventData: Partial<Event> = {
      title: title.trim(),
      description: description?.trim() || '',
      event_date,
      event_time,
      location: location.trim(),
      organizer_id: user.id,
      max_attendees: max_attendees || null
    }

    // Set site_id based on user role
    if (profile.role === 'site_admin') {
      eventData.site_id = profile.site_id
    } else if (profile.role === 'superadmin') {
      // Superadmin must specify site_id
      if (!body.site_id) {
        return NextResponse.json({ error: 'Site ID is required for superadmin' }, { status: 400 })
      }
      eventData.site_id = body.site_id
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert([eventData])
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (createError) {
      console.error('Error creating event:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error) {
    console.error('Create event API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
