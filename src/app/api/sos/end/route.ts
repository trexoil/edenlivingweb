import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function PATCH(req: NextRequest) {
  try {
    // Check if request is from mobile (has Authorization header)
    const authHeader = req.headers.get('authorization')
    const isMobileRequest = authHeader && authHeader.startsWith('Bearer ')

    // Use appropriate client based on request type
    const supabase = isMobileRequest
      ? await createMobileClientWithSession(req)
      : await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, site_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
    }

    // Get request body
    const body = await req.json().catch(() => ({}))
    const callId = body?.callId as string

    if (!callId) {
      return NextResponse.json({ error: 'call_id_required' }, { status: 400 })
    }

    // Get the SOS call
    const { data: sosCall, error: sosCallError } = await supabase
      .from('sos_calls')
      .select('id, resident_id, site_id, status')
      .eq('id', callId)
      .single()

    if (sosCallError || !sosCall) {
      return NextResponse.json({ error: 'sos_call_not_found' }, { status: 404 })
    }

    // Verify user has permission to end this call
    const isResident = sosCall.resident_id === user.id
    const isStaffAtSite = ['staff', 'site_admin'].includes(profile.role) && profile.site_id === sosCall.site_id
    const isAdmin = ['admin', 'superadmin'].includes(profile.role)

    if (!isResident && !isStaffAtSite && !isAdmin) {
      return NextResponse.json({ error: 'access_denied' }, { status: 403 })
    }

    // Update the SOS call to ended
    const { data: updatedCall, error: updateError } = await supabase
      .from('sos_calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId)
      .select()
      .single()

    if (updateError) {
      console.error('Error ending SOS call:', updateError)
      return NextResponse.json({ error: 'failed_to_end_call' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      call: updatedCall
    })

  } catch (error: any) {
    console.error('End SOS call error:', error)
    return NextResponse.json(
      { error: error?.message || 'internal_server_error' },
      { status: 500 }
    )
  }
}

