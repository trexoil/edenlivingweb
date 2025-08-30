'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CreditCard, Lock } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  billingRecordId: string
  amount: number
  description: string
  onSuccess: () => void
  onCancel: () => void
}

const PaymentForm = ({ billingRecordId, amount, description, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      toast.error('Stripe not loaded properly')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      toast.error('Card element not found')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create Payment Intent on server
      const createResponse = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'myr',
          billing_record_id: billingRecordId
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const { clientSecret } = await createResponse.json()

      // Step 2: Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Paul Beyong', // You can make this dynamic later
          },
        }
      })

      if (error) {
        console.error('Stripe payment error:', error)
        throw new Error(error.message || 'Payment failed')
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Step 3: Update billing record
        const updateResponse = await fetch('/api/billing/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billing_record_id: billingRecordId,
            payment_method: 'card',
            stripe_payment_intent_id: paymentIntent.id,
            transaction_id: paymentIntent.id
          }),
        })

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          console.error('Update billing record failed:', errorData)
          throw new Error(errorData.error || 'Failed to update billing record')
        }

        const updateResult = await updateResponse.json()
        console.log('Billing record updated successfully:', updateResult)

        toast.success('Payment successful!', {
          description: 'Your payment has been processed successfully.',
        })

        onSuccess()
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Payment Summary</h3>
            <p className="text-sm text-gray-600 mb-2">{description}</p>
            <p className="text-lg font-bold">{formatCurrency(amount)}</p>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border rounded-lg p-4">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                  hidePostalCode: false,
                }}
              />
            </div>

            {/* Demo Card Info */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-semibold text-blue-800 mb-1">Demo Mode - Enter Valid Card Details</p>
              <p className="text-blue-700">Card: 4242 4242 4242 4242</p>
              <p className="text-blue-700">Expiry: 12/25, CVC: 123, ZIP: 12345</p>
              <p className="text-blue-600 text-xs mt-1">Fill all fields completely</p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!stripe || loading}
                className="flex-1"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay {formatCurrency(amount)}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="text-xs text-gray-500 text-center">
            <Lock className="w-3 h-3 inline mr-1" />
            Your payment information is secure and encrypted
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StripePaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  )
}
