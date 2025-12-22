import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateQRCode } from '@/lib/qr-code'
import { generateDraftInvoice } from '@/lib/invoicing/generator'
import { sendPushToTokens } from '@/lib/notifications/push-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff profile
    const { data: staff, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !staff) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only staff can scan QR codes
    if (!['staff', 'admin', 'site_admin'].includes(staff.role)) {
      return NextResponse.json({ error: 'Only staff can scan QR codes' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { qr_data } = body

    if (!qr_data) {
      return NextResponse.json({ error: 'QR data is required' }, { status: 400 })
    }

    // Validate QR code
    console.log('Validating QR code:', qr_data)
    const qrCodeData = validateQRCode(qr_data)
    console.log('QR code validation result:', qrCodeData)

    if (!qrCodeData) {
      return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 })
    }

    // Get the QR code record from database by matching the token
    console.log('Looking for QR record by token')
    console.log('Token length:', qr_data.length)
    console.log('Token preview:', qr_data.substring(0, 100))

    const { data: qrRecord, error: qrError } = await supabase
      .from('service_qr_codes')
      .select('*')
      .eq('token', qr_data)
      .eq('is_used', false)
      .single()

    console.log('QR record found:', !!qrRecord, 'Error:', qrError)

    if (qrError) {
      console.log('QR Error details:', JSON.stringify(qrError, null, 2))
    }

    if (qrRecord) {
      console.log('QR Record:', {
        id: qrRecord.id,
        order_id: qrRecord.order_id,
        service_request_id: qrRecord.service_request_id,
        qr_type: qrRecord.qr_type,
        is_used: qrRecord.is_used
      })
    }

    if (qrError || !qrRecord) {
      return NextResponse.json({
        error: 'QR code not found or already used',
        debug: {
          qrError: qrError?.message,
          qrErrorCode: qrError?.code,
          searchedToken: qr_data.substring(0, 50) + '...',
          tokenLength: qr_data.length
        }
      }, { status: 400 })
    }

    // Check if QR code has expired
    if (new Date(qrRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'QR code has expired' }, { status: 400 })
    }

    // Check if this is an order (restaurant) or service request
    let order = null
    if (qrRecord.order_id) {
      console.log('Checking if order exists for ID:', qrRecord.order_id)
      const { data: foundOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', qrRecord.order_id)
        .single()
      order = foundOrder
      console.log('Order found:', !!order)
    }

    // Check if QR code has expired
    if (new Date(qrRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'QR code has expired' }, { status: 400 })
    }

    if (order) {
      // This is a restaurant order - handle order completion
      if (qrCodeData.qrType !== 'completion') {
        return NextResponse.json({
          error: 'Only completion QR codes are supported for orders'
        }, { status: 400 })
      }

      // Mark order as completed
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      // Mark QR code as used
      await supabaseAdmin
        .from('service_qr_codes')
        .update({
          is_used: true,
          scanned_at: new Date().toISOString(),
          scanned_by: staff.id
        })
        .eq('id', qrRecord.id)

      // Create invoice
      const description = `Restaurant Order #${order.id.slice(0, 8)}`
      await supabase
        .from('service_invoices')
        .insert({
          service_request_id: order.id,
          resident_id: order.resident_id,
          site_id: order.site_id || null,
          amount: Number(order.total) || 0,
          tax_amount: 0,
          total_amount: Number(order.total) || 0,
          description,
          status: 'draft',
          created_by: staff.id,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      // Notify resident
      try {
        const { data: residentTokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', order.resident_id)
          .eq('is_active', true)

        if (residentTokens && residentTokens.length > 0) {
          const tokens = residentTokens.map(t => t.token)
          await sendPushToTokens(
            tokens,
            { title: 'Order Completed', body: 'Your restaurant order has been delivered!' },
            { type: 'order_completed', order_id: order.id }
          )
        }
      } catch (pushError) {
        console.warn('Push notification failed:', pushError)
      }

      return NextResponse.json({
        success: true,
        new_status: 'completed',
        qr_type: 'completion',
        resource_type: 'order',
        resource_id: order.id,
        scanned_by: staff.first_name + ' ' + staff.last_name,
        scanned_at: new Date().toISOString()
      })
    }

    // Not an order, so it must be a service request
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', qrCodeData.serviceRequestId)
      .single()

    if (requestError || !serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    // Check if staff belongs to the same department as the request
    if (staff.role === 'staff' && staff.department !== serviceRequest.department_assigned) {
      return NextResponse.json({
        error: 'You can only scan QR codes for your department'
      }, { status: 403 })
    }

    // Determine new status based on QR type
    let newStatus = serviceRequest.status
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (qrCodeData.qrType === 'start') {
      // Start service - update status to in_progress
      if (!['assigned', 'processing'].includes(serviceRequest.status)) {
        return NextResponse.json({
          error: 'Service must be assigned or processing to start'
        }, { status: 400 })
      }

      newStatus = 'in_progress'
      updateData.status = newStatus
      updateData.started_at = new Date().toISOString()
      updateData.assigned_to = staff.id

    } else if (qrCodeData.qrType === 'completion') {
      // Complete service - update status to completed
      if (serviceRequest.status !== 'in_progress') {
        return NextResponse.json({
          error: 'Service must be in progress to complete'
        }, { status: 400 })
      }

      newStatus = 'completed'
      updateData.status = newStatus
      updateData.completed_at = new Date().toISOString()
      updateData.completed_date = new Date().toISOString()

      // Set actual cost if not already set
      if (!serviceRequest.actual_cost) {
        updateData.actual_cost = serviceRequest.estimated_cost
      }
    }

    // Update service request status
    const { error: updateError } = await supabaseAdmin
      .from('service_requests')
      .update(updateData)
      .eq('id', qrCodeData.serviceRequestId)

    if (updateError) {
      console.error('Error updating service request:', updateError)
      return NextResponse.json({ error: 'Failed to update service request' }, { status: 500 })
    }

    // Mark QR code as used
    await supabaseAdmin
      .from('service_qr_codes')
      .update({
        is_used: true,
        scanned_at: new Date().toISOString(),
        scanned_by: staff.id
      })
      .eq('id', qrRecord.id)

    // If completion scan, trigger invoice generation and notify resident
    if (qrCodeData.qrType === 'completion') {
      try {
        const invoice = await generateDraftInvoice(qrCodeData.serviceRequestId)
        console.log(`Invoice generated: ${invoice?.id}`)

        // Send push notification to resident about completion
        const { data: residentTokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', serviceRequest.resident_id)
          .eq('is_active', true)

        if (residentTokens && residentTokens.length > 0) {
          const tokens = residentTokens.map(t => t.token)
          await sendPushToTokens(
            tokens,
            {
              title: 'Service Completed',
              body: `Your ${serviceRequest.type} service has been completed. Pro forma invoice generated.`
            },
            { type: 'service_completed', request_id: serviceRequest.id }
          )
        }
      } catch (error) {
        console.error('Error generating invoice or sending notification:', error)
        // Don't fail the QR scan if invoice generation fails
      }
    }

    console.log(`QR code scanned successfully: ${qrCodeData.qrType} for service ${qrCodeData.serviceRequestId}`)

    return NextResponse.json({
      success: true,
      new_status: newStatus,
      qr_type: qrCodeData.qrType,
      service_request_id: qrCodeData.serviceRequestId,
      scanned_by: staff.first_name + ' ' + staff.last_name,
      scanned_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Scan QR code API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

