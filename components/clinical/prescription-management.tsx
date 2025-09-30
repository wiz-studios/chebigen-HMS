"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UserRole } from "@/lib/auth"
import { Plus, Search, Eye, Pill, CheckCircle, XCircle } from "lucide-react"

interface Prescription {
  id: string
  patient_id: string
  provider_id?: string
  prescribed_by?: string
  encounter_id?: string
  medication_name: string
  dose: string
  frequency: string
  duration?: string
  instructions?: string
  status: "active" | "completed" | "cancelled" | "expired"
  created_at: string
  updated_at: string
  deleted_at?: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
  prescribed_by_user?: {
    full_name: string
  }
}

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
}

interface PrescriptionManagementProps {
  userRole: UserRole
  userId: string
  onStatsUpdate: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const COMMON_MEDICATIONS = [
  "Amoxicillin",
  "Ibuprofen",
  "Acetaminophen",
  "Lisinopril",
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
  "Amlodipine",
  "Metoprolol",
  "Hydrochlorothiazide",
  "Prednisone",
  "Azithromycin",
  "Ciprofloxacin",
  "Gabapentin",
  "Sertraline",
]

const FREQUENCIES = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "four_times_daily", label: "Four times daily" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "every_8_hours", label: "Every 8 hours" },
  { value: "every_12_hours", label: "Every 12 hours" },
  { value: "as_needed", label: "As needed" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

export function PrescriptionManagement({
  userRole,
  userId,
  onStatsUpdate,
  onSuccess,
  onError,
}: PrescriptionManagementProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [showPrescribeForm, setShowPrescribeForm] = useState(false)
  const [formData, setFormData] = useState({
    patientId: "",
    medicationName: "",
    dosage: "",
    frequency: "twice_daily",
    duration: "",
    instructions: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadPrescriptions()
    loadPatients()
  }, [userId])

  useEffect(() => {
    filterPrescriptions()
  }, [prescriptions, searchTerm, statusFilter])

  const loadPrescriptions = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      let query = supabase.from("prescriptions").select(`
          *,
          patient:patients(first_name, last_name, mrn),
          prescribed_by_user:users!prescriptions_prescribed_by_fkey(full_name)
        `)

      // Filter by user role
      if (userRole === "doctor") {
        query = query.eq("prescribed_by", userId)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error

      setPrescriptions(data || [])
    } catch (error) {
      onError("Failed to load prescriptions")
      console.error("Error loading prescriptions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPatients = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.from("patients").select("id, mrn, first_name, last_name")

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      console.error("Error loading patients:", error)
    }
  }

  const filterPrescriptions = () => {
    let filtered = prescriptions

    if (searchTerm) {
      filtered = filtered.filter(
        (prescription) =>
          prescription.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prescription.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prescription.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prescription.medication_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((prescription) => prescription.status === statusFilter)
    }

    setFilteredPrescriptions(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    console.log("Form validation - checking required fields:", {
      patientId: formData.patientId,
      medicationName: formData.medicationName,
      dosage: formData.dosage,
      duration: formData.duration
    })

    if (!formData.patientId || !formData.medicationName || !formData.dosage || !formData.duration) {
      console.log("Validation failed - missing required fields")
      onError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    try {
      // First, test if we can access the prescriptions table
      console.log("Testing prescriptions table access...")
      const { data: testData, error: testError } = await supabase
        .from("prescriptions")
        .select("id")
        .limit(1)
      
      if (testError) {
        console.error("Cannot access prescriptions table:", testError)
        throw new Error(`Cannot access prescriptions table: ${testError.message}`)
      }
      
      console.log("Prescriptions table access test successful")
      
      // Test if the patient exists
      console.log("Testing patient access...")
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("id", formData.patientId)
        .single()
      
      if (patientError) {
        console.error("Cannot access patient:", patientError)
        throw new Error(`Cannot access patient: ${patientError.message}`)
      }
      
      console.log("Patient access test successful:", patientData)
      
      const startDate = new Date()
      const endDate = new Date()

      // Calculate end date based on duration
      const durationMatch = formData.duration.match(/(\d+)\s*(day|week|month)s?/i)
      if (durationMatch) {
        const amount = Number.parseInt(durationMatch[1])
        const unit = durationMatch[2].toLowerCase()

        if (unit === "day") {
          endDate.setDate(startDate.getDate() + amount)
        } else if (unit === "week") {
          endDate.setDate(startDate.getDate() + amount * 7)
        } else if (unit === "month") {
          endDate.setMonth(startDate.getMonth() + amount)
        }
      } else {
        // Default to 30 days if duration format is not recognized
        endDate.setDate(startDate.getDate() + 30)
      }

      const insertData = {
        patient_id: formData.patientId,
        prescribed_by: userId,
        medication_name: formData.medicationName,
        dose: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions,
        status: "active",
      }
      
      console.log("Submitting prescription with data:", insertData)
      console.log("User ID:", userId)
      console.log("User role:", userRole)

      // Use existing database schema fields
      const { data, error } = await supabase
        .from("prescriptions")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("Database error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Log the prescription
      await supabase.from("audit_logs").insert({
        entity: "prescriptions",
        entity_id: data.id,
        action: "PRESCRIPTION_CREATED",
        details: {
          patient_id: formData.patientId,
          medication_name: formData.medicationName,
          dosage: formData.dosage,
          prescribed_by: userId,
        },
        reason: "New prescription created",
        severity: "low",
      })

      onSuccess("Prescription created successfully")
      setShowPrescribeForm(false)
      setFormData({
        patientId: "",
        medicationName: "",
        dosage: "",
        frequency: "twice_daily",
        duration: "",
        instructions: "",
      })
      await loadPrescriptions()
      onStatsUpdate()
    } catch (error: any) {
      console.error("Error creating prescription:", error)
      
      // Extract more detailed error information
      let errorMessage = "Unknown error"
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.error("Detailed error info:", {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      
      onError(`Failed to create prescription: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (prescriptionId: string, newStatus: Prescription["status"]) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("prescriptions").update({ status: newStatus }).eq("id", prescriptionId)

      if (error) throw error

      // Log the status change
      await supabase.from("audit_logs").insert({
        entity: "prescriptions",
        entity_id: prescriptionId,
        action: "STATUS_UPDATED",
        details: {
          new_status: newStatus,
          updated_by: userId,
        },
        reason: `Prescription status changed to ${newStatus}`,
        severity: "low",
      })

      onSuccess(`Prescription ${newStatus} successfully`)
      await loadPrescriptions()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to update prescription status")
      console.error("Error updating prescription:", error)
    }
  }

  const canPrescribe = () => {
    return ["superadmin", "doctor"].includes(userRole)
  }

  const canDispense = () => {
    return ["superadmin", "pharmacist"].includes(userRole)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: "Active" },
      completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      expired: { color: "bg-gray-100 text-gray-800", label: "Expired" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    }

    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getFrequencyLabel = (frequency: string) => {
    const freq = FREQUENCIES.find((f) => f.value === frequency)
    return freq ? freq.label : frequency.replace("_", " ")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Prescriptions</h3>
          <p className="text-sm text-gray-600">Manage patient prescriptions and medications</p>
        </div>
        {canPrescribe() && (
          <Button onClick={() => setShowPrescribeForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Prescription
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prescriptions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prescribed By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading prescriptions...
                </TableCell>
              </TableRow>
            ) : filteredPrescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {searchTerm || statusFilter !== "all"
                    ? "No prescriptions found matching your filters"
                    : "No prescriptions created"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPrescriptions.map((prescription) => (
                <TableRow key={prescription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {prescription.patient?.first_name} {prescription.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">MRN: {prescription.patient?.mrn}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{prescription.medication_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{prescription.dose}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{getFrequencyLabel(prescription.frequency)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{prescription.duration}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{prescription.prescribed_by_user?.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(prescription.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPrescription(prescription)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {canDispense() && prescription.status === "active" && (
                        <Button size="sm" onClick={() => handleStatusUpdate(prescription.id, "completed")}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      {prescription.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(prescription.id, "cancelled")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
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

      {/* Create Prescription Dialog */}
      <Dialog open={showPrescribeForm} onOpenChange={setShowPrescribeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Prescription</DialogTitle>
            <DialogDescription>Prescribe medication for a patient</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">
                Patient <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} (MRN: {patient.mrn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicationName">
                Medication <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.medicationName}
                onValueChange={(value) => setFormData({ ...formData, medicationName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medication" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_MEDICATIONS.map((medication) => (
                    <SelectItem key={medication} value={medication}>
                      {medication}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dosage">
                  Dosage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dosage"
                  placeholder="e.g., 500mg, 10ml"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Duration <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  placeholder="e.g., 7 days, 2 weeks"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">
                Instructions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="instructions"
                placeholder="How to take the medication..."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
              />
            </div>

            {/* Notes field removed since database doesn't have this field */}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPrescribeForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Prescription"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prescription Details Dialog */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Prescription Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient</Label>
                  <p className="font-medium">
                    {selectedPrescription.patient?.first_name} {selectedPrescription.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">MRN: {selectedPrescription.patient?.mrn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Prescribed By</Label>
                  <p className="font-medium">{selectedPrescription.prescribed_by_user?.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedPrescription.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medication Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Medication</Label>
                      <p className="text-lg font-semibold">{selectedPrescription.medication_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Dosage</Label>
                      <p className="text-lg font-semibold">{selectedPrescription.dose}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Frequency</Label>
                      <p className="font-medium">{getFrequencyLabel(selectedPrescription.frequency)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Duration</Label>
                      <p className="font-medium">{selectedPrescription.duration}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div>{getStatusBadge(selectedPrescription.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label className="text-sm font-medium text-gray-500">Instructions</Label>
                <p className="mt-1 text-sm">{selectedPrescription.instructions}</p>
              </div>

              {/* Notes section removed since database doesn't have this field */}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedPrescription(null)}>
                  Close
                </Button>
                {canDispense() && selectedPrescription.status === "active" && (
                  <Button onClick={() => handleStatusUpdate(selectedPrescription.id, "completed")}>
                    <Pill className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
