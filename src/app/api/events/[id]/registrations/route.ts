import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Check if event exists and user has access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (eventError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access permissions
    if (profile.role === 'resident' || profile.role === 'admin' || profile.role === 'staff') {
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    } else if (profile.role === 'site_admin') {
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    }

    // Get registrations with resident details
    const { data: registrations, error: registrationsError } = await supabase
      .from('event_registrations')
      .select(`
        *,
        resident:profiles!event_registrations_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .eq('event_id', params.id)
      .order('created_at', { ascending: true })

    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError)
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
    }

    // For regular users, only return their own registration
    if (profile.role === 'resident' || profile.role === 'admin' || profile.role === 'staff') {
      const userRegistration = registrations?.find(reg => reg.resident_id === user.id)
      return NextResponse.json({ 
        registrations: userRegistration ? [userRegistration] : [],
        total_count: registrations?.filter(reg => reg.status === 'registered').length || 0
      })
    }

    // Site admins and superadmins can see all registrations
    return NextResponse.json({ 
      registrations: registrations || [],
      total_count: registrations?.filter(reg => reg.status === 'registered').length || 0
    })

  } catch (error) {
    console.error('Get registrations API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if event exists and user has access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, registrations:event_registrations(id, status)')
      .eq('id', params.id)
      .single()

    if (eventError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check access permissions
    if (profile.role === 'resident' || profile.role === 'admin' || profile.role === 'staff') {
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    } else if (profile.role === 'site_admin') {
      if (event.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    }

    // Check if event is in the past
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`)
    const now = new Date()
    if (eventDateTime < now) {
      return NextResponse.json({ error: 'Cannot register for past events' }, { status: 400 })
    }

    // Check if user is already registered
    const { data: existingRegistration, error: checkError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', params.id)
      .eq('resident_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing registration:', checkError)
      return NextResponse.json({ error: 'Failed to check registration status' }, { status: 500 })
    }

    if (existingRegistration) {
      if (existingRegistration.status === 'registered') {
        return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 })
      } else {
        // Reactivate cancelled registration
        const { data: registration, error: updateError } = await supabase
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', existingRegistration.id)
          .select(`
            *,
            resident:profiles!event_registrations_resident_id_fkey(id, first_name, last_name, email, unit_number)
          `)
          .single()

        if (updateError) {
          console.error('Error updating registration:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          registration,
          message: 'Successfully registered for event'
        })
      }
    }

    // Check if event has reached max capacity
    if (event.max_attendees) {
      const activeRegistrations = event.registrations?.filter(reg => reg.status === 'registered').length || 0
      if (activeRegistrations >= event.max_attendees) {
        return NextResponse.json({ error: 'Event is at maximum capacity' }, { status: 400 })
      }
    }

    // Create new registration
    const { data: registration, error: createError } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: params.id,
        resident_id: user.id,
        status: 'registered'
      }])
      .select(`
        *,
        resident:profiles!event_registrations_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (createError) {
      console.error('Error creating registration:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      registration,
      message: 'Successfully registered for event'
    })

  } catch (error) {
    console.error('Create registration API error:', error)
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

    // Check if user has a registration for this event
    const { data: registration, error: registrationError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', params.id)
      .eq('resident_id', user.id)
      .eq('status', 'registered')
      .single()

    if (registrationError) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Cancel registration (soft delete by changing status)
    const { error: updateError } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('id', registration.id)

    if (updateError) {
      console.error('Error cancelling registration:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Registration cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel registration API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
