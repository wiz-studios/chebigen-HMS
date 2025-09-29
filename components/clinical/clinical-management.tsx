"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EncounterManagement } from "@/components/clinical/encounter-management"
import { VitalsRecording } from "@/components/clinical/vitals-recording"
import { LabResultsManagement } from "@/components/clinical/lab-results-management"
import { PrescriptionManagement } from "@/components/clinical/prescription-management"
import type { UserRole } from "@/lib/auth"
import { FileText, Activity, TestTube, Pill, AlertCircle, CheckCircle } from "lucide-react"

interface ClinicalManagementProps {
  userRole: UserRole
  userId: string
  onStatsUpdate?: () => void
}

interface ClinicalStats {
  activeEncounters: number
  pendingLabResults: number
  activePrescriptions: number
  vitalsRecorded: number
}

export function ClinicalManagement({ userRole, userId, onStatsUpdate }: ClinicalManagementProps) {
  const [stats, setStats] = useState<ClinicalStats>({
    activeEncounters: 0,
    pendingLabResults: 0,
    activePrescriptions: 0,
    vitalsRecorded: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadClinicalStats()
  }, [userId])

  const loadClinicalStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const today = new Date().toISOString().split("T")[0]

      // Get active encounters
      const { count: activeEncounters } = await supabase
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .gte("encounter_date", `${today}T00:00:00`)

      // Get pending lab results
      const { count: pendingLabResults } = await supabase
        .from("lab_results")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      // Get active prescriptions
      const { count: activePrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")

      // Get vitals recorded today
      const { count: vitalsRecorded } = await supabase
        .from("vitals")
        .select("*", { count: "exact", head: true })
        .gte("recorded_at", `${today}T00:00:00`)

      setStats({
        activeEncounters: activeEncounters || 0,
        pendingLabResults: pendingLabResults || 0,
        activePrescriptions: activePrescriptions || 0,
        vitalsRecorded: vitalsRecorded || 0,
      })
    } catch (error) {
      setError("Failed to load clinical statistics")
      console.error("Error loading clinical stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatsUpdate = () => {
    loadClinicalStats()
    onStatsUpdate?.()
  }

  const canAccessClinical = () => {
    return ["superadmin", "doctor", "nurse"].includes(userRole)
  }

  const canAccessLab = () => {
    return ["superadmin", "doctor", "nurse", "lab_tech"].includes(userRole)
  }

  const canAccessPrescriptions = () => {
    return ["superadmin", "doctor", "pharmacist"].includes(userRole)
  }

  if (!canAccessClinical()) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You don't have permission to access clinical modules.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Clinical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Encounters</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.activeEncounters}</div>
            <p className="text-xs text-muted-foreground">Today's encounters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Lab Results</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{isLoading ? "..." : stats.pendingLabResults}</div>
            <p className="text-xs text-muted-foreground">Awaiting results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Current prescriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vitals Recorded</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.vitalsRecorded}</div>
            <p className="text-xs text-muted-foreground">Today's vitals</p>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Records</CardTitle>
          <CardDescription>Manage patient encounters, vitals, lab results, and prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="encounters" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="encounters" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Encounters
              </TabsTrigger>
              <TabsTrigger value="vitals" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Vitals
              </TabsTrigger>
              {canAccessLab() && (
                <TabsTrigger value="lab-results" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Lab Results
                </TabsTrigger>
              )}
              {canAccessPrescriptions() && (
                <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prescriptions
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="encounters">
              <EncounterManagement
                userRole={userRole}
                userId={userId}
                onStatsUpdate={handleStatsUpdate}
                onSuccess={(message) => setSuccess(message)}
                onError={(message) => setError(message)}
              />
            </TabsContent>

            <TabsContent value="vitals">
              <VitalsRecording
                userRole={userRole}
                userId={userId}
                onStatsUpdate={handleStatsUpdate}
                onSuccess={(message) => setSuccess(message)}
                onError={(message) => setError(message)}
              />
            </TabsContent>

            {canAccessLab() && (
              <TabsContent value="lab-results">
                <LabResultsManagement
                  userRole={userRole}
                  userId={userId}
                  onStatsUpdate={handleStatsUpdate}
                  onSuccess={(message) => setSuccess(message)}
                  onError={(message) => setError(message)}
                />
              </TabsContent>
            )}

            {canAccessPrescriptions() && (
              <TabsContent value="prescriptions">
                <PrescriptionManagement
                  userRole={userRole}
                  userId={userId}
                  onStatsUpdate={handleStatsUpdate}
                  onSuccess={(message) => setSuccess(message)}
                  onError={(message) => setError(message)}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
