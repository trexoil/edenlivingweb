import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDepartmentTokens, sendPushToTokens } from '@/lib/notifications/push-server'

// GET /api/restaurant/orders?status=submitted|processing|delivering|completed
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ orders: [], error: 'unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ orders: [], error: 'profile_not_found' }, { status: 404 })
    }

    // Build query with site filtering - fetch orders first
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by site for staff and site_admin
    if (profile.role === 'staff' || profile.role === 'site_admin' || profile.role === 'admin') {
      if (profile.site_id) {
        query = query.eq('site_id', profile.site_id)
      }
    }
    // Superadmin can see all orders (no site filter)

    const { data: ordersData, error } = await query.limit(100)

    console.log('[orders API] Query result:', {
      dataCount: ordersData?.length,
      error: error?.message,
      status,
      profileRole: profile.role,
      profileSiteId: profile.site_id
    })

    if (error) throw error

    // Fetch order items and menu items for each order
    const orders = await Promise.all((ordersData || []).map(async (order) => {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, menu_items(*)')
        .eq('order_id', order.id)

      return {
        ...order,
        total_amount: order.total,
        items: (orderItems || []).map((item: any) => ({
          name: item.menu_items?.name || 'Unknown Item',
          price: parseFloat(item.price || 0),
          qty: item.qty || 1
        }))
      }
    }))

    console.log('[orders API] Returning orders:', orders.length)

    return NextResponse.json({ orders })
  } catch (e: any) {
    console.warn('[orders] list fallback', e?.message)
    return NextResponse.json({ orders: [], error: e?.message ?? 'unavailable' })
  }
}

// POST /api/restaurant/orders
// Body: { resident_id: string, site_id?: string, items: Array<{ name: string, price: number, qty: number }>, note?: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json().catch(() => null)
  if (!body?.resident_id || !Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const total = body.items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.qty || 1)), 0)

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        resident_id: body.resident_id,
        site_id: body.site_id ?? null,
        department_assigned: 'kitchen',
        notes: body.note ?? null,
        status: 'submitted',
        total: total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throw error

    // Notify kitchen staff (if push configured)
    try {
      const tokens = await getDepartmentTokens(supabase as any, 'kitchen')
      await sendPushToTokens(tokens, { title: 'New Kitchen Order', body: `Order #${String(order.id).slice(0,6)} submitted` }, { type: 'kitchen_order_submitted', order_id: order.id })
    } catch {}

    return NextResponse.json({ order })
  } catch (e: any) {
    console.error('[orders] create error', e)
    return NextResponse.json({ error: e?.message ?? 'create_failed' }, { status: 500 })
  }
}

