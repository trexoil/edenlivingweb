import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Auth error', 
        details: authError.message,
        user: null 
      })
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'No user found', 
        user: null 
      })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile error', 
        details: profileError.message,
        user: user.id,
        profile: null 
      })
    }

    // Test service requests table access
    const { data: serviceRequests, error: serviceRequestsError } = await supabase
      .from('service_requests')
      .select('count')
      .limit(1)

    // Test helpdesk table access
    const { data: tickets, error: ticketsError } = await supabase
      .from('helpdesk_tickets')
      .select('count')
      .limit(1)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        role: profile.role,
        site_id: profile.site_id
      },
      service_requests_access: serviceRequestsError ? { error: serviceRequestsError.message } : { success: true, count: serviceRequests?.length || 0 },
      helpdesk_access: ticketsError ? { error: ticketsError.message } : { success: true, count: tickets?.length || 0 }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
