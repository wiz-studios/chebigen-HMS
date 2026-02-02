"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberEmail, setRememberEmail] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Check for URL parameters for error messages
  useEffect(() => {
    // Clear any existing error first
    setError(null)
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Restore remembered email (if any)
      const rememberedEmail = localStorage.getItem('rememberedEmail')
      if (rememberedEmail) {
        setEmail(rememberedEmail)
        setRememberEmail(true)
      }

      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      
      if (errorParam === 'session_expired') {
        setError('Your session has expired. Please log in again to continue.')
      } else if (errorParam === 'auth_error') {
        setError('Authentication error. Please try logging in again.')
      } else if (errorParam === 'invalid_credentials') {
        setError('Invalid credentials. Please check your email and password.')
      } else if (errorParam) {
        // Handle any other error params
        setError(`Authentication error: ${errorParam.replace(/_/g, ' ')}`)
      }
      
      // Clear the error from URL without triggering a refresh
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // First attempt to authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        if (authError.message.includes("Invalid credentials")) {
          throw new Error("Invalid email or password")
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error("No user data returned from authentication")
      }

      // Get user role and status from our users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, status")
        .eq("id", authData.user.id)
        .single()

      if (userError) {
        if (userError.code === 'PGRST116') {
          throw new Error("User profile not found. Please contact an administrator.")
        }
        throw userError
      }

      if (!userData) {
        throw new Error("User profile not found")
      }

      if (userData.status === "pending") {
        throw new Error("Your account is pending approval. Please wait for administrator approval.")
      }

      if (userData.status === "suspended") {
        throw new Error("Your account has been suspended. Please contact an administrator.")
      }

      if (userData.status !== "active") {
        throw new Error("Your account is not active. Please contact an administrator.")
      }

      // Store user role and session info in local storage
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email.trim())
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('lastLoginTime', Date.now().toString())

      // Determine redirect path based on role
      const redirectPath = userData.role === "superadmin" 
        ? "/superadmin"
        : userData.role === "patient"
          ? "/patient"
          : "/dashboard"

      // Add a small delay to ensure storage is set before redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if component is still mounted before redirecting
      if (document.body.contains(document.activeElement)) {
        router.replace(redirectPath)
      }
    } catch (error: unknown) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Enter your credentials to access the system.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="doctor@hospital.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberEmail"
                checked={rememberEmail}
                onCheckedChange={(checked) => setRememberEmail(checked === true)}
              />
              <Label htmlFor="rememberEmail" className="text-sm font-normal text-muted-foreground">
                Remember email
              </Label>
            </div>
            <Link href="/auth-reset" className="text-sm text-primary hover:underline">
              Having trouble?
            </Link>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Need an account?</span>
            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">SuperAdmin</span>
            <Link href="/superadmin-login" className="font-medium text-primary hover:underline">
              Go to portal
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">First time here?</span>
            <Link href="/setup" className="font-medium text-primary hover:underline">
              Run setup
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
