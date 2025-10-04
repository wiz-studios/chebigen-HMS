"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserRole } from "@/lib/auth"
import { User, Phone, Shield, Calendar, FileText } from "lucide-react"

interface Patient {
  id: string
  user_id?: string
  mrn: string
  first_name: string
  last_name: string
  dob: string
  gender: string
  contact: string
  address: string
  insurance_provider: string
  insurance_number: string
  created_at: string
  updated_at: string
}

interface PatientDetailsDialogProps {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: UserRole
}

interface PatientStats {
  totalAppointments: number
  totalEncounters: number
  activePrescriptions: number
  lastVisit: string | null
}

export function PatientDetailsDialog({ patient, open, onOpenChange, userRole }: PatientDetailsDialogProps) {
  const [stats, setStats] = useState<PatientStats>({
    totalAppointments: 0,
    totalEncounters: 0,
    activePrescriptions: 0,
    lastVisit: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && patient) {
      loadPatientStats()
    }
  }, [open, patient])

  const loadPatientStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Get appointment count
      const { count: appointmentCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)

      // Get encounter count
      const { count: encounterCount } = await supabase
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)

      // Get active prescriptions count
      const { count: prescriptionCount } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)
        .eq("status", "active")

      // Get last visit
      const { data: lastEncounter } = await supabase
        .from("encounters")
        .select("encounter_date")
        .eq("patient_id", patient.id)
        .order("encounter_date", { ascending: false })
        .limit(1)
        .single()

      setStats({
        totalAppointments: appointmentCount || 0,
        totalEncounters: encounterCount || 0,
        activePrescriptions: prescriptionCount || 0,
        lastVisit: lastEncounter?.encounter_date || null,
      })
    } catch (error) {
      console.error("Error loading patient stats:", error)
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

  const getGenderBadge = (gender: string) => {
    const colors = {
      male: "bg-blue-100 text-blue-800",
      female: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    }
    return <Badge className={colors[gender as keyof typeof colors] || "bg-gray-100 text-gray-800"}>{gender}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {patient.first_name} {patient.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{patient.mrn}</div>
                  <div className="text-sm text-gray-500">Medical Record Number</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{calculateAge(patient.dob)}</div>
                  <div className="text-sm text-gray-500">Years Old</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalEncounters}</div>
                  <div className="text-sm text-gray-500">Total Visits</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.activePrescriptions}</div>
                  <div className="text-sm text-gray-500">Active Prescriptions</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Details Tabs */}
          <Tabs defaultValue="demographics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="medical">Medical History</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
            </TabsList>

            <TabsContent value="demographics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Full Name:</span>
                      <span className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date of Birth:</span>
                      <span className="font-medium">{new Date(patient.dob).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gender:</span>
                      <span>{getGenderBadge(patient.gender)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Age:</span>
                      <span className="font-medium">{calculateAge(patient.dob)} years</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{patient.contact || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Address:</span>
                      <span className="font-medium text-right max-w-xs">{patient.address || "Not provided"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Insurance Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider:</span>
                      <span className="font-medium">{patient.insurance_provider || "No insurance"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Policy Number:</span>
                      <span className="font-medium">{patient.insurance_number || "N/A"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Registration Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered:</span>
                      <span className="font-medium">{new Date(patient.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="font-medium">{new Date(patient.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Visit:</span>
                      <span className="font-medium">
                        {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : "No visits yet"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical History</CardTitle>
                  <CardDescription>Patient's medical records and clinical information</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Medical history module coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>Patient's appointment history and upcoming visits</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Appointment history coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {(userRole === "doctor" || userRole === "nurse") && (
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Create Encounter
              </Button>
            )}
            {(userRole === "receptionist" || userRole === "doctor" || userRole === "nurse" || userRole === "superadmin") && (
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
