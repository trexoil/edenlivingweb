import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check for superadmin authorization
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')
    
    const isSuperadmin = cookies?.includes('superadmin_session') || 
                        authHeader?.includes('superadmin') ||
                        request.headers.get('x-superadmin') === 'true'

    if (!isSuperadmin) {
      console.log('Authorization check failed:', { authHeader, cookies })
    }

    // Create a supabase client for data operations
    // Use admin client for superadmin operations to bypass RLS
    let supabase
    if (isSuperadmin) {
      supabase = createAdminClient()
    } else {
      supabase = await createClient()
    }

    // Parse request body
    const body = await request.json()
    const { first_name, last_name, role, site_id, unit_number } = body

    // Validate required fields
    if (!first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update user profile
    const { data: user, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name,
        last_name,
        role,
        site_id: site_id === 'none' ? null : site_id,
        unit_number: unit_number || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Also update the auth user metadata if using admin client
    if (isSuperadmin) {
      const adminClient = createAdminClient()
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        params.id,
        {
          user_metadata: {
            first_name,
            last_name,
            role,
            unit_number: unit_number || null,
            site_id: site_id === 'none' ? null : site_id
          },
          app_metadata: {
            role
          }
        }
      )

      if (authUpdateError) {
        console.error('Error updating auth user metadata:', authUpdateError)
        // Don't fail the operation for this
      }
    }

    return NextResponse.json({ 
      success: true, 
      user 
    })

  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check for superadmin authorization
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')
    
    const isSuperadmin = cookies?.includes('superadmin_session') || 
                        authHeader?.includes('superadmin') ||
                        request.headers.get('x-superadmin') === 'true'

    if (!isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
    }

    // Create admin client for user deletion
    const adminClient = createAdminClient()

    // First delete the profile record (since there's no CASCADE DELETE constraint)
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', params.id)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      return NextResponse.json({ error: 'Failed to delete user profile: ' + profileDeleteError.message }, { status: 400 })
    }

    // Then delete the auth user
    const { data, error: deleteError } = await adminClient.auth.admin.deleteUser(params.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    })

  } catch (error) {
    console.error('Delete user API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
