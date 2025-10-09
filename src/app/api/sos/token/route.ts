import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  const LIVEKIT_URL = process.env.LIVEKIT_URL
  const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
  const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'missing_livekit_env' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const room = (body?.room as string) || 'sos'
  const identity = (body?.identity as string) || `staff-${Math.random().toString(36).slice(2)}`
  const name = (body?.name as string) || 'Staff User'

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
    metadata: JSON.stringify({ role: 'staff' })
  }

  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(payload))
  const toSign = `${encHeader}.${encPayload}`
  const signature = signHS256(toSign, LIVEKIT_API_SECRET)
  const token = `${toSign}.${signature}`

  return NextResponse.json({ token, url: LIVEKIT_URL, room, identity, name })
}

