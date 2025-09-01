import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params in Next.js 15
    const { id } = await params

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
      const { createAdminClient } = await import('@/lib/supabase/admin')
      supabase = createAdminClient()
    } else {
      supabase = await createClient()
    }

    // Parse request body
    const body = await request.json()
    const { name, address, city, state, postal_code, total_units, total_bedrooms, available_services } = body

    // Validate required fields
    if (!name || !address || !city || !state) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update site
    const { data: site, error: updateError } = await supabase
      .from('sites')
      .update({
        name,
        address,
        city,
        state,
        postal_code,
        total_bedrooms: total_units || total_bedrooms || 0,
        available_services: available_services || []
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating site:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      site 
    })

  } catch (error) {
    console.error('Update site API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params in Next.js 15
    const { id } = await params

    // Check for superadmin authorization
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')

    const isSuperadmin = cookies?.includes('superadmin_session') ||
                        authHeader?.includes('superadmin') ||
                        request.headers.get('x-superadmin') === 'true'

    if (!isSuperadmin) {
      return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
    }

    // Create a supabase client for data operations
    // Use admin client for superadmin operations to bypass RLS
    let supabase
    if (isSuperadmin) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      supabase = createAdminClient()
    } else {
      supabase = await createClient()
    }

    // Delete site
    const { error: deleteError } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting site:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Site deleted successfully' 
    })

  } catch (error) {
    console.error('Delete site API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
