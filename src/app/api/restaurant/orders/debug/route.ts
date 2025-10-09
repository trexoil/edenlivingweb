import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/restaurant/orders/debug - Debug endpoint to check orders and user info
export async function GET() {
  const supabase = await createClient()

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null,
        profile: null,
        orders: []
      })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get all orders (no filtering)
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get orders for user's site
    const { data: siteOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('site_id', profile?.site_id || 'none')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile?.id,
        email: profile?.email,
        role: profile?.role,
        department: profile?.department,
        site_id: profile?.site_id,
        first_name: profile?.first_name,
        last_name: profile?.last_name
      },
      allOrders: allOrders?.map(o => ({
        id: o.id,
        status: o.status,
        site_id: o.site_id,
        resident_id: o.resident_id,
        total_amount: o.total_amount,
        created_at: o.created_at
      })) || [],
      siteOrders: siteOrders?.map(o => ({
        id: o.id,
        status: o.status,
        site_id: o.site_id,
        resident_id: o.resident_id,
        total_amount: o.total_amount,
        created_at: o.created_at
      })) || [],
      summary: {
        totalOrders: allOrders?.length || 0,
        siteOrders: siteOrders?.length || 0,
        userSiteId: profile?.site_id || 'none',
        userRole: profile?.role,
        userDepartment: profile?.department
      }
    })
  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message || 'Unknown error',
      stack: e?.stack
    }, { status: 500 })
  }
}

