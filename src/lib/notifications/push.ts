"use client"

import { initializeApp, type FirebaseOptions } from "firebase/app"
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging"

let messaging: Messaging | null = null

export function initFirebase(): void {
  // Check if Firebase environment variables are available
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    console.warn('[Push] Firebase not configured. Missing environment variables:', missingVars)
    return
  }

  const cfg: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  }

  // Basic guard to avoid re‑init
  if (typeof window === "undefined") return
  if ((window as any).__FIREBASE_APP__) return

  try {
    const app = initializeApp(cfg)
    ;(window as any).__FIREBASE_APP__ = app
  } catch (error) {
    console.warn('[Push] Firebase initialization failed:', error)
  }
}

export async function ensureMessaging(): Promise<Messaging | null> {
  if (!(await isSupported())) return null
  if (!messaging) {
    try {
      messaging = getMessaging()
    } catch {
      // Some browsers require explicit app; fallback
      const app = (window as any).__FIREBASE_APP__
      if (app) messaging = getMessaging(app)
    }
  }
  return messaging
}

export async function registerPush(): Promise<string | null> {
  try {
    // Check if Firebase is configured before proceeding
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.warn('[Push] Firebase not configured, skipping push registration')
      return null
    }

    initFirebase()

    // Check if Firebase was successfully initialized
    if (typeof window !== "undefined" && !(window as any).__FIREBASE_APP__) {
      console.warn('[Push] Firebase initialization failed, skipping push registration')
      return null
    }

    // Ensure the FCM service worker is registered
    try {
      const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      if (!existing) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      }
    } catch (e) {
      console.warn('[Push] SW registration warning', e)
    }

    const msg = await ensureMessaging()
    if (!msg) return null

    const perm = await Notification.requestPermission()
    if (perm !== "granted") return null

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY as string
    if (!vapidKey) {
      console.warn('[Push] VAPID key not configured')
      return null
    }

    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: await navigator.serviceWorker.ready })

    if (token) {
      localStorage.setItem("eden_push_token", token)
      // TODO: send token to backend to associate with user/department
      // await fetch('/api/push/register', { method: 'POST', body: JSON.stringify({ token }) })
      return token
    }
    return null
  } catch (e) {
    console.warn("[Push] Registration failed", e)
    return null
  }
}

export function onForegroundMessage(handler: (payload: any) => void) {
  // Check if Firebase is configured before setting up message listener
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn('[Push] Firebase not configured, skipping message listener setup')
    return
  }

  ensureMessaging().then((msg) => {
    if (!msg) return
    onMessage(msg, (payload) => handler(payload))
  }).catch((error) => {
    console.warn('[Push] Failed to set up message listener:', error)
  })
}

