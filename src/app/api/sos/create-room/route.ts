import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'
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
      .select('id, first_name, last_name, role, site_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
    }

    // Only residents can create SOS calls
    if (profile.role !== 'resident') {
      return NextResponse.json({ error: 'only_residents_can_create_sos' }, { status: 403 })
    }

    if (!profile.site_id) {
      return NextResponse.json({ error: 'resident_must_have_site' }, { status: 400 })
    }

    // Generate unique room name
    const roomName = `sos-${profile.site_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Create sos_calls record
    const { data: sosCall, error: sosCallError } = await supabase
      .from('sos_calls')
      .insert({
        resident_id: user.id,
        site_id: profile.site_id,
        room_name: roomName,
        status: 'active',
        created_by: user.id
      })
      .select()
      .single()

    if (sosCallError) {
      console.error('Error creating SOS call:', sosCallError)
      return NextResponse.json({ error: 'failed_to_create_sos_call' }, { status: 500 })
    }

    // Generate LiveKit token for resident
    const identity = `resident-${user.id}`
    const name = `${profile.first_name} ${profile.last_name}`
    const token = generateLiveKitToken(roomName, identity, name, 'resident')

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
    console.error('Create SOS room error:', error)
    return NextResponse.json(
      { error: error?.message || 'internal_server_error' },
      { status: 500 }
    )
  }
}

