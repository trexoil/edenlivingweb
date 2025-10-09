'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { globalAuthState, subscribeToAuthState, updateGlobalAuthState } from '@/lib/auth-state'

interface Site {
  id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  total_bedrooms: number
  available_services: string[]
}

interface AuthContextType {
  user: Profile | null
  currentSite: Site | null
  availableSites: Site[]
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
  switchSite: (siteId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(globalAuthState.user)
  const [currentSite, setCurrentSite] = useState<Site | null>(globalAuthState.currentSite)
  const [availableSites, setAvailableSites] = useState<Site[]>(globalAuthState.availableSites)
  const [isLoading, setIsLoading] = useState(globalAuthState.isLoading)
  const router = useRouter()
  const supabase = createClient()

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(() => {
      console.log('SimpleAuthContext: State subscription triggered:', {
        user: globalAuthState.user?.email,
        role: globalAuthState.user?.role,
        isLoading: globalAuthState.isLoading,
        initialized: globalAuthState.initialized
      })
      setUser(globalAuthState.user)
      setCurrentSite(globalAuthState.currentSite)
      setAvailableSites(globalAuthState.availableSites)
      setIsLoading(globalAuthState.isLoading)

      // Handle redirects after auth state changes
      if (globalAuthState.initialized && !globalAuthState.isLoading) {
        const currentPath = window.location.pathname

        if (globalAuthState.user) {
          // Redirect authenticated users away from auth pages
          if (currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
            let redirectPath = '/dashboard'
            if (globalAuthState.user.role === 'superadmin') {
              redirectPath = '/superadmin'
            } else if (globalAuthState.user.role === 'site_admin') {
              redirectPath = '/siteadmin'
            }
            console.log('SimpleAuthContext: Redirecting authenticated user from', currentPath, 'to', redirectPath)
            router.push(redirectPath)
          }
          // Prevent superadmin from being redirected away from superadmin pages
          else if (globalAuthState.user.role === 'superadmin' && !currentPath.startsWith('/superadmin')) {
            console.log('SimpleAuthContext: Redirecting superadmin to /superadmin')
            router.push('/superadmin')
          }
          // Prevent regular users from accessing superadmin pages
          else if (globalAuthState.user.role !== 'superadmin' && currentPath.startsWith('/superadmin')) {
            console.log('SimpleAuthContext: Redirecting non-superadmin away from /superadmin')
            router.push('/dashboard')
          }
        } else {
          // Redirect unauthenticated users to login (except if already on auth pages, landing page, or public display)
          if (!currentPath.startsWith('/login') &&
              !currentPath.startsWith('/register') &&
              !currentPath.startsWith('/display') &&
              currentPath !== '/') {
            console.log('SimpleAuthContext: Redirecting unauthenticated user to /login')
            router.push('/login')
          }
        }
      }
    })

    return unsubscribe
  }, [router])

  // Initialize auth only once
  useEffect(() => {
    if (globalAuthState.initialized) {
      console.log('Auth already initialized, skipping')
      return
    }

    console.log('Initializing simple auth...', { globalAuthState })
    
    const initAuth = async () => {
      try {
        console.log('initAuth: Starting...')
        // Check localStorage first
        const storedSuperadmin = localStorage.getItem('superadmin_session')
        const storedSiteAdmin = localStorage.getItem('site_admin_session')
        const storedDemo = localStorage.getItem('demo_session')
        console.log('initAuth: Checked localStorage', {
          storedSuperadmin: !!storedSuperadmin,
          storedSiteAdmin: !!storedSiteAdmin,
          storedDemo: !!storedDemo
        })

        if (storedSuperadmin || storedSiteAdmin || storedDemo) {
          console.log('Found stored session, loading immediately')

          if (storedDemo) {
            console.log('initAuth: Restoring demo session from localStorage')
            const demoSession = JSON.parse(storedDemo)

            updateGlobalAuthState({
              user: demoSession.user,
              currentSite: demoSession.site,
              availableSites: [demoSession.site],
              isLoading: false,
              initialized: true
            })
            return
          } else if (storedSuperadmin) {
            const profile = JSON.parse(storedSuperadmin)

            // For superadmin, fetch available sites
            try {
              const { data: sites } = await supabase
                .from('sites')
                .select('*')
                .order('name', { ascending: true })

              updateGlobalAuthState({
                user: profile,
                availableSites: sites || [],
                currentSite: sites?.[0] || null,
                isLoading: false,
                initialized: true
              })
            } catch (error) {
              console.error('Error fetching sites for superadmin:', error)
              updateGlobalAuthState({
                user: profile,
                isLoading: false,
                initialized: true
              })
            }
          } else if (storedSiteAdmin) {
            const profile = JSON.parse(storedSiteAdmin)

            // For site admin, fetch their specific site
            try {
              if (profile.site_id) {
                console.log('SimpleAuth: Fetching site for site admin:', profile.site_id)
                const { data: site, error: siteError } = await supabase
                  .from('sites')
                  .select('*')
                  .eq('id', profile.site_id)
                  .single()

                if (siteError) {
                  console.error('SimpleAuth: Error fetching site:', siteError)
                  // Create a fallback site for the user
                  const fallbackSite = {
                    id: profile.site_id,
                    name: 'Eden Living Site',
                    address: '123 Site Street',
                    city: 'Site City',
                    state: 'Site State',
                    postal_code: '12345',
                    country: 'Malaysia',
                    total_bedrooms: 25,
                    available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
                  }

                  updateGlobalAuthState({
                    user: profile,
                    currentSite: fallbackSite,
                    availableSites: [fallbackSite],
                    isLoading: false,
                    initialized: true
                  })
                } else {
                  console.log('SimpleAuth: Successfully fetched site:', site?.name)
                  updateGlobalAuthState({
                    user: profile,
                    currentSite: site,
                    availableSites: site ? [site] : [],
                    isLoading: false,
                    initialized: true
                  })
                }
              } else {
                console.warn('SimpleAuth: Site admin has no site_id assigned')
                updateGlobalAuthState({
                  user: profile,
                  isLoading: false,
                  initialized: true
                })
              }
            } catch (error) {
              console.error('SimpleAuth: Error in site admin initialization:', error)
              // Create a fallback site even on error
              const fallbackSite = {
                id: profile.site_id || 'fallback-site',
                name: 'Eden Living Site',
                address: '123 Site Street',
                city: 'Site City',
                state: 'Site State',
                postal_code: '12345',
                country: 'Malaysia',
                total_bedrooms: 25,
                available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
              }

              updateGlobalAuthState({
                user: profile,
                currentSite: fallbackSite,
                availableSites: [fallbackSite],
                isLoading: false,
                initialized: true
              })
            }
          }
          return
        }

        // Check Supabase session
        console.log('initAuth: Checking Supabase session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('initAuth: Supabase session result', { hasSession: !!session, hasUser: !!session?.user })

        if (session?.user) {
          console.log('initAuth: Fetching user profile...')
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          console.log('initAuth: Profile result', { profile: profile?.email, role: profile?.role })

          if (profile) {
            console.log('initAuth: Processing profile for role:', profile.role)
            // Fetch site data based on user role
            try {
              if (profile.role === 'superadmin') {
                console.log('initAuth: Fetching sites for superadmin...')
                const { data: sites } = await supabase
                  .from('sites')
                  .select('*')
                  .order('name', { ascending: true })

                console.log('initAuth: Updating state for superadmin')
                updateGlobalAuthState({
                  user: profile,
                  availableSites: sites || [],
                  currentSite: sites?.[0] || null,
                  isLoading: false,
                  initialized: true
                })
              } else if (profile.site_id) {
                console.log('initAuth: Fetching site for user with site_id:', profile.site_id)
                const { data: site, error: siteError } = await supabase
                  .from('sites')
                  .select('*')
                  .eq('id', profile.site_id)
                  .single()

                if (siteError) {
                  console.error('initAuth: Error fetching site:', siteError)
                  // Create fallback site for site admin users
                  if (profile.role === 'site_admin') {
                    const fallbackSite = {
                      id: profile.site_id,
                      name: 'Eden Living Site',
                      address: '123 Site Street',
                      city: 'Site City',
                      state: 'Site State',
                      postal_code: '12345',
                      country: 'Malaysia',
                      total_bedrooms: 25,
                      available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
                    }

                    console.log('initAuth: Using fallback site for site admin')
                    updateGlobalAuthState({
                      user: profile,
                      currentSite: fallbackSite,
                      availableSites: [fallbackSite],
                      isLoading: false,
                      initialized: true
                    })
                  } else {
                    console.log('initAuth: Updating state for user with site error (not site admin)')
                    updateGlobalAuthState({
                      user: profile,
                      isLoading: false,
                      initialized: true
                    })
                  }
                } else {
                  console.log('initAuth: Updating state for site user')
                  updateGlobalAuthState({
                    user: profile,
                    currentSite: site,
                    availableSites: site ? [site] : [],
                    isLoading: false,
                    initialized: true
                  })
                }
              } else {
                console.log('initAuth: Updating state for regular user (no site)')
                updateGlobalAuthState({
                  user: profile,
                  isLoading: false,
                  initialized: true
                })
              }
            } catch (error) {
              console.error('initAuth: Error fetching site data:', error)
              console.log('initAuth: Updating state with error fallback')

              // If it's a site admin, provide a fallback site
              if (profile?.role === 'site_admin' && profile?.site_id) {
                const fallbackSite = {
                  id: profile.site_id,
                  name: 'Eden Living Site',
                  address: '123 Site Street',
                  city: 'Site City',
                  state: 'Site State',
                  postal_code: '12345',
                  country: 'Malaysia',
                  total_bedrooms: 25,
                  available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
                }

                updateGlobalAuthState({
                  user: profile,
                  currentSite: fallbackSite,
                  availableSites: [fallbackSite],
                  isLoading: false,
                  initialized: true
                })
              } else {
                updateGlobalAuthState({
                  user: profile,
                  isLoading: false,
                  initialized: true
                })
              }
            }
          }
        } else {
          console.log('initAuth: No session found, setting user to null')
          updateGlobalAuthState({
            user: null,
            isLoading: false,
            initialized: true
          })
        }
      } catch (error) {
        console.error('initAuth: Error during initialization:', error)
        updateGlobalAuthState({
          user: null,
          isLoading: false,
          initialized: true
        })
      }
    }

    console.log('Starting auth initialization...')
    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    // Check for demo user (only superadmin demo account)
    const isDemoUser = (email === 'superadmin@eden.com' && password === 'password123')

    if (isDemoUser) {
      console.log('Demo superadmin login detected in SimpleAuthContext')

      // Create mock superadmin profile
      const userDetails = { id: 'demo-superadmin-id', firstName: 'Super', role: 'superadmin', unit: 'ADMIN' }

      const mockProfile: Profile = {
        id: userDetails.id,
        email: email,
        first_name: userDetails.firstName,
        last_name: 'Admin',
        role: userDetails.role as 'admin' | 'resident' | 'site_admin' | 'superadmin',
        unit: userDetails.unit,
        site_id: null, // Superadmin doesn't belong to a specific site
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store demo session in localStorage for persistence
      localStorage.setItem('demo_session', JSON.stringify({
        user: mockProfile,
        site: null // Superadmin doesn't have a specific site
      }))

      // For superadmin, we'll fetch all sites from Supabase or use empty array for demo
      try {
        const { data: sites } = await supabase
          .from('sites')
          .select('*')
          .order('name', { ascending: true })

        // Update global auth state with all sites for superadmin
        updateGlobalAuthState({
          user: mockProfile,
          currentSite: sites?.[0] || null,
          availableSites: sites || [],
          isLoading: false,
          initialized: true
        })
      } catch (error) {
        console.error('Error fetching sites for demo superadmin:', error)
        // Fallback: update state without sites
        updateGlobalAuthState({
          user: mockProfile,
          currentSite: null,
          availableSites: [],
          isLoading: false,
          initialized: true
        })
      }

      return { user: mockProfile, session: null }
    }

    // Regular Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    // After successful sign-in, refresh the session to get updated JWT with custom claims
    if (data.session) {
      console.log('signIn: Refreshing session to get updated JWT with custom claims...')
      await supabase.auth.refreshSession()

      // Small delay to ensure the refresh completes
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // After successful sign-in, fetch profile and update global auth state
    if (data.session?.user) {
      try {
        console.log('signIn: Fetching user profile after successful Supabase sign-in...')
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single()

        if (profile) {
          console.log('signIn: Processing profile for role:', profile.role)
          // Fetch site data based on user role (same logic as initAuth)
          if (profile.role === 'superadmin') {
            console.log('signIn: Fetching sites for superadmin...')
            const { data: sites } = await supabase
              .from('sites')
              .select('*')
              .order('name', { ascending: true })

            console.log('signIn: Updating state for superadmin')
            updateGlobalAuthState({
              user: profile,
              availableSites: sites || [],
              currentSite: sites?.[0] || null,
              isLoading: false,
              initialized: true
            })
          } else if (profile.site_id) {
            console.log('signIn: Fetching site for user with site_id:', profile.site_id)
            const { data: site } = await supabase
              .from('sites')
              .select('*')
              .eq('id', profile.site_id)
              .single()

            console.log('signIn: Updating state for site user')
            updateGlobalAuthState({
              user: profile,
              currentSite: site,
              availableSites: site ? [site] : [],
              isLoading: false,
              initialized: true
            })
          } else {
            console.log('signIn: Updating state for regular user (no site)')
            updateGlobalAuthState({
              user: profile,
              isLoading: false,
              initialized: true
            })
          }
        }
      } catch (error) {
        console.error('signIn: Error fetching profile after sign-in:', error)
        // Still update state to clear loading, even if profile fetch fails
        updateGlobalAuthState({
          user: null,
          isLoading: false,
          initialized: true
        })
      }
    }

    return data
  }

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })

    if (error) {
      throw error
    }

    return data
  }

  const signOut = async () => {
    // Clear all stored sessions
    localStorage.removeItem('superadmin_session')
    localStorage.removeItem('site_admin_session')
    localStorage.removeItem('demo_session')

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
    }

    updateGlobalAuthState({
      user: null,
      currentSite: null,
      availableSites: [],
      initialized: false,
      isLoading: false
    })

    router.push('/login')
  }

  const switchSite = async (siteId: string) => {
    const site = availableSites.find(s => s.id === siteId)
    if (site) {
      updateGlobalAuthState({
        currentSite: site
      })
      localStorage.setItem('lastSiteId', siteId)
      router.refresh()
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      currentSite,
      availableSites,
      isLoading,
      signIn,
      signUp,
      signOut,
      switchSite
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSimpleAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}
