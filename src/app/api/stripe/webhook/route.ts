import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        console.log('Payment succeeded:', paymentIntent.id)

        // Get billing record ID from metadata
        const billingRecordId = paymentIntent.metadata.billing_record_id
        
        if (billingRecordId) {
          // Update billing record to paid status
          const { error: updateError } = await supabase
            .from('billing_records')
            .update({
              status: 'paid',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'card',
              stripe_payment_intent_id: paymentIntent.id,
              transaction_id: paymentIntent.id
            })
            .eq('id', billingRecordId)

          if (updateError) {
            console.error('Error updating billing record:', updateError)
          } else {
            console.log('Billing record updated successfully:', billingRecordId)
          }
        }
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object
        console.log('Payment failed:', failedPayment.id)
        // Handle payment failure if needed
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
