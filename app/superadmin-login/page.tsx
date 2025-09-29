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
import { Shield, AlertCircle } from "lucide-react"

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        email,
        password,
      })

      if (authError) throw authError

      // Verify user is SuperAdmin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, status")
        .eq("email", email)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-orange-600 rounded-full">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl">System Setup Required</CardTitle>
              <CardDescription>No SuperAdmin account found</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                The system needs to be set up with a SuperAdmin account. Click below to begin the one-time setup
                process.
              </p>
              <Button onClick={() => router.push("/setup")} className="w-full">
                Begin Setup
              </Button>
              <div className="mt-4">
                <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
                  Back to Regular Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-600 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Access</h1>
            <p className="text-gray-600 mt-2">Administrative login portal</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">SuperAdmin Login</CardTitle>
              <CardDescription>Enter your SuperAdmin credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@hospital.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In as SuperAdmin"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link href="/auth/login" className="text-blue-600 hover:underline">
                  Back to Regular Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
