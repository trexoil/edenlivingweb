"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export default function SOSPage() {
  const { user } = useSimpleAuth()
  const [room, setRoom] = useState('sos')
  const [token, setToken] = useState('')
  const [url, setUrl] = useState('')
  const [identity, setIdentity] = useState('')
  const [loading, setLoading] = useState(false)

  async function getToken() {
    setLoading(true)
    try {
      const res = await fetch('/api/sos/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, identity: user?.id || undefined, name: user?.first_name || undefined })
      }).then(r => r.json())
      setToken(res.token || '')
      setUrl(res.url || '')
      setIdentity(res.identity || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SOS (LiveKit) – Token Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={room} onChange={e=>setRoom(e.target.value)} placeholder="room name (e.g. sos)" />
            <Button onClick={getToken} disabled={loading}>{loading? 'Please wait...':'Get Token'}</Button>
          </div>
          {token && (
            <div className="text-sm">
              <div className="mb-2"><b>LiveKit URL:</b> {url}</div>
              <div className="mb-2"><b>Identity:</b> {identity}</div>
              <div className="mb-2 break-all"><b>Token:</b> {token.slice(0, 24)}...</div>
              <div className="text-xs text-muted-foreground">To enable in-browser join, approve installing livekit-client and I’ll wire a minimal join UI.</div>
            </div>
          )}
        </CardContent>
      </Card>
      <div>
        {/* Minimal in-browser join UI */}
        {/* @ts-ignore */}
        {token && <div className="mt-4">{require('@/components/sos/SOSJoin').default()}</div>}
      </div>
    </div>
  )
}

