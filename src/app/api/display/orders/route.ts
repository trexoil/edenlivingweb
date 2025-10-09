import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/display/orders?site_id=xxx (optional)
// Public endpoint for kitchen order display - no authentication required
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('site_id')

    // Use admin client for public access (bypasses RLS)
    const supabase = createAdminClient()

    // Get today's start time (00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Build query for orders
    let query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', todayISO)
      .in('status', ['submitted', 'processing', 'delivering'])
      .eq('department_assigned', 'kitchen')
      .order('created_at', { ascending: false })

    // Optional site filtering
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data: ordersData, error } = await query.limit(100)

    if (error) {
      console.error('[display/orders] Query error:', error)
      return NextResponse.json({ items: [], error: error.message }, { status: 500 })
    }

    // Fetch order items and menu items for each order
    const items = await Promise.all((ordersData || []).map(async (order) => {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, menu_items(*)')
        .eq('order_id', order.id)

      return {
        id: order.id,
        order_number: `ORD-${order.id.slice(0, 6).toUpperCase()}`,
        status: order.status,
        total: parseFloat(order.total || 0),
        items: (orderItems || []).map((item: any) => ({
          name: item.menu_items?.name || 'Unknown Item',
          qty: item.qty || 1,
          price: parseFloat(item.price || 0)
        })),
        created_at: order.created_at,
        notes: order.notes
      }
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[display/orders] Error:', e)
    return NextResponse.json({ items: [], error: e?.message ?? 'unavailable' }, { status: 500 })
  }
}

