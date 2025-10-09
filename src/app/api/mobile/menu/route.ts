import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
  try {
    console.log('Mobile menu GET - Starting')
    const authHeader = request.headers.get('authorization')
    console.log('Mobile menu GET - Auth header:', authHeader ? 'Present' : 'Missing')

    const supabase = await createMobileClientWithSession(request)
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const category = searchParams.get('category')

    // Check if this is a demo token
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (accessToken && accessToken.startsWith('demo-token-')) {
      console.log('Demo token detected, returning mock menu items')

      // Return mock menu items for demo user
      const mockMenuItems = [
        {
          id: 'demo-menu-1',
          name: 'Grilled Chicken',
          description: 'Tender grilled chicken breast with herbs',
          price: 12.50,
          category: 'main',
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-menu-2',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 8.00,
          category: 'appetizer',
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-menu-3',
          name: 'Chocolate Cake',
          description: 'Rich chocolate cake with ganache',
          price: 6.50,
          category: 'dessert',
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-menu-4',
          name: 'Pasta Carbonara',
          description: 'Creamy pasta with bacon and parmesan',
          price: 14.00,
          category: 'main',
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]

      // Filter by category if provided
      const filteredItems = category 
        ? mockMenuItems.filter(item => item.category === category)
        : mockMenuItems

      return NextResponse.json({
        success: true,
        data: filteredItems
      })
    }

    // Get current user from session
    console.log('Mobile menu GET - Getting user')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Mobile menu GET - User:', user ? user.id : 'None', 'Error:', authError?.message || 'None')

    if (authError || !user) {
      console.log('Mobile menu GET - Authentication failed')
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category)
    }

    // Get menu items
    const { data: menuItems, error } = await query
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Mobile menu GET - Database error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: menuItems || []
    })

  } catch (error) {
    console.error('Mobile menu GET error:', error)
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

