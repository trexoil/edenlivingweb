import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, formatAmountForStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('Create payment intent API called')

    // For demo purposes, skip auth and work directly with billing records

    const body = await request.json()
    const { billing_record_id, amount, currency = 'myr' } = body

    console.log('Payment intent request:', { billing_record_id, amount, currency })

    // Validate required fields
    if (!billing_record_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the billing record to verify
    const { data: billingRecord, error: recordError } = await supabase
      .from('billing_records')
      .select('*')
      .eq('id', billing_record_id)
      .single()

    console.log('Billing record query:', { billingRecord, recordError })

    if (recordError || !billingRecord) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 })
    }

    // Check if already paid
    if (billingRecord.status === 'paid') {
      return NextResponse.json({ error: 'This record is already paid' }, { status: 400 })
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(parseFloat(amount)),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        billing_record_id,
        description: billingRecord.description || 'Billing payment'
      }
    })

    console.log('Payment intent created:', paymentIntent.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('Create payment intent error:', error)
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
