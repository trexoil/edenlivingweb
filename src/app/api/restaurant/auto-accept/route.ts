import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToTokens, getDepartmentTokens } from '@/lib/notifications/push-server'

// POST /api/restaurant/auto-accept
// Scheduled job to auto-accept pro forma invoices after 24h
export async function POST(req: Request) {
  const supabase = await createClient()
  
  try {
    // Find draft invoices older than 24h
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: invoices, error } = await supabase
      .from('service_invoices')
      .select('*, orders(resident_id)')
      .eq('status', 'draft')
      .lt('created_at', cutoffTime)
      .not('order_id', 'is', null) // Only restaurant orders
    
    if (error) throw error
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: 'No invoices to auto-accept', count: 0 })
    }
    
    // Auto-accept these invoices
    const invoiceIds = invoices.map(inv => inv.id)
    const { error: updateError } = await supabase
      .from('service_invoices')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', invoiceIds)
    
    if (updateError) throw updateError
    
    // Notify admin about auto-accepted invoices
    try {
      const adminTokens = await getDepartmentTokens(supabase as any, 'admin')
      if (adminTokens.length > 0) {
        await sendPushToTokens(
          adminTokens,
          {
            title: '24h Auto-Accept Complete',
            body: `${invoices.length} restaurant invoice(s) auto-accepted and ready for processing`
          },
          { type: 'auto_accept_complete', count: invoices.length }
        )
      }
    } catch (pushError) {
      console.warn('[auto-accept] admin push failed', pushError)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Auto-accepted ${invoices.length} invoice(s)`,
      count: invoices.length 
    })
    
  } catch (e: any) {
    console.error('[auto-accept] error', e)
    return NextResponse.json({ error: e?.message ?? 'auto_accept_failed' }, { status: 500 })
  }
}
