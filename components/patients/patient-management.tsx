"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PatientRegistrationForm } from "@/components/patients/patient-registration-form"
import { PatientDetailsDialog } from "@/components/patients/patient-details-dialog"
import type { UserRole } from "@/lib/auth"
import { Search, UserPlus, Eye, Edit, AlertCircle, CheckCircle } from "lucide-react"

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

interface PatientManagementProps {
  userRole: UserRole
  onStatsUpdate: () => void
}

export function PatientManagement({ userRole, onStatsUpdate }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm])

  const loadPatients = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      setError("Failed to load patients")
      console.error("Error loading patients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.contact.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredPatients(filtered)
  }

  const handlePatientRegistered = () => {
    setShowRegistrationForm(false)
    setSuccess("Patient registered successfully")
    loadPatients()
    onStatsUpdate()
  }

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowPatientDetails(true)
  }

  const canRegisterPatients = () => {
    return ["superadmin", "receptionist", "nurse"].includes(userRole)
  }

  const canEditPatients = () => {
    return ["superadmin", "receptionist", "nurse", "doctor"].includes(userRole)
  }

  const getGenderBadge = (gender: string) => {
    const colors = {
      male: "bg-blue-100 text-blue-800",
      female: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    }
    return <Badge className={colors[gender as keyof typeof colors] || "bg-gray-100 text-gray-800"}>{gender}</Badge>
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>Manage patient records and information</CardDescription>
            </div>
            {canRegisterPatients() && (
              <Button onClick={() => setShowRegistrationForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Register Patient
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients by name, MRN, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Patients Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading patients...
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm ? "No patients found matching your search" : "No patients registered yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {patient.mrn}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{calculateAge(patient.dob)} years</span>
                          {getGenderBadge(patient.gender)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{patient.contact || "Not provided"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.insurance_provider ? (
                            <div>
                              <div className="font-medium">{patient.insurance_provider}</div>
                              <div className="text-gray-500">{patient.insurance_number}</div>
                            </div>
                          ) : (
                            "No insurance"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(patient.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewPatient(patient)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {canEditPatients() && (
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Registration Dialog */}
      <Dialog open={showRegistrationForm} onOpenChange={setShowRegistrationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
            <DialogDescription>Enter patient information to create a new medical record</DialogDescription>
          </DialogHeader>
          <PatientRegistrationForm
            onSuccess={handlePatientRegistered}
            onCancel={() => setShowRegistrationForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog */}
      {selectedPatient && (
        <PatientDetailsDialog
          patient={selectedPatient}
          open={showPatientDetails}
          onOpenChange={setShowPatientDetails}
          userRole={userRole}
        />
      )}
    </div>
  )
}
