import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build query based on user role
    let query = supabase
      .from('billing_records')
      .select(`
        *,
        resident:profiles!billing_records_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .order('created_at', { ascending: false })

    // Residents can only see their own records
    if (profile.role === 'resident') {
      query = query.eq('resident_id', user.id)
    }
    // Site admins can see records for their site
    else if (profile.role === 'site_admin' && profile.site_id) {
      query = query.eq('site_id', profile.site_id)
    }
    // Superadmins can see all records (no additional filter)

    const { data: billingRecords, error: recordsError } = await query

    if (recordsError) {
      console.error('Error fetching billing records:', recordsError)
      return NextResponse.json({ error: recordsError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      records: billingRecords || []
    })

  } catch (error) {
    console.error('Billing records API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins and site admins can create billing records
    if (!['admin', 'site_admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { resident_id, description, amount, due_date, status = 'pending' } = body

    // Validate required fields
    if (!resident_id || !description || !amount || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Create billing record
    const { data: billingRecord, error: createError } = await supabase
      .from('billing_records')
      .insert([{
        resident_id,
        description,
        amount: parseFloat(amount),
        due_date,
        status,
        site_id: profile.site_id,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        resident:profiles!billing_records_resident_id_fkey(id, first_name, last_name, email, unit_number)
      `)
      .single()

    if (createError) {
      console.error('Error creating billing record:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      record: billingRecord,
      message: 'Billing record created successfully'
    })

  } catch (error) {
    console.error('Create billing record API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
