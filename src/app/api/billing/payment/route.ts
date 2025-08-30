import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('Payment API called')

    // For demo purposes, let's skip auth and work directly with the billing record
    // In production, you'd want proper authentication

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const {
      billing_record_id,
      payment_method = 'card',
      stripe_payment_intent_id,
      transaction_id
    } = body

    console.log('Payment request body:', body)

    // Validate required fields
    if (!billing_record_id) {
      return NextResponse.json({ error: 'Billing record ID is required' }, { status: 400 })
    }

    // Get the billing record
    const { data: billingRecords, error: recordError } = await supabase
      .from('billing_records')
      .select('*')
      .eq('id', billing_record_id)

    console.log('Billing record query result:', { billingRecords, recordError, billing_record_id })

    if (recordError) {
      console.error('Database error:', recordError)
      return NextResponse.json({ error: recordError.message }, { status: 400 })
    }

    if (!billingRecords || billingRecords.length === 0) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 })
    }

    const billingRecord = billingRecords[0]

    // Check if already paid
    if (billingRecord.status === 'paid') {
      return NextResponse.json({ error: 'This record is already paid' }, { status: 400 })
    }

    // Update billing record to paid status
    console.log('Attempting to update billing record:', billing_record_id)

    const updateData = {
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0], // Today's date
      payment_method: payment_method || 'card',
      stripe_payment_intent_id: stripe_payment_intent_id || null,
      transaction_id: transaction_id || null
    }

    console.log('Update data:', updateData)

    const { data: updatedRecords, error: updateError } = await supabase
      .from('billing_records')
      .update(updateData)
      .eq('id', billing_record_id)
      .select('*')

    console.log('Update result:', { updatedRecords, updateError, recordCount: updatedRecords?.length })

    if (updateError) {
      console.error('Error updating billing record:', updateError)
      return NextResponse.json({
        error: `Database update failed: ${updateError.message}`,
        details: updateError
      }, { status: 400 })
    }

    if (!updatedRecords || updatedRecords.length === 0) {
      console.error('No records updated - record may not exist')
      return NextResponse.json({
        error: 'No records were updated. Record may not exist.',
        billing_record_id
      }, { status: 400 })
    }

    const updatedRecord = updatedRecords[0]
    console.log('Successfully updated record:', updatedRecord.id)

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      message: 'Payment processed successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('Payment processing API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}
