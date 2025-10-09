import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
  try {
    console.log('Mobile orders GET - Starting')
    const authHeader = request.headers.get('authorization')
    console.log('Mobile orders GET - Auth header:', authHeader ? 'Present' : 'Missing')

    const supabase = await createMobileClientWithSession(request)
    const { searchParams } = new URL(request.url)

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Check if this is a demo token
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (accessToken && accessToken.startsWith('demo-token-')) {
      console.log('Demo token detected, returning mock orders')

      // Return mock orders for demo user
      const mockOrders = [
        {
          id: 'demo-order-1',
          resident_id: 'demo-resident-id',
          status: 'submitted',
          department_assigned: 'kitchen',
          total: 25.50,
          notes: 'Please deliver to room 101',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              id: 'demo-item-1',
              menu_item_id: 'demo-menu-1',
              quantity: 1,
              price: 12.50,
              menu_item: {
                name: 'Grilled Chicken',
                description: 'Tender grilled chicken breast with herbs'
              }
            },
            {
              id: 'demo-item-2',
              menu_item_id: 'demo-menu-2',
              quantity: 2,
              price: 8.00,
              menu_item: {
                name: 'Caesar Salad',
                description: 'Fresh romaine lettuce with Caesar dressing'
              }
            }
          ]
        },
        {
          id: 'demo-order-2',
          resident_id: 'demo-resident-id',
          status: 'completed',
          department_assigned: 'kitchen',
          total: 14.00,
          notes: null,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              id: 'demo-item-3',
              menu_item_id: 'demo-menu-4',
              quantity: 1,
              price: 14.00,
              menu_item: {
                name: 'Pasta Carbonara',
                description: 'Creamy pasta with bacon and parmesan'
              }
            }
          ]
        }
      ]

      return NextResponse.json({
        success: true,
        data: mockOrders,
        pagination: {
          page,
          limit,
          total: mockOrders.length,
          totalPages: 1
        }
      })
    }

    // Get current user from session
    console.log('Mobile orders GET - Getting user')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Mobile orders GET - User:', user ? user.id : 'None', 'Error:', authError?.message || 'None')

    if (authError || !user) {
      console.log('Mobile orders GET - Authentication failed')
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, site_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Build base query for counting
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    // Filter based on user role
    if (profile.role === 'resident') {
      countQuery = countQuery.eq('resident_id', user.id)
    } else if (profile.role === 'site_admin' || profile.role === 'staff') {
      if (profile.site_id) {
        countQuery = countQuery.eq('site_id', profile.site_id)
      }
    }

    // Get total count
    const { count } = await countQuery

    // Build query for data with nested items
    let dataQuery = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id,
          item_id,
          qty,
          price,
          menu_item:menu_items(
            id,
            name,
            description,
            category
          )
        )
      `)

    // Apply same filters
    if (profile.role === 'resident') {
      dataQuery = dataQuery.eq('resident_id', user.id)
    } else if (profile.role === 'site_admin' || profile.role === 'staff') {
      if (profile.site_id) {
        dataQuery = dataQuery.eq('site_id', profile.site_id)
      }
    }

    // Get paginated data
    const { data: orders, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Mobile orders GET - Database error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Mobile orders GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Mobile orders POST - Starting')
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const requestData = await request.json()
    console.log('Mobile orders POST - Request data:', requestData)

    // Validate request data
    if (!requestData.items || !Array.isArray(requestData.items) || requestData.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Check if this is a demo token
    if (accessToken && accessToken.startsWith('demo-token-')) {
      console.log('Demo token detected, creating mock order')

      // Calculate total
      const total = requestData.items.reduce((sum: number, item: any) => {
        return sum + (item.price || 0) * (item.quantity || 1)
      }, 0)

      // Create mock order for demo user
      const mockOrder = {
        id: 'demo-order-' + Date.now(),
        resident_id: 'demo-resident-id',
        status: 'submitted',
        department_assigned: 'kitchen',
        total: total,
        notes: requestData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: requestData.items.map((item: any, index: number) => ({
          id: `demo-item-${Date.now()}-${index}`,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || null
        }))
      }

      return NextResponse.json({
        success: true,
        data: mockOrder
      })
    }

    const supabase = await createMobileClientWithSession(request)

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('site_id')
      .eq('id', user.id)
      .single()

    // Calculate total amount
    let totalAmount = 0
    for (const item of requestData.items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('price')
        .eq('id', item.menu_item_id)
        .single()
      
      if (menuItem) {
        totalAmount += menuItem.price * item.quantity
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        resident_id: user.id,
        site_id: profile?.site_id,
        status: 'submitted',
        department_assigned: 'kitchen',
        total: totalAmount,
        notes: requestData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orderError) {
      return NextResponse.json(
        { success: false, error: orderError.message },
        { status: 400 }
      )
    }

    // Create order items
    const orderItems = requestData.items.map((item: any) => ({
      order_id: order.id,
      item_id: item.menu_item_id,
      qty: item.quantity,
      price: item.price
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { success: false, error: itemsError.message },
        { status: 400 }
      )
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id,
          item_id,
          qty,
          price,
          menu_item:menu_items(
            id,
            name,
            description,
            category
          )
        )
      `)
      .eq('id', order.id)
      .single()

    return NextResponse.json({
      success: true,
      data: completeOrder
    })

  } catch (error) {
    console.error('Mobile orders POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enable CORS for mobile app
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

