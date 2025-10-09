import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'
import { sendPushToTokens } from '@/lib/notifications/push-server'

export async function POST(req: NextRequest) {
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
      .select('id, first_name, last_name, role, site_id, unit_number')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
    }

    // Get request body
    const body = await req.json().catch(() => ({}))
    const roomName = body?.roomName as string
    const callId = body?.callId as string

    if (!roomName || !callId) {
      return NextResponse.json({ error: 'room_name_and_call_id_required' }, { status: 400 })
    }

    // Verify the SOS call exists and belongs to the user
    const { data: sosCall, error: sosCallError } = await supabase
      .from('sos_calls')
      .select('id, resident_id, site_id, status')
      .eq('id', callId)
      .eq('resident_id', user.id)
      .single()

    if (sosCallError || !sosCall) {
      return NextResponse.json({ error: 'sos_call_not_found' }, { status: 404 })
    }

    if (sosCall.status !== 'active') {
      return NextResponse.json({ error: 'sos_call_not_active' }, { status: 400 })
    }

    // Get emergency contacts for the site
    const { data: emergencyContacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('id, label, contact, role, priority')
      .eq('site_id', sosCall.site_id)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (contactsError) {
      console.error('Error fetching emergency contacts:', contactsError)
    }

    // Get push tokens for staff at this site
    const { data: staffTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, profiles!inner(role, site_id)')
      .eq('platform', 'web')
      .eq('is_active', true)
      .in('profiles.role', ['staff', 'admin', 'site_admin', 'superadmin'])

    if (tokensError) {
      console.error('Error fetching staff tokens:', tokensError)
    }

    // Filter tokens for staff at the same site or admins/superadmins
    const relevantTokens = (staffTokens || [])
      .filter((t: any) => {
        const staffProfile = t.profiles
        if (!staffProfile) return false
        
        // Admins and superadmins get all notifications
        if (['admin', 'superadmin'].includes(staffProfile.role)) {
          return true
        }
        
        // Site admins and staff only get notifications for their site
        return staffProfile.site_id === sosCall.site_id
      })
      .map((t: any) => t.token)

    // Send push notifications
    if (relevantTokens.length > 0) {
      const residentName = `${profile.first_name} ${profile.last_name}`
      const unitInfo = profile.unit_number ? ` (Unit ${profile.unit_number})` : ''
      
      await sendPushToTokens(
        relevantTokens,
        {
          title: '🚨 EMERGENCY SOS',
          body: `${residentName}${unitInfo} needs immediate assistance!`
        },
        {
          type: 'sos_emergency',
          room_name: roomName,
          call_id: callId,
          resident_id: user.id,
          resident_name: residentName,
          unit_number: profile.unit_number || '',
          site_id: sosCall.site_id
        }
      )
    }

    return NextResponse.json({
      success: true,
      notified_staff: relevantTokens.length,
      emergency_contacts: emergencyContacts?.length || 0
    })

  } catch (error: any) {
    console.error('Notify SOS error:', error)
    return NextResponse.json(
      { error: error?.message || 'internal_server_error' },
      { status: 500 }
    )
  }
}

