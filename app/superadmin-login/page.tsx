"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, Shield } from "lucide-react"

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkSuperAdminExists()
  }, [])

  const checkSuperAdminExists = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.from("users").select("id").eq("role", "superadmin").limit(1)

      if (error) {
        console.error("Error checking SuperAdmin:", error)
        // If there's an error, assume setup is needed
        setNeedsSetup(true)
        return
      }

      if (!data || data.length === 0) {
        setNeedsSetup(true)
      }
    } catch (error) {
      console.error("Error checking SuperAdmin:", error)
      // If there's an error, assume setup is needed
      setNeedsSetup(true)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) throw authError

      // Verify user is SuperAdmin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, status")
        .eq("email", email.trim())
        .single()

      if (userError) throw userError

      if (userData.role !== "superadmin") {
        throw new Error("Access denied. SuperAdmin credentials required.")
      }

      if (userData.status !== "active") {
        throw new Error("SuperAdmin account is not active.")
      }

      router.push("/superadmin")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  if (needsSetup) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
            <Shield className="size-6" />
          </div>
          <CardTitle className="text-2xl">Setup required</CardTitle>
          <CardDescription>No SuperAdmin account was found.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            The system needs to be configured with the first SuperAdmin account before administrative login is
            available.
          </p>
          <Button onClick={() => router.push("/setup")} className="w-full">
            Begin setup
          </Button>
          <Link href="/auth/login" className="text-sm font-medium text-primary hover:underline">
            Back to regular login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">SuperAdmin sign in</CardTitle>
        <CardDescription>Restricted access for authorized personnel.</CardDescription>
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
                placeholder="admin@hospital.com"
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

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Not SuperAdmin?</span>
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Regular login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
