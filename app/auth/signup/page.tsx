"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, CheckCircle, Eye, EyeOff, LockKeyhole, Mail, User, UserCog } from "lucide-react"

const STAFF_ROLES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
  { value: "lab_tech", label: "Lab Technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "accountant", label: "Accountant" },
  { value: "patient", label: "Patient" },
]

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!formData.role) {
      setError("Please select a role")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/login`,
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // The trigger should automatically create the user record
        // But let's manually insert if the trigger doesn't work
        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email.trim(),
          password_hash: "", // This will be handled by Supabase Auth
          role: formData.role,
          status: "pending", // Requires SuperAdmin approval
        })

        if (userError) {
          console.error('User creation error:', userError)
          throw userError
        }

        // If patient, also create patient record
        if (formData.role === "patient") {
          const nameParts = formData.fullName.split(" ")
          const firstName = nameParts[0] || ""
          const lastName = nameParts.slice(1).join(" ") || ""

          const { error: patientError } = await supabase.from("patients").insert({
            user_id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            dob: new Date("1990-01-01"), // Placeholder - will be updated in profile
            gender: "other", // Placeholder - will be updated in profile
          })

          if (patientError) throw patientError
        }

        setSuccess(true)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred during signup")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
            <CheckCircle className="size-6" />
          </div>
          <CardTitle className="text-2xl">Registration submitted</CardTitle>
          <CardDescription>Your account is pending approval by a SuperAdmin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You can sign in once your account is activated. If this takes longer than expected, contact your
            administrator.
          </p>
          <Button onClick={() => router.push("/auth/login")} className="w-full">
            Return to login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Registration requires SuperAdmin approval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Dr. John Smith"
                required
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

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
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div className="relative">
              <UserCog className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                <SelectTrigger className="pl-9">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="pl-9 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
