import { SupabaseClient } from '@supabase/supabase-js'

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send'

export async function sendPushToTokens(tokens: string[], notification: { title: string; body?: string }, data: Record<string, any> = {}) {
  const key = process.env.FCM_SERVER_KEY
  if (!key) {
    console.warn('[Push] Missing FCM_SERVER_KEY; skipping send')
    return
  }
  if (!tokens || tokens.length === 0) return

  const payload = {
    registration_ids: tokens,
    notification,
    data,
    priority: 'high',
  }

  try {
    const res = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${key}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn('[Push] FCM send failed', res.status, text)
    }
  } catch (e) {
    console.warn('[Push] FCM send error', e)
  }
}

export async function getDepartmentTokens(supabase: SupabaseClient, department: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('department', department)
      .eq('platform', 'web')
      .limit(500)

    if (error) throw error
    return (data || []).map((r: any) => r.token)
  } catch (e) {
    console.warn('[Push] getDepartmentTokens fallback', e)
    return []
  }
}

