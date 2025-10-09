import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signHS256(data: string, secret: string) {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest())
}

function generateLiveKitToken(room: string, identity: string, name: string, role: string) {
  const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
  const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('Missing LiveKit credentials')
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 60 * 60 // 1 hour

  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    name,
    nbf: now,
    exp,
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    metadata: JSON.stringify({ role })
  }

  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(payload))
  const toSign = `${encHeader}.${encPayload}`
  const signature = signHS256(toSign, LIVEKIT_API_SECRET)
  const token = `${toSign}.${signature}`

  return token
}

export async function POST(req: NextRequest) {
  try {
    const LIVEKIT_URL = process.env.LIVEKIT_URL
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json({ error: 'missing_livekit_env' }, { status: 500 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, site_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
    }

    // Only staff, admins, and site admins can join SOS calls
    if (!['staff', 'admin', 'site_admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'only_staff_can_join_sos' }, { status: 403 })
    }

    // Get room name from request body
    const body = await req.json().catch(() => ({}))
    const roomName = body?.roomName as string

    if (!roomName) {
      return NextResponse.json({ error: 'room_name_required' }, { status: 400 })
    }

    // Get active SOS call by room name
    const { data: sosCall, error: sosCallError } = await supabase
      .from('sos_calls')
      .select('id, resident_id, site_id, room_name, status')
      .eq('room_name', roomName)
      .eq('status', 'active')
      .single()

    if (sosCallError || !sosCall) {
      return NextResponse.json({ error: 'sos_call_not_found' }, { status: 404 })
    }

    // Validate staff has access to this site
    if (profile.role === 'site_admin' && profile.site_id !== sosCall.site_id) {
      return NextResponse.json({ error: 'access_denied_to_site' }, { status: 403 })
    }

    // Generate LiveKit token for staff
    const identity = `staff-${user.id}-${Date.now()}`
    const name = `${profile.first_name} ${profile.last_name}`
    const token = generateLiveKitToken(roomName, identity, name, 'staff')

    return NextResponse.json({
      success: true,
      roomName,
      token,
      url: LIVEKIT_URL,
      callId: sosCall.id,
      identity,
      name
    })

  } catch (error: any) {
    console.error('Join SOS room error:', error)
    return NextResponse.json(
      { error: error?.message || 'internal_server_error' },
      { status: 500 }
    )
  }
}

