import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

/**
 * Creates a Supabase client for mobile API endpoints that can handle Bearer tokens
 * from the Authorization header instead of relying on cookies.
 */
export async function createMobileClient(request: NextRequest) {
  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get('authorization')
  let accessToken: string | null = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() {
          // For mobile clients, we don't use cookies
          return undefined
        },
        set() {
          // For mobile clients, we don't set cookies
        },
        remove() {
          // For mobile clients, we don't remove cookies
        },
      },
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    }
  )
}

/**
 * Alternative approach: Create client with proper token handling for server-side
 */
export async function createMobileClientWithSession(request: NextRequest) {
  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get('authorization')
  let accessToken: string | null = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  console.log('Mobile client - Auth header:', authHeader ? 'Present' : 'Missing')
  console.log('Mobile client - Access token:', accessToken ? 'Present' : 'Missing')

  // Check if this is a demo token
  if (accessToken && accessToken.startsWith('demo-token-')) {
    console.log('Demo token detected, creating mock client')
    // For demo tokens, we'll create a client but handle auth differently
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return undefined
          },
          set() {
            // No-op for mobile
          },
          remove() {
            // No-op for mobile
          },
        },
        // Don't pass the demo token to Supabase
      }
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {
          // No-op for mobile
        },
        remove() {
          // No-op for mobile
        },
      },
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    }
  )
}
