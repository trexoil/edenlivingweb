import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HelpDeskTicket } from '@/types/database'

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
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    // Build query based on user role
    let query = supabase
      .from('helpdesk_tickets')
      .select(`
        *,
        resident:profiles!helpdesk_tickets_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!helpdesk_tickets_assigned_to_fkey(id, first_name, last_name, email)
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
    // Superadmin can see all tickets (no additional filtering)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: tickets, error: ticketsError } = await query

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({ tickets })

  } catch (error) {
    console.error('Get tickets API error:', error)
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

    // Only residents can create tickets for themselves
    if (profile.role !== 'resident') {
      return NextResponse.json({ error: 'Only residents can create tickets' }, { status: 403 })
    }

    if (!profile.site_id) {
      return NextResponse.json({ error: 'User must be assigned to a site' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { title, description, category, priority = 'medium' } = body

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate category and priority
    const validCategories = ['maintenance', 'technical', 'general', 'complaint', 'suggestion']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Create ticket
    const { data: ticket, error: createError } = await supabase
      .from('helpdesk_tickets')
      .insert([{
        resident_id: user.id,
        site_id: profile.site_id,
        title,
        description,
        category,
        priority,
        status: 'open'
      }])
      .select(`
        *,
        resident:profiles!helpdesk_tickets_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (createError) {
      console.error('Error creating ticket:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Create notification for site admins
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: user.id, // This will be updated to notify admins in a future enhancement
        title: 'New Help Desk Ticket',
        message: `New ${category} ticket: ${title}`,
        type: 'info'
      }])

    if (notificationError) {
      console.warn('Failed to create notification:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      ticket
    })

  } catch (error) {
    console.error('Create ticket API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
