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

    // Get ticket with related data
    const { data: ticket, error: ticketError } = await supabase
      .from('helpdesk_tickets')
      .select(`
        *,
        resident:profiles!helpdesk_tickets_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!helpdesk_tickets_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('id', params.id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get responses for this ticket
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

    return NextResponse.json({ 
      ticket,
      responses: responses || []
    })

  } catch (error) {
    console.error('Get ticket API error:', error)
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
    const { status, priority, assigned_to, title, description, category } = body

    // Get the existing ticket to check permissions
    const { data: existingTicket, error: fetchError } = await supabase
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Prepare update data based on user role
    let updateData: any = {}

    if (profile.role === 'resident') {
      // Residents can only update their own tickets and limited fields
      if (existingTicket.resident_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      
      // Residents can only update title, description, and category if ticket is still open
      if (existingTicket.status === 'open') {
        if (title) updateData.title = title
        if (description) updateData.description = description
        if (category) updateData.category = category
      }
    } else if (profile.role === 'site_admin' || profile.role === 'admin' || profile.role === 'staff') {
      // Staff can update tickets in their site
      if (profile.site_id !== existingTicket.site_id && profile.role !== 'superadmin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Staff can update all fields
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (category) updateData.category = category

      // Set resolved_at when status changes to resolved
      if (status === 'resolved' && existingTicket.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else if (status !== 'resolved') {
        updateData.resolved_at = null
      }
    } else if (profile.role === 'superadmin') {
      // Superadmin can update everything
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (category) updateData.category = category

      if (status === 'resolved' && existingTicket.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else if (status !== 'resolved') {
        updateData.resolved_at = null
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If no updates, return current ticket
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: true, 
        ticket: existingTicket 
      })
    }

    // Update ticket
    const { data: ticket, error: updateError } = await supabase
      .from('helpdesk_tickets')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        resident:profiles!helpdesk_tickets_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!helpdesk_tickets_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      ticket 
    })

  } catch (error) {
    console.error('Update ticket API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
