"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface OrderItem { name: string; price: number; qty: number }
interface Order { id: string; resident_id: string; status: string; items: OrderItem[]; total_amount?: number }

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<'submitted'|'processing'|'delivering'|'completed'>('submitted')
  const [loading, setLoading] = useState(false)
  const [qrData, setQrData] = useState('')
  const router = useRouter()

  const statusTabs = useMemo(() => [
    { key: 'submitted', label: 'Submitted' },
    { key: 'processing', label: 'Processing' },
    { key: 'delivering', label: 'Delivering' },
    { key: 'completed', label: 'Completed' },
  ] as const, [])

  async function load() {
    setLoading(true)
    console.log('[KitchenDashboard] Fetching orders with status:', status)
    const res = await fetch(`/api/restaurant/orders?status=${status}`).then(r => r.json())
    console.log('[KitchenDashboard] API response:', res)
    console.log('[KitchenDashboard] Orders count:', res.orders?.length || 0)
    setOrders(res.orders || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [status])

  async function advance(order: Order, next: 'processing'|'delivering'|'completed') {
    await fetch(`/api/restaurant/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    })
    await load()
  }

  async function scanComplete() {
    if (!qrData) return
    await fetch('/api/staff/scan-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_data: qrData })
    })
    setQrData('')
    await load()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kitchen Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {statusTabs.map(tab => (
              <Button key={tab.key} variant={status===tab.key? 'default':'outline'} onClick={()=>setStatus(tab.key)}>
                {tab.label}
              </Button>
            ))}
          </div>
          {loading && <div>Loading...</div>}
          {!loading && orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {status} orders found
            </div>
          )}
          {!loading && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map(o => (
                <Card key={o.id}>
                  <CardHeader>
                    <CardTitle>Order #{o.id.slice(0,6)} • RM{Number(o.total_amount||0).toFixed(2)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm list-disc ml-4 mb-3">
                      {(o.items||[]).map((it,idx) => (
                        <li key={idx}>{it.qty||1} x {it.name} @ RM{Number(it.price).toFixed(2)}</li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      {o.status==='submitted' && (
                        <Button onClick={()=>advance(o,'processing')}>Start Processing</Button>
                      )}
                      {o.status==='processing' && (
                        <Button onClick={()=>advance(o,'delivering')}>Mark Delivering</Button>
                      )}
                      {o.status === 'delivering' && (
                        <Button
                          variant="outline"
                          onClick={() => router.push('/staff/scanner')}
                        >
                          Scan Resident QR
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Completion (Paste QR data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Paste scanned QR JSON here" value={qrData} onChange={e=>setQrData(e.target.value)} />
            <Button onClick={scanComplete}>Submit</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">For demo: copy QR JSON from the QR image or a scanner app and paste here to complete.</div>
        </CardContent>
      </Card>
    </div>
  )
}



