import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check for demo resident user first
    if (email === 'resident@eden.com' && password === 'password123') {
      console.log('Demo resident login detected in mobile API')

      // Create mock resident profile for demo
      const mockProfile = {
        id: 'demo-resident-id',
        email: 'resident@eden.com',
        first_name: 'Demo',
        last_name: 'Resident',
        role: 'resident',
        unit_number: '101',
        site_id: '00000000-0000-0000-0000-000000000001',
        phone_number: null,
        emergency_contact: null,
        dietary_preferences: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Generate a mock token (in production, this would be a real JWT)
      const mockToken = 'demo-token-' + Date.now()

      return NextResponse.json({
        success: true,
        data: {
          user: mockProfile,
          token: mockToken,
          refreshToken: 'demo-refresh-token'
        }
      })
    }

    const supabase = await createClient()

    // Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }

    if (!data.session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only allow residents to use mobile app
    if (profile.role !== 'resident') {
      return NextResponse.json(
        { success: false, error: 'Mobile app is only available for residents' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: profile,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
    })

  } catch (error) {
    console.error('Mobile login error:', error)
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
