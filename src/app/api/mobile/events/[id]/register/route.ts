import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createMobileClientWithSession(request)

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eventId = params.id

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user is already registered
    const { data: existingRegistration } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('resident_id', user.id)
      .eq('status', 'registered')
      .single()

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'Already registered for this event' },
        { status: 400 }
      )
    }

    // Check if event has reached max attendees
    if (event.max_attendees) {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered')

      if (count && count >= event.max_attendees) {
        return NextResponse.json(
          { success: false, error: 'Event is full' },
          { status: 400 }
        )
      }
    }

    // Register for event
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: eventId,
        resident_id: user.id,
        status: 'registered',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (regError) {
      return NextResponse.json(
        { success: false, error: regError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: registration,
      message: 'Successfully registered for event'
    })

  } catch (error) {
    console.error('Mobile event registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createMobileClientWithSession(request)

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eventId = params.id

    // Unregister from event
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('resident_id', user.id)
      .eq('status', 'registered')

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unregistered from event'
    })

  } catch (error) {
    console.error('Mobile event unregistration error:', error)
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
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
