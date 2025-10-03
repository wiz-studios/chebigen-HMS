"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { BillingManagement } from "@/components/billing/billing-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import type { UserRole } from "@/lib/auth"

interface BillingPageProps {
  userRole: UserRole
  userId?: string
}

export default function BillingPage() {
  const [userRole, setUserRole] = useState<UserRole>("patient")
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setError("You must be logged in to access billing information.")
          setIsLoading(false)
          return
        }

        // Get user role and details
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", user.id)
          .single()

        if (userError || !userData) {
          setError("Unable to load user information. Please try logging in again.")
          setIsLoading(false)
          return
        }

        setUserRole(userData.role as UserRole)
        setUserId(userData.id)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading user data:", error)
        setError("An error occurred while loading your information.")
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing Management</CardTitle>
            <CardDescription>Loading your billing information...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing Management</CardTitle>
            <CardDescription>Access your billing information and payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <BillingManagement 
        userRole={userRole} 
        userId={userId}
        onStatsUpdate={() => {
          // Handle stats update if needed
          console.log("Billing stats updated")
        }}
      />
    </div>
  )
}
