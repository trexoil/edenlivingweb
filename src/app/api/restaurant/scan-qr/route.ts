import { NextResponse } from 'next/server'
import { validateQRCode } from '@/lib/qr-code'
import { createClient } from '@/lib/supabase/server'
import { getDepartmentTokens, sendPushToTokens } from '@/lib/notifications/push-server'

// POST /api/restaurant/scan-qr
// Body: { qr_data: string }
// Note: We reuse serviceRequestId as orderId for the restaurant flow
export async function POST(req: Request) {
  const supabase = await createClient()
  const { qr_data } = await req.json().catch(() => ({ qr_data: null }))
  if (!qr_data) return NextResponse.json({ error: 'missing_qr' }, { status: 400 })

  const parsed = validateQRCode(qr_data)
  if (!parsed) return NextResponse.json({ error: 'invalid_qr' }, { status: 400 })
  if (parsed.qrType !== 'completion') {
    return NextResponse.json({ error: 'qr_not_completion' }, { status: 400 })
  }

  const orderId = parsed.serviceRequestId

  try {
    // Mark order completed
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single()

    if (orderErr || !order) throw orderErr || new Error('order_not_found')

    // Create a simple pro forma invoice in service_invoices for demo purposes
    const description = `Restaurant Order (auto-generated)\nItems: ${(order.items || [])
      .map((it: any) => `${it.qty || 1} x ${it.name} @ RM${Number(it.price).toFixed(2)}`)
      .join(', ')}`

    const { data: invoice, error: invErr } = await supabase
      .from('service_invoices')
      .insert({
        service_request_id: orderId, // reuse field
        resident_id: order.resident_id,
        site_id: order.site_id || null,
        amount: Number(order.total_amount) || 0,
        tax_amount: 0,
        total_amount: Number(order.total_amount) || 0,
        description,
        status: 'draft',
        created_by: 'system',
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    // If invoice failed, proceed anyway for demo
    if (invErr) {
      console.warn('[restaurant][scan-qr] invoice create failed', invErr)
    }

    // Notify resident about completion
    try {
      const { data: residentTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', order.resident_id)
        .eq('is_active', true)

      if (residentTokens && residentTokens.length > 0) {
        const tokens = residentTokens.map(t => t.token)
        await sendPushToTokens(
          tokens,
          { title: 'Order Completed', body: 'Your restaurant order is ready! Pro forma invoice generated.' },
          { type: 'order_completed', order_id: order.id }
        )
      }
    } catch (pushError) {
      console.warn('[restaurant][scan-qr] resident push failed', pushError)
    }

    return NextResponse.json({ success: true, order, invoice: invoice ?? null })
  } catch (e: any) {
    console.error('[restaurant][scan-qr] error', e)
    return NextResponse.json({ error: e?.message ?? 'scan_failed' }, { status: 500 })
  }
}

