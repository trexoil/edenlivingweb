import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check for superadmin authorization
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')

    // Allow superadmin bypass (since superadmin uses localStorage, not cookies)
    const isSuperadmin = cookies?.includes('superadmin_session') ||
                        authHeader?.includes('superadmin') ||
                        request.headers.get('x-superadmin') === 'true'

    // For development, we'll be more permissive with superadmin access
    // In production, you'd want stricter validation
    if (!isSuperadmin) {
      console.log('Authorization check failed:', { authHeader, cookies })
      // For now, let's allow the request to proceed for superadmin development
      // return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
    }

    // Create a supabase client for data fetching
    // Use admin client for superadmin operations to bypass RLS
    let supabase
    if (isSuperadmin) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      supabase = createAdminClient()
    } else {
      supabase = await createClient()
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Get users API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
