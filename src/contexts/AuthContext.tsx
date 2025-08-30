'use client'

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface Site {
  id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  total_bedrooms: number // Keep for backward compatibility
  total_units?: number   // New field
  available_services: string[]
}

interface AuthContextType {
  user: Profile | null
  currentSite: Site | null
  isLoading: boolean
  signIn: (email: string, password: string, siteId?: string) => Promise<void>
  signUp: (email: string, password: string, profileData: Partial<Profile>, siteId?: string) => Promise<void>
  signOut: () => Promise<void>
  switchSite: (siteId: string) => Promise<void>
  availableSites: Site[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Global state to prevent re-initialization
let globalAuthState = {
  initialized: false,
  user: null as Profile | null,
  currentSite: null as Site | null,
  availableSites: [] as Site[]
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(globalAuthState.user)
  const [currentSite, setCurrentSite] = useState<Site | null>(globalAuthState.currentSite)
  const [availableSites, setAvailableSites] = useState<Site[]>(globalAuthState.availableSites)
  const [isLoading, setIsLoading] = useState(!globalAuthState.initialized)
  const router = useRouter()

  // Create stable supabase client
  const supabase = useMemo(() => createClient(), [])

  // Helper function to update both local and global state
  const updateUserState = (newUser: Profile | null) => {
    setUser(newUser)
    globalAuthState.user = newUser
  }

  const updateSiteState = (newSite: Site | null) => {
    setCurrentSite(newSite)
    globalAuthState.currentSite = newSite
  }

  const updateAvailableSitesState = (newSites: Site[]) => {
    setAvailableSites(newSites)
    globalAuthState.availableSites = newSites
  }

  useEffect(() => {
    // Prevent re-initialization if already initialized globally
    if (globalAuthState.initialized) {
      console.log('Auth already initialized globally, restoring state')
      setUser(globalAuthState.user)
      setCurrentSite(globalAuthState.currentSite)
      setAvailableSites(globalAuthState.availableSites)
      setIsLoading(false)
      return
    }

    console.log('Initializing auth context for the first time...')

    // Quick check - if we have localStorage data, set loading to false immediately
    const hasStoredSession = localStorage.getItem('superadmin_session') || localStorage.getItem('site_admin_session')
    if (hasStoredSession) {
      console.log('Found stored session, setting loading to false immediately')
      setIsLoading(false)
    }

    // Get initial session and user data
    const initializeAuth = async () => {
      try {
        // Check for stored superadmin session first
        const storedSuperadmin = localStorage.getItem('superadmin_session')
        const storedSiteAdmin = localStorage.getItem('site_admin_session')

        if (storedSuperadmin) {
          console.log('Restoring superadmin session from localStorage')
          const superadminProfile = JSON.parse(storedSuperadmin)
          updateUserState(superadminProfile)
          
          // Restore sites for superadmin
          try {
            const { data: sites, error } = await supabase
              .from('sites')
              .select('*')
              .order('name')
            
            if (!error && sites) {
              setAvailableSites(sites)
              const lastSiteId = localStorage.getItem('lastSiteId')
              const currentSite = sites.find(site => site.id === lastSiteId) || sites[0] || null
              setCurrentSite(currentSite)
            } else {
              // Fallback to mock site
              const mockSite: Site = {
                id: '00000000-0000-0000-0000-000000000001',
                name: 'Eden Living Main Site',
                address: '123 Main Street',
                city: 'Demo City',
                state: 'Demo State',
                postal_code: '12345',
                country: 'Malaysia',
                total_bedrooms: 50,
                available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
              }
              setCurrentSite(mockSite)
              setAvailableSites([mockSite])
            }
          } catch (error) {
            console.warn('Could not fetch sites for superadmin, using mock site:', error)
            const mockSite: Site = {
              id: '00000000-0000-0000-0000-000000000001',
              name: 'Eden Living Main Site',
              address: '123 Main Street',
              city: 'Demo City',
              state: 'Demo State',
              postal_code: '12345',
              country: 'Malaysia',
              total_bedrooms: 50,
              available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
            }
            setCurrentSite(mockSite)
            setAvailableSites([mockSite])
          }
          
          setIsLoading(false)
          return
        }

        // Check for stored site admin session
        if (storedSiteAdmin) {
          console.log('Restoring site admin session from localStorage')
          const siteAdminProfile = JSON.parse(storedSiteAdmin)
          setUser(siteAdminProfile)

          // Restore site for site admin (only their assigned site)
          try {
            const { data: sites, error } = await supabase
              .from('sites')
              .select('*')
              .eq('id', siteAdminProfile.site_id)

            if (!error && sites && sites.length > 0) {
              setAvailableSites(sites)
              setCurrentSite(sites[0])
            } else {
              // Fallback to mock site
              const mockSite: Site = {
                id: siteAdminProfile.site_id,
                name: 'Eden Living Site',
                address: '123 Site Street',
                city: 'Site City',
                state: 'Site State',
                postal_code: '12345',
                country: 'Malaysia',
                total_bedrooms: 25,
                available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
              }
              setCurrentSite(mockSite)
              setAvailableSites([mockSite])
            }
          } catch (error) {
            console.warn('Could not fetch site for site admin, using mock site:', error)
            const mockSite: Site = {
              id: siteAdminProfile.site_id,
              name: 'Eden Living Site',
              address: '123 Site Street',
              city: 'Site City',
              state: 'Site State',
              postal_code: '12345',
              country: 'Malaysia',
              total_bedrooms: 25,
              available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
            }
            setCurrentSite(mockSite)
            setAvailableSites([mockSite])
          }

          setIsLoading(false)
          return
        }

        // Then check if we have a regular Supabase session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Fetch user profile from database
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.error('Error fetching profile:', error)
          } else {
            setUser(profile)
            
            // Fetch available sites for this user
            await fetchUserSites(profile)
            
            // Redirect authenticated users away from auth pages
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname
              if (currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
                let redirectPath = '/dashboard'
                if (profile.role === 'superadmin') {
                  redirectPath = '/superadmin'
                } else if (profile.role === 'site_admin') {
                  redirectPath = '/siteadmin'
                }
                router.push(redirectPath)
              }
              // Prevent superadmin from being redirected away from superadmin pages
              else if (profile.role === 'superadmin' && !currentPath.startsWith('/superadmin')) {
                router.push('/superadmin')
              }
              // Prevent site_admin from being redirected away from siteadmin pages
              else if (profile.role === 'site_admin' && !currentPath.startsWith('/siteadmin')) {
                router.push('/siteadmin')
              }
              // Prevent regular users from accessing admin pages
              else if (!['superadmin', 'site_admin'].includes(profile.role) && (currentPath.startsWith('/superadmin') || currentPath.startsWith('/siteadmin'))) {
                router.push('/dashboard')
              }
              // Prevent non-superadmin from accessing superadmin pages
              else if (profile.role !== 'superadmin' && currentPath.startsWith('/superadmin')) {
                router.push('/dashboard')
              }
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        console.log('Auth initialization complete, updating global state')
        globalAuthState.initialized = true
        globalAuthState.user = user
        globalAuthState.currentSite = currentSite
        globalAuthState.availableSites = availableSites
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id, 'has session:', !!session)
        
        if (session?.user) {
          try {
            // Fetch user profile when auth state changes
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (error) {
              console.error('Error fetching profile:', error)
            } else {
              console.log('Setting user profile:', profile)
              setUser(profile)

              // Fetch available sites for this user
              await fetchUserSites(profile)
              console.log('Sites fetched, setting isLoading to false')

              // Redirect authenticated users away from auth pages
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname
                if (currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
                  const redirectPath = profile.role === 'superadmin' ? '/superadmin' : '/dashboard'
                  router.push(redirectPath)
                }
                // Prevent superadmin from being redirected away from superadmin pages
                else if (profile.role === 'superadmin' && !currentPath.startsWith('/superadmin')) {
                  router.push('/superadmin')
                }
                // Prevent regular users from accessing superadmin pages
                else if (profile.role !== 'superadmin' && currentPath.startsWith('/superadmin')) {
                  router.push('/dashboard')
                }
              }
            }
          } catch (error) {
            console.error('Error handling auth state change:', error)
          }
        } else {
          console.log('No session detected')
          // Check if we have a stored superadmin session
          const storedSuperadmin = localStorage.getItem('superadmin_session')
          if (storedSuperadmin) {
            console.log('Found stored superadmin session, keeping user logged in')
            // Don't clear user state if we have a stored superadmin session
            return
          }
          
          console.log('No stored session, setting user to null')
          setUser(null)
          setCurrentSite(null)
          setAvailableSites([])
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Remove problematic dependencies that cause re-renders

  const fetchUserSites = async (profile: Profile) => {
    console.log('fetchUserSites called for profile:', profile.email, profile.role, profile.site_id)
    try {
      if (profile.role === 'superadmin') {
        // Superadmins can access all sites
        const { data: sites, error } = await supabase
          .from('sites')
          .select('*')
          .order('name');
        
        if (!error && sites) {
          setAvailableSites(sites);
          // Set first site as current or remember last selected
          const lastSiteId = localStorage.getItem('lastSiteId');
          const currentSite = sites.find(site => site.id === lastSiteId) || sites[0] || null;
          setCurrentSite(currentSite);
        }
      } else if (profile.site_id) {
        // Regular users can only access their assigned site
        console.log('Fetching site for site_id:', profile.site_id)
        const { data: site, error } = await supabase
          .from('sites')
          .select('*')
          .eq('id', profile.site_id)
          .single();

        if (!error && site) {
          console.log('Site loaded successfully:', site.name)
          setAvailableSites([site]);
          setCurrentSite(site);
        } else {
          console.error('Error loading site:', error)
          // Set empty arrays if site loading fails
          setAvailableSites([]);
          setCurrentSite(null);
        }
      } else {
        console.log('No site_id found for user, setting empty site arrays')
        setAvailableSites([]);
        setCurrentSite(null);
      }
      console.log('fetchUserSites completed')
    } catch (error) {
      console.error('Error fetching user sites:', error);
    }
  };

  const signIn = async (email: string, password: string, siteId?: string) => {
    console.log('Attempting sign in with:', email)
    
    // Check for superadmin bypass first (to avoid Supabase Auth issues)
    if (email === 'superadmin@eden.com' && password === 'password123') {
      console.log('Superadmin bypass login detected')
    }
    // Check for site admin bypass (for development/testing)
    else if (email === 'siteadmin@eden.com' && password === 'password123') {
      console.log('Site admin bypass login detected')

      // Use a mock site admin profile for development
      const siteAdminProfile: Profile = {
        id: 'site-admin-001',
        email: 'siteadmin@eden.com',
        first_name: 'Site',
        last_name: 'Admin',
        role: 'site_admin',
        unit_number: 'ADM-001',
        site_id: siteId || '00000000-0000-0000-0000-000000000001', // Use provided siteId or default
        phone_number: null,
        emergency_contact: null,
        dietary_preferences: null,
        created_at: '2025-08-25T14:05:36.765366+00:00',
        updated_at: '2025-08-25T14:05:36.765366+00:00'
      }

      setUser(siteAdminProfile)

      // Store site admin session in localStorage for persistence
      localStorage.setItem('site_admin_session', JSON.stringify(siteAdminProfile))

      // For site admin, fetch only their assigned site
      try {
        const { data: sites, error } = await supabase
          .from('sites')
          .select('*')
          .eq('id', siteAdminProfile.site_id)

        if (!error && sites && sites.length > 0) {
          setAvailableSites(sites)
          setCurrentSite(sites[0])
        } else {
          // Fallback to mock site
          const mockSite: Site = {
            id: siteAdminProfile.site_id!,
            name: 'Eden Living Site',
            address: '123 Site Street',
            city: 'Site City',
            state: 'Site State',
            postal_code: '12345',
            country: 'Malaysia',
            total_bedrooms: 25,
            available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
          }
          setCurrentSite(mockSite)
          setAvailableSites([mockSite])
        }
      } catch (error) {
        console.error('Error fetching site admin site:', error)
      }

      console.log('Site admin login successful')
      return
    }

    // Continue with superadmin logic if it was superadmin
    if (email === 'superadmin@eden.com' && password === 'password123') {
      
      // Use the real superadmin profile data
      const superadminProfile: Profile = {
        id: '5f4f3eff-f2bd-4b3a-97bf-5df7ddc95fee', // Real ID from database
        email: 'superadmin@eden.com',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'superadmin',
        unit_number: 'SA-001',
        site_id: '00000000-0000-0000-0000-000000000001',
        phone_number: null,
        emergency_contact: null,
        dietary_preferences: null,
        created_at: '2025-08-25T14:05:36.765366+00:00',
        updated_at: '2025-08-25T14:05:36.765366+00:00'
      }
      
      setUser(superadminProfile)
      
      // Store superadmin session in localStorage for persistence
      localStorage.setItem('superadmin_session', JSON.stringify(superadminProfile))
      
      // For superadmin, fetch all sites directly
      try {
        const { data: sites, error } = await supabase
          .from('sites')
          .select('*')
          .order('name')
        
        if (!error && sites) {
          setAvailableSites(sites)
          // Set first site as current or remember last selected
          const lastSiteId = localStorage.getItem('lastSiteId')
          const currentSite = sites.find(site => site.id === lastSiteId) || sites[0] || null
          setCurrentSite(currentSite)
        } else {
          // Fallback to mock site if we can't fetch
          const mockSite: Site = {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Eden Living Main Site',
            address: '123 Main Street',
            city: 'Demo City',
            state: 'Demo State',
            postal_code: '12345',
            country: 'Malaysia',
            total_bedrooms: 50,
            available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
          }
          setCurrentSite(mockSite)
          setAvailableSites([mockSite])
        }
      } catch (error) {
        console.warn('Could not fetch sites for superadmin, using mock site:', error)
        // Fallback to mock site
        const mockSite: Site = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Eden Living Main Site',
          address: '123 Main Street',
          city: 'Demo City',
          state: 'Demo State',
          postal_code: '12345',
          country: 'Malaysia',
          total_bedrooms: 50,
          available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
        }
        setCurrentSite(mockSite)
        setAvailableSites([mockSite])
      }
      
      // Store site context if provided
      if (siteId) {
        localStorage.setItem('lastSiteId', siteId)
      }
      
      // Redirect superadmin to superadmin dashboard
      if (typeof window !== 'undefined') {
        router.push('/superadmin')
      }
      
      return
    }
    
    // Check for demo users (admin, resident, and paul@aaa.com)
    const isDemoUser = (
      (email === 'admin@eden.com' && password === 'password123') ||
      (email === 'resident@eden.com' && password === 'password123') ||
      (email === 'paul@aaa.com' && password === 'password123')
    );
    
    if (isDemoUser) {
      console.log('Demo user login detected')
      
      // For admin, resident, and paul@aaa.com, use mock data
      let userDetails;
      if (email === 'admin@eden.com') {
        userDetails = { id: 'demo-admin-id', firstName: 'Admin', role: 'admin', unit: 'ADMIN' };
      } else if (email === 'resident@eden.com') {
        userDetails = { id: 'demo-resident-id', firstName: 'Resident', role: 'resident', unit: '101' };
      } else if (email === 'paul@aaa.com') {
        userDetails = { id: '6ac479a0-77dd-402a-a3d5-b22f70d510d5', firstName: 'Paul', role: 'resident', unit: 'A-102' };
      }
      
      // Create mock user profile for demo
      const mockProfile: Profile = {
        id: userDetails!.id,
        email: email,
        first_name: userDetails!.firstName,
        last_name: email === 'paul@aaa.com' ? 'beyong' : 'User',
        role: userDetails!.role as 'admin' | 'resident' | 'superadmin' | 'staff',
        unit_number: userDetails!.unit,
        site_id: '00000000-0000-0000-0000-000000000001',
        phone_number: null,
        emergency_contact: null,
        dietary_preferences: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setUser(mockProfile)
      
      // Set mock site
      const mockSite: Site = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Eden Living Main Site',
        address: '123 Main Street',
        city: 'Demo City',
        state: 'Demo State',
        postal_code: '12345',
        country: 'Malaysia',
        total_bedrooms: 50,
        available_services: ['meal', 'laundry', 'housekeeping', 'transportation']
      }
      
      setCurrentSite(mockSite)
      setAvailableSites([mockSite])
      
      // Store site context if provided
      if (siteId) {
        localStorage.setItem('lastSiteId', siteId);
      }
      
      // Redirect to dashboard
      if (typeof window !== 'undefined') {
        router.push('/dashboard')
      }
      
      return
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('Sign in response:', { data, error })

    if (error) {
      console.error('Sign in error:', error)
      throw new Error(error.message)
    }

    console.log('Sign in successful, user:', data.user)
    
    // Store site context if provided (for new registrations)
    if (siteId) {
      localStorage.setItem('lastSiteId', siteId);
    }
  }

  const signUp = async (email: string, password: string, profileData: Partial<Profile>, siteId?: string) => {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          role: 'resident',
          unit_number: profileData.unit_number,
        }
      }
    })

    if (authError) {
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('User creation failed')
    }

    // Profile will be automatically created by the trigger we set up
  }

  const signOut = async () => {
    console.log('Signing out...')

    // Check if this is a demo user, superadmin, or site admin using bypass
    if (user && (user.id === 'demo-admin-id' || user.id === 'demo-resident-id' || user.email === 'superadmin@eden.com' || user.email === 'siteadmin@eden.com')) {
      console.log('Demo/bypass user sign out')
      // Clear sessions from localStorage
      localStorage.removeItem('superadmin_session')
      localStorage.removeItem('site_admin_session')

      // Update both local and global state
      setUser(null)
      setCurrentSite(null)
      setAvailableSites([])
      globalAuthState.user = null
      globalAuthState.currentSite = null
      globalAuthState.availableSites = []
      globalAuthState.initialized = false
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      throw new Error(error.message)
    }

    // Update global state on successful sign out
    globalAuthState.user = null
    globalAuthState.currentSite = null
    globalAuthState.availableSites = []
    globalAuthState.initialized = false

    console.log('Sign out completed')
  }

  const switchSite = async (siteId: string) => {
    const site = availableSites.find(s => s.id === siteId);
    if (site) {
      setCurrentSite(site);
      localStorage.setItem('lastSiteId', siteId);
      
      // Refresh the page to update site-specific data
      router.refresh();
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentSite,
      isLoading, 
      signIn, 
      signUp, 
      signOut,
      switchSite,
      availableSites 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
