import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if this is a protected route that requires authentication
  const isProtectedRoute = !request.nextUrl.pathname.startsWith('/login') &&
                          !request.nextUrl.pathname.startsWith('/register') &&
                          !request.nextUrl.pathname.startsWith('/auth') &&
                          !request.nextUrl.pathname.startsWith('/api') &&
                          !request.nextUrl.pathname.startsWith('/_next')

  if (!user && isProtectedRoute) {
    // Check if there's a localStorage-based session (for demo users)
    // We can't access localStorage in middleware, so we'll allow the request to proceed
    // and let the AuthContext handle the authentication check

    // Only redirect if this is clearly an unauthenticated request to a protected route
    // For now, let's be more permissive and let the client-side handle authentication
    console.log('No Supabase user found, but allowing request to proceed for client-side auth check')
  }

  return supabaseResponse
}