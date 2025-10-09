import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDepartmentTokens, sendPushToTokens } from '@/lib/notifications/push-server'

// PATCH /api/restaurant/orders/[id]/status
// Body: { status: 'processing' | 'delivering' | 'completed' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await req.json().catch(() => null)
  const nextStatus = body?.status
  if (!nextStatus) return NextResponse.json({ error: 'missing_status' }, { status: 400 })

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) throw error

    // Notify kitchen staff about status change
    try {
      const tokens = await getDepartmentTokens(supabase as any, 'kitchen')
      await sendPushToTokens(tokens, { title: 'Order Status Updated', body: `#${String(order.id).slice(0,6)} → ${nextStatus}` }, { type: 'kitchen_order_status', order_id: order.id, status: nextStatus })
    } catch {}

    return NextResponse.json({ order })
  } catch (e: any) {
    console.error('[orders][status] update error', e)
    return NextResponse.json({ error: e?.message ?? 'update_failed' }, { status: 500 })
  }
}

