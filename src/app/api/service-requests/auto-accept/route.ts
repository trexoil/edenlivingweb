import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToTokens, getDepartmentTokens } from '@/lib/notifications/push-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Find draft invoices older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: invoices, error } = await supabase
      .from('service_invoices')
      .select(`
        *,
        service_requests(id, title, type, resident_id),
        profiles!service_invoices_resident_id_fkey(first_name, last_name, email)
      `)
      .eq('status', 'draft')
      .lt('created_at', cutoffTime)
      .not('service_request_id', 'is', null)

    if (error) {
      console.error('Error fetching invoices for auto-accept:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ 
        message: 'No invoices found for auto-acceptance',
        processed: 0 
      })
    }

    let processed = 0
    const results = []

    for (const invoice of invoices) {
      try {
        // Update invoice status to accepted
        const { error: updateError } = await supabase
          .from('service_invoices')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id)

        if (updateError) {
          console.error(`Error updating invoice ${invoice.id}:`, updateError)
          results.push({ invoice_id: invoice.id, success: false, error: updateError.message })
          continue
        }

        processed++
        results.push({ 
          invoice_id: invoice.id, 
          success: true, 
          amount: invoice.total_amount,
          resident: invoice.profiles?.first_name + ' ' + invoice.profiles?.last_name,
          service_type: invoice.service_requests?.type
        })

        console.log(`Auto-accepted invoice ${invoice.id} for RM${invoice.total_amount}`)

      } catch (error: any) {
        console.error(`Error processing invoice ${invoice.id}:`, error)
        results.push({ invoice_id: invoice.id, success: false, error: error.message })
      }
    }

    // Send notification to admins about auto-accepted invoices
    if (processed > 0) {
      try {
        const adminTokens = await getDepartmentTokens(supabase as any, 'admin')
        if (adminTokens.length > 0) {
          const totalAmount = results
            .filter(r => r.success)
            .reduce((sum, r) => sum + (r.amount || 0), 0)

          await sendPushToTokens(
            adminTokens,
            {
              title: 'Auto-Accepted Invoices',
              body: `${processed} invoice(s) auto-accepted (RM${totalAmount.toFixed(2)} total)`
            },
            { 
              type: 'invoices_auto_accepted', 
              count: processed,
              total_amount: totalAmount
            }
          )
        }
      } catch (pushError) {
        console.warn('Failed to send admin notification:', pushError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-accepted ${processed} invoice(s)`,
      processed,
      results
    })

  } catch (error) {
    console.error('Auto-accept invoices API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to check which invoices are eligible for auto-accept
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Find draft invoices older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: invoices, error } = await supabase
      .from('service_invoices')
      .select(`
        id,
        total_amount,
        created_at,
        service_requests(title, type),
        profiles!service_invoices_resident_id_fkey(first_name, last_name)
      `)
      .eq('status', 'draft')
      .lt('created_at', cutoffTime)
      .not('service_request_id', 'is', null)

    if (error) {
      console.error('Error fetching eligible invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalAmount = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    return NextResponse.json({
      eligible_invoices: invoices || [],
      count: invoices?.length || 0,
      total_amount: totalAmount
    })

  } catch (error) {
    console.error('Get eligible invoices API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
