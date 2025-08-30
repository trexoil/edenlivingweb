import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Event } from '@/types/database'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get event with organizer details and registrations
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, first_name, last_name, email),
        registrations:event_registrations(
          id, 
          resident_id, 
          status, 
          created_at,
          resident:profiles!event_registrations_resident_id_fkey(id, first_name, last_name, email, unit_number)
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching event:', fetchError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access permissions
    if (profile.role === 'resident' || profile.role === 'admin' || profile.role === 'staff') {
      // Regular users can only see events for their site
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    } else if (profile.role === 'site_admin') {
      // Site admins can see events for their site only
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    }
    // Superadmins can see all events

    // Add user registration status
    const userRegistration = event.registrations?.find(
      (reg: any) => reg.resident_id === user.id && reg.status === 'registered'
    )

    const eventWithStatus = {
      ...event,
      is_registered: !!userRegistration,
      registration_count: event.registrations?.filter((reg: any) => reg.status === 'registered').length || 0,
      // Only show detailed registrations to site admins and superadmins
      registrations: (profile.role === 'site_admin' || profile.role === 'superadmin') 
        ? event.registrations 
        : undefined
    }

    return NextResponse.json({
      success: true,
      event: eventWithStatus
    })

  } catch (error) {
    console.error('Get event API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get existing event to check permissions
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check permissions - only site admins and superadmins can edit events
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Site admins can only edit events for their site
    if (profile.role === 'site_admin' && existingEvent.site_id !== profile.site_id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, event_date, event_time, location, max_attendees } = body

    // Validate date format if provided
    if (event_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(event_date)) {
        return NextResponse.json({ 
          error: 'Event date must be in YYYY-MM-DD format' 
        }, { status: 400 })
      }
    }

    // Validate time format if provided
    if (event_time) {
      const timeRegex = /^\d{2}:\d{2}$/
      if (!timeRegex.test(event_time)) {
        return NextResponse.json({ 
          error: 'Event time must be in HH:MM format' 
        }, { status: 400 })
      }
    }

    // Validate max_attendees if provided
    if (max_attendees !== undefined && max_attendees !== null && (max_attendees < 1 || max_attendees > 1000)) {
      return NextResponse.json({ 
        error: 'Max attendees must be between 1 and 1000' 
      }, { status: 400 })
    }

    // Prepare update data
    const updateData: Partial<Event> = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (event_date !== undefined) updateData.event_date = event_date
    if (event_time !== undefined) updateData.event_time = event_time
    if (location !== undefined) updateData.location = location.trim()
    if (max_attendees !== undefined) updateData.max_attendees = max_attendees

    // Update event
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error) {
    console.error('Update event API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get existing event to check permissions
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check permissions - only site admins and superadmins can delete events
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Site admins can only delete events for their site
    if (profile.role === 'site_admin' && existingEvent.site_id !== profile.site_id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete event (this will cascade delete registrations if foreign key is set up properly)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })

  } catch (error) {
    console.error('Delete event API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
