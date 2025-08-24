'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-3xl">E</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Sign in to your Eden Living account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-medium text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-13 text-lg font-semibold shadow-lg hover:shadow-xl" 
              disabled={isLoading}
              variant="premium"
            >
              {isLoading ? 'Signing in...' : 'Sign In to Your Account'}
            </Button>
          </form>
          
          <div className="text-center text-base text-muted-foreground">
            DonDon'tapos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Contact us to join
            </Link>
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              For demonstration, use: <span className="font-mono bg-muted px-2 py-1 rounded">admin@eden.com</span> / <span className="font-mono bg-muted px-2 py-1 rounded">password123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
