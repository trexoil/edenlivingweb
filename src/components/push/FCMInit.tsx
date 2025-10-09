"use client"

import { useEffect } from "react"
import { registerPush, onForegroundMessage } from "@/lib/notifications/push"
import { toast } from "sonner"
import { useSimpleAuth } from "@/contexts/SimpleAuthContext"

export default function FCMInit() {
  const { user } = useSimpleAuth()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const token = await registerPush()
      if (mounted) {
        if (token) {
          // send to backend for targeting
          try {
            await fetch('/api/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, platform: 'web', user_id: user?.id, department: user?.department || null })
            })
          } catch {}
          // eslint-disable-next-line no-console
          console.log("[Push] Registered token", token.slice(0, 10) + "...")
        } else {
          console.log("[Push] Permission denied or not supported")
        }
      }
    })()

    onForegroundMessage((payload) => {
      const title = payload?.notification?.title || "Notification"
      const body = payload?.notification?.body || ""
      toast(`${title}: ${body}`)

      // Handle navigation based on message data
      if (payload.data?.type === 'sos_emergency') {
        // For SOS emergency, navigate immediately to join page
        const roomName = payload.data?.room_name || ''
        if (roomName) {
          window.location.href = `/sos/join?room=${roomName}`
        }
      } else if (payload.data?.type === 'order_completed' && payload.data?.order_id) {
        console.log('Order completed:', payload.data.order_id)
      } else if (payload.data?.type === 'kitchen_order_new') {
        // Navigate to kitchen dashboard if not already there
        if (window.location.pathname !== '/kitchen') {
          setTimeout(() => window.location.href = '/kitchen', 1000)
        }
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return null
}

