import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get service request with related data
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!service_requests_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('id', params.id)
      .single()

    if (requestError) {
      console.error('Error fetching service request:', requestError)
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    return NextResponse.json({ request: serviceRequest })

  } catch (error) {
    console.error('Get service request API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { 
      status, 
      priority, 
      assigned_to, 
      scheduled_date,
      completed_date,
      title, 
      description,
      meal_preferences,
      laundry_instructions,
      housekeeping_details,
      transportation_details,
      maintenance_location,
      care_requirements,
      medical_notes
    } = body

    // Get the existing service request to check permissions
    const { data: existingRequest, error: fetchError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    // Prepare update data based on user role
    let updateData: any = {}

    if (profile.role === 'resident') {
      // Residents can only update their own requests and limited fields
      if (existingRequest.resident_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      
      // Residents can only update certain fields if request is still pending
      if (existingRequest.status === 'pending') {
        if (title) updateData.title = title
        if (description) updateData.description = description
        if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date
        if (meal_preferences !== undefined) updateData.meal_preferences = meal_preferences
        if (laundry_instructions !== undefined) updateData.laundry_instructions = laundry_instructions
        if (housekeeping_details !== undefined) updateData.housekeeping_details = housekeeping_details
        if (transportation_details !== undefined) updateData.transportation_details = transportation_details
        if (maintenance_location !== undefined) updateData.maintenance_location = maintenance_location
        if (care_requirements !== undefined) updateData.care_requirements = care_requirements
        if (medical_notes !== undefined) updateData.medical_notes = medical_notes
      }
    } else if (profile.role === 'site_admin' || profile.role === 'admin' || profile.role === 'staff') {
      // Staff can update requests in their site
      if (profile.site_id !== existingRequest.site_id && profile.role !== 'superadmin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Staff can update all fields
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to
      if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date
      if (completed_date !== undefined) updateData.completed_date = completed_date
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (meal_preferences !== undefined) updateData.meal_preferences = meal_preferences
      if (laundry_instructions !== undefined) updateData.laundry_instructions = laundry_instructions
      if (housekeeping_details !== undefined) updateData.housekeeping_details = housekeeping_details
      if (transportation_details !== undefined) updateData.transportation_details = transportation_details
      if (maintenance_location !== undefined) updateData.maintenance_location = maintenance_location
      if (care_requirements !== undefined) updateData.care_requirements = care_requirements
      if (medical_notes !== undefined) updateData.medical_notes = medical_notes

      // Set completed_date when status changes to completed
      if (status === 'completed' && existingRequest.status !== 'completed') {
        updateData.completed_date = new Date().toISOString()
      } else if (status !== 'completed') {
        updateData.completed_date = null
      }
    } else if (profile.role === 'superadmin') {
      // Superadmin can update everything
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to
      if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date
      if (completed_date !== undefined) updateData.completed_date = completed_date
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (meal_preferences !== undefined) updateData.meal_preferences = meal_preferences
      if (laundry_instructions !== undefined) updateData.laundry_instructions = laundry_instructions
      if (housekeeping_details !== undefined) updateData.housekeeping_details = housekeeping_details
      if (transportation_details !== undefined) updateData.transportation_details = transportation_details
      if (maintenance_location !== undefined) updateData.maintenance_location = maintenance_location
      if (care_requirements !== undefined) updateData.care_requirements = care_requirements
      if (medical_notes !== undefined) updateData.medical_notes = medical_notes

      if (status === 'completed' && existingRequest.status !== 'completed') {
        updateData.completed_date = new Date().toISOString()
      } else if (status !== 'completed') {
        updateData.completed_date = null
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If no updates, return current request
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: true, 
        request: existingRequest 
      })
    }

    // Update service request
    const { data: serviceRequest, error: updateError } = await supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        resident:profiles!service_requests_resident_id_fkey(id, first_name, last_name, email, unit_number),
        assigned_staff:profiles!service_requests_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating service request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      request: serviceRequest 
    })

  } catch (error) {
    console.error('Update service request API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
