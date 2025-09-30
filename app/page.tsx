"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Stethoscope, Users, Calendar, FileText, Shield } from "lucide-react"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    const supabase = createClient()

    try {
      // Check if SuperAdmin exists
      const { data, error } = await supabase.from("users").select("id").eq("role", "superadmin").limit(1)

      if (error) {
        console.error("Error checking system status:", error)
        setNeedsSetup(true)
      } else if (!data || data.length === 0) {
        setNeedsSetup(true)
      } else {
        // System is set up, redirect to login
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("System check failed:", error)
      setNeedsSetup(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-600 rounded-full">
                <Stethoscope className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Chebigen HMS</h1>
            <p className="text-xl text-gray-600 mb-8">
              Comprehensive healthcare management solution for modern hospitals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Patient Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Complete patient records, demographics, and medical history management
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Schedule, manage, and track patient appointments with healthcare providers
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Clinical Records</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Electronic health records, prescriptions, lab results, and clinical notes
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Security & Audit</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Role-based access control, audit logging, and data protection compliance
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-orange-800">System Setup Required</CardTitle>
              <CardDescription className="text-orange-700">
                This appears to be a fresh installation. Please complete the one-time setup process.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push("/setup")} size="lg" className="bg-orange-600 hover:bg-orange-700">
                Begin System Setup
              </Button>
              <p className="text-sm text-orange-600 mt-4">
                This will create the first SuperAdmin account and configure the system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
