'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Profile } from '@/types/database'

interface AuthContextType {
  user: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user data for demo purposes
const mockUsers = {
  'admin@eden.com': {
    id: '1',
    email: 'admin@eden.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin' as const,
    unit_number: '101',
    phone_number: '+60123456789',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'resident@eden.com': {
    id: '2',
    email: 'resident@eden.com',
    first_name: 'John',
    last_name: 'Resident',
    role: 'resident' as const,
    unit_number: '202',
    phone_number: '+60129876543',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is stored in localStorage (for demo persistence)
    const storedUser = localStorage.getItem('eden_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock authentication - in real app, this would call Supabase
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    
    if (email in mockUsers && password === 'password123') {
      const user = mockUsers[email as keyof typeof mockUsers]
      setUser(user)
      localStorage.setItem('eden_user', JSON.stringify(user))
    } else {
      throw new Error('Invalid email or password')
    }
  }

  const signUp = async (email: string, password: string, profileData: Partial<Profile>) => {
    // Mock registration
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (email in mockUsers) {
      throw new Error('User already exists')
    }
    
    const newUser: Profile = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      role: 'resident',
      unit_number: profileData.unit_number || '',
      phone_number: profileData.phone_number || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setUser(newUser)
    localStorage.setItem('eden_user', JSON.stringify(newUser))
  }

  const signOut = async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(null)
    localStorage.removeItem('eden_user')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
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
