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

    // Get responses for this ticket (RLS will handle access control)
    const { data: responses, error: responsesError } = await supabase
      .from('helpdesk_responses')
      .select(`
        *,
        responder:profiles!helpdesk_responses_responder_id_fkey(id, first_name, last_name, email, role)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    return NextResponse.json({ responses: responses || [] })

  } catch (error) {
    console.error('Get responses API error:', error)
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { message, is_internal = false } = body

    // Validate required fields
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check if ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (ticketError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Determine if user can make internal responses
    let canMakeInternalResponse = false
    if (profile.role === 'site_admin' || profile.role === 'admin' || profile.role === 'staff' || profile.role === 'superadmin') {
      canMakeInternalResponse = true
    }

    // If user tries to make internal response but doesn't have permission, make it public
    const finalIsInternal = is_internal && canMakeInternalResponse

    // Create response
    const { data: response, error: createError } = await supabase
      .from('helpdesk_responses')
      .insert([{
        ticket_id: params.id,
        responder_id: user.id,
        message: message.trim(),
        is_internal: finalIsInternal
      }])
      .select(`
        *,
        responder:profiles!helpdesk_responses_responder_id_fkey(id, first_name, last_name, email, role)
      `)
      .single()

    if (createError) {
      console.error('Error creating response:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Update ticket status to in_progress if it was open and this is a staff response
    if (ticket.status === 'open' && canMakeInternalResponse) {
      const { error: updateError } = await supabase
        .from('helpdesk_tickets')
        .update({ status: 'in_progress' })
        .eq('id', params.id)

      if (updateError) {
        console.warn('Failed to update ticket status:', updateError)
      }
    }

    // Create notification for the other party
    let notificationUserId = null
    let notificationTitle = ''
    let notificationMessage = ''

    if (profile.role === 'resident') {
      // Resident responded - notify site admins
      // For now, we'll skip this as we need to implement admin notification system
      notificationTitle = 'Resident Response'
      notificationMessage = `Resident responded to ticket: ${ticket.title}`
    } else {
      // Staff responded - notify resident (only for non-internal responses)
      if (!finalIsInternal) {
        notificationUserId = ticket.resident_id
        notificationTitle = 'Staff Response'
        notificationMessage = `Staff responded to your ticket: ${ticket.title}`
      }
    }

    if (notificationUserId) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: notificationUserId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'info'
        }])

      if (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error) {
    console.error('Create response API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
