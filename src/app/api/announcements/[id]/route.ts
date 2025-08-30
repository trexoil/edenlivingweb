import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Announcement } from '@/types/database'

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

    // Get announcement with author details
    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching announcement:', fetchError)
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check access permissions
    if (profile.role === 'resident') {
      // Residents can only see published announcements for their site
      if (!announcement.is_published || announcement.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      }
    } else if (profile.role === 'site_admin') {
      // Site admins can see announcements for their site only
      if (announcement.site_id !== profile.site_id) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      }
    }
    // Superadmins can see all announcements

    return NextResponse.json({
      success: true,
      announcement
    })

  } catch (error) {
    console.error('Get announcement API error:', error)
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

    // Only site admins and superadmins can update announcements
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get existing announcement to check permissions
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check site access for site admins
    if (profile.role === 'site_admin' && existingAnnouncement.site_id !== profile.site_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, priority, target_audience, is_published } = body

    // Validate enum values if provided
    const validPriorities = ['normal', 'important', 'urgent']
    const validAudiences = ['all', 'residents', 'staff']

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
    }

    if (target_audience && !validAudiences.includes(target_audience)) {
      return NextResponse.json({ error: 'Invalid target audience value' }, { status: 400 })
    }

    // Prepare update data
    const updateData: Partial<Announcement> = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title.trim()
    if (content !== undefined) updateData.content = content.trim()
    if (priority !== undefined) updateData.priority = priority
    if (target_audience !== undefined) updateData.target_audience = target_audience
    
    // Handle publishing status
    if (is_published !== undefined) {
      updateData.is_published = is_published
      if (is_published && !existingAnnouncement.published_at) {
        updateData.published_at = new Date().toISOString()
      } else if (!is_published) {
        updateData.published_at = null
      }
    }

    // Update announcement
    const { data: announcement, error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        author:profiles!announcements_author_id_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating announcement:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      announcement
    })

  } catch (error) {
    console.error('Update announcement API error:', error)
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

    // Only site admins and superadmins can delete announcements
    if (profile.role !== 'site_admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get existing announcement to check permissions
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check site access for site admins
    if (profile.role === 'site_admin' && existingAnnouncement.site_id !== profile.site_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete announcement
    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    })

  } catch (error) {
    console.error('Delete announcement API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
