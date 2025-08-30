import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Announcement } from '@/types/database'

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
    const priority = searchParams.get('priority')
    const target_audience = searchParams.get('target_audience')
    const is_published = searchParams.get('is_published')

    // Build query based on user role
    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (profile.role === 'resident') {
      // Residents can only see published announcements for their site
      query = query
        .eq('site_id', profile.site_id)
        .eq('is_published', true)
    } else if (profile.role === 'site_admin') {
      // Site admins can see all announcements for their site
      query = query.eq('site_id', profile.site_id)
    }
    // Superadmins can see all announcements (no additional filtering)

    // Apply optional filters
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (target_audience) {
      query = query.eq('target_audience', target_audience)
    }
    if (is_published !== null) {
      query = query.eq('is_published', is_published === 'true')
    }

    const { data: announcements, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching announcements:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      announcements: announcements || []
    })

  } catch (error) {
    console.error('Announcements API error:', error)
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

    // Only site admins and superadmins can create announcements
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, priority, target_audience, is_published } = body

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Validate enum values
    const validPriorities = ['normal', 'important', 'urgent']
    const validAudiences = ['all', 'residents', 'staff']

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
    }

    if (target_audience && !validAudiences.includes(target_audience)) {
      return NextResponse.json({ error: 'Invalid target audience value' }, { status: 400 })
    }

    // Prepare announcement data
    const announcementData: Partial<Announcement> = {
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      priority: priority || 'normal',
      target_audience: target_audience || 'all',
      is_published: is_published || false,
      published_at: is_published ? new Date().toISOString() : null
    }

    // Set site_id based on user role
    if (profile.role === 'site_admin') {
      announcementData.site_id = profile.site_id
    } else if (profile.role === 'superadmin') {
      // Superadmin must specify site_id
      if (!body.site_id) {
        return NextResponse.json({ error: 'Site ID is required for superadmin' }, { status: 400 })
      }
      announcementData.site_id = body.site_id
    }

    // Create announcement
    const { data: announcement, error: createError } = await supabase
      .from('announcements')
      .insert([announcementData])
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (createError) {
      console.error('Error creating announcement:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      announcement
    })

  } catch (error) {
    console.error('Create announcement API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
