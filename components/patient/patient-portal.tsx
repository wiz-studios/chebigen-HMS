"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogoutButton } from "@/components/auth/logout-button"
import type { User } from "@/lib/auth"
import { UserIcon, Calendar, FileText, CreditCard, Heart, DollarSign, Download, Receipt } from "lucide-react"

interface PatientData {
  id: string
  mrn: string
  first_name: string
  last_name: string
  dob: string
  gender: string
  contact: string
  address: string
  insurance_provider: string
  insurance_number: string
}

interface PatientPortalProps {
  user: User
}

export function PatientPortal({ user }: PatientPortalProps) {
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPatientData()
  }, [user.id])

  const loadPatientData = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.from("patients").select("*").eq("user_id", user.id).single()

      if (error) throw error

      setPatientData(data)
    } catch (error) {
      console.error("Error loading patient data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg mr-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
                <p className="text-gray-600">Welcome, {user.full_name}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your information...</p>
          </div>
        ) : !patientData ? (
          <Card>
            <CardHeader>
              <CardTitle>Patient Record Not Found</CardTitle>
              <CardDescription>
                Your patient record could not be found. Please contact the hospital administration.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* Patient Info Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">{patientData.mrn}</div>
                    <div className="text-sm text-gray-500">Medical Record Number</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">{calculateAge(patientData.dob)} years</div>
                    <div className="text-sm text-gray-500">Age</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge className="bg-green-100 text-green-800">{patientData.gender}</Badge>
                    <div className="text-sm text-gray-500 mt-1">Gender</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">{patientData.insurance_provider || "None"}</div>
                    <div className="text-sm text-gray-500">Insurance</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="appointments" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="records" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Medical Records
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Full Name:</span>
                        <span className="font-medium">
                          {patientData.first_name} {patientData.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date of Birth:</span>
                        <span className="font-medium">{new Date(patientData.dob).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gender:</span>
                        <span className="font-medium">{patientData.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium">{patientData.contact || "Not provided"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Insurance Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Provider:</span>
                        <span className="font-medium">{patientData.insurance_provider || "No insurance"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Policy Number:</span>
                        <span className="font-medium">{patientData.insurance_number || "N/A"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="appointments">
                <Card>
                  <CardHeader>
                    <CardTitle>My Appointments</CardTitle>
                    <CardDescription>View and manage your appointments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Appointment management coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Records</CardTitle>
                    <CardDescription>Your medical history and test results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Medical records coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Payments</CardTitle>
                    <CardDescription>
                      View your bills and download receipts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Information</h3>
                      <p className="text-gray-600 mb-4">
                        Your billing information and payment history will be displayed here.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download My Bills
                        </Button>
                        <Button variant="outline" size="sm">
                          <Receipt className="h-4 w-4 mr-2" />
                          Download Receipts
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        Contact the billing department for assistance with payments or to request copies of your bills.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
