import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Only staff, admins can update service request status
    if (!['staff', 'admin', 'site_admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get service request
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (requestError || !serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    // Check if staff can update this request (department match - case insensitive)
    if (profile.role === 'staff') {
      const staffDept = (profile.department || '').toLowerCase()
      const requestDept = (serviceRequest.department_assigned || '').toLowerCase()
      if (staffDept !== requestDept) {
        return NextResponse.json({
          error: 'You can only update requests assigned to your department'
        }, { status: 403 })
      }
    }

    // Parse request body
    const body = await request.json()
    const { status, assigned_staff_id, actual_cost, notes } = body

    // Validate status
    const validStatuses = [
      'pending', 'auto_approved', 'manual_review', 'assigned',
      'processing', 'in_progress', 'awaiting_completion', 'completed', 'invoiced', 'cancelled'
    ]

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (assigned_staff_id) updateData.assigned_staff_id = assigned_staff_id
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost
    if (notes) updateData.notes = notes

    // Set completion date if status is completed
    if (status === 'completed') {
      updateData.completed_date = new Date().toISOString()
    }

    // Use admin client for update to bypass RLS (permission already validated above)
    const adminClient = createAdminClient()

    console.log('Attempting update with adminClient:', { id, updateData })

    const { data: updatedRequest, error: updateError } = await adminClient
      .from('service_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating service request:', JSON.stringify(updateError, null, 2))
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log(`Service request ${id} updated to status: ${status} by ${profile.email}`)

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })

  } catch (error) {
    console.error('Update service request API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}