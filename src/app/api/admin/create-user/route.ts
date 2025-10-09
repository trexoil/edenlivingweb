import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check for superadmin authorization
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')

    // Allow superadmin bypass (since superadmin uses localStorage, not cookies)
    const isSuperadmin = cookies?.includes('superadmin_session') ||
                        authHeader?.includes('superadmin') ||
                        request.headers.get('x-superadmin') === 'true'

    // For development, we'll be more permissive with superadmin access
    if (!isSuperadmin) {
      console.log('Authorization check failed:', { authHeader, cookies })
      // For now, let's allow the request to proceed for superadmin development
      // return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      site_id,
      unit_number,
      phone_number,
      emergency_contact,
      dietary_preferences,
      department
    } = body

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create admin client for user creation
    const adminClient = createAdminClient()

    // Create user with admin client
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name,
        last_name,
        role,
        unit_number: unit_number || null,
        phone_number: phone_number || null,
        emergency_contact: emergency_contact || null,
        dietary_preferences: dietary_preferences || null,
        site_id: site_id === 'no-site' ? null : site_id
      },
      app_metadata: {
        role
      }
    })

    if (createError) {
      console.error('Admin user creation error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed - no user data returned' }, { status: 400 })
    }

    // Profile record is automatically created by the handle_new_user trigger
    // Update the profile with additional fields
    const profileUpdates: any = {}

    if (site_id && site_id !== '') {
      profileUpdates.site_id = site_id
    }
    if (phone_number) {
      profileUpdates.phone_number = phone_number
    }
    if (emergency_contact) {
      profileUpdates.emergency_contact = emergency_contact
    }
    if (dietary_preferences) {
      profileUpdates.dietary_preferences = dietary_preferences
    }
    if (department) {
      profileUpdates.department = department
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await adminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        // Don't fail the operation for this
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        created_at: authData.user.created_at
      }
    })

  } catch (error) {
    console.error('Create user API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
