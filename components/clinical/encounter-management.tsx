"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UserRole } from "@/lib/auth"
import { Plus, Search, Eye, Clock } from "lucide-react"

interface Encounter {
  id: string
  patient_id: string
  provider_id: string
  appointment_id?: string
  encounter_date: string
  notes: any // JSONB field for SOAP format
  diagnosis: string
  plan: string
  created_at: string
  updated_at: string
  deleted_at?: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
  doctor?: {
    full_name: string
  }
}

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
}

interface EncounterManagementProps {
  userRole: UserRole
  userId: string
  onStatsUpdate: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const ENCOUNTER_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "emergency", label: "Emergency" },
  { value: "routine", label: "Routine Check-up" },
  { value: "specialist", label: "Specialist Visit" },
]

export function EncounterManagement({ userRole, userId, onStatsUpdate, onSuccess, onError }: EncounterManagementProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [filteredEncounters, setFilteredEncounters] = useState<Encounter[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  // Status filter removed since encounters table doesn't have a status field
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    patientId: "",
    encounterType: "consultation",
    chiefComplaint: "",
    diagnosis: "",
    treatmentPlan: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    console.log("Loading encounters for user:", userId, "role:", userRole)
    loadEncounters()
    loadPatients()
  }, [userId])

  useEffect(() => {
    filterEncounters()
  }, [encounters, searchTerm])

  const loadEncounters = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      let query = supabase.from("encounters").select(`
          *,
          patient:patients(first_name, last_name, mrn),
          doctor:users!encounters_provider_id_fkey(full_name)
        `)

      // Filter by user role
      if (userRole === "doctor") {
        query = query.eq("provider_id", userId)
      }

      const { data, error } = await query.order("encounter_date", { ascending: false })

      if (error) {
        console.error("Error loading encounters:", error)
        throw error
      }

      console.log("Loaded encounters:", data?.length || 0, "encounters")
      setEncounters(data || [])
    } catch (error) {
      onError("Failed to load encounters")
      console.error("Error loading encounters:", error)
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

  const filterEncounters = () => {
    let filtered = encounters

    if (searchTerm) {
      filtered = filtered.filter(
        (encounter) =>
          encounter.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          encounter.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          encounter.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          encounter.notes?.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          encounter.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Note: The database schema doesn't have a status field, so we'll skip status filtering for now
    // if (statusFilter !== "all") {
    //   filtered = filtered.filter((encounter) => encounter.status === statusFilter)
    // }

    setFilteredEncounters(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.patientId || !formData.chiefComplaint) {
      onError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("encounters")
        .insert({
          patient_id: formData.patientId,
          provider_id: userId,
          encounter_date: new Date().toISOString(),
          diagnosis: formData.diagnosis,
          plan: formData.treatmentPlan,
          notes: {
            chief_complaint: formData.chiefComplaint,
            encounter_type: formData.encounterType,
            additional_notes: formData.notes
          },
        })
        .select()
        .single()

      if (error) throw error

      // Log the encounter creation
      await supabase.from("audit_logs").insert({
        entity: "encounters",
        entity_id: data.id,
        action: "ENCOUNTER_CREATED",
        details: {
          patient_id: formData.patientId,
          encounter_type: formData.encounterType,
          chief_complaint: formData.chiefComplaint,
        },
        reason: "New patient encounter created",
        severity: "low",
      })

      onSuccess("Encounter created successfully")
      setShowCreateForm(false)
      setFormData({
        patientId: "",
        encounterType: "consultation",
        chiefComplaint: "",
        diagnosis: "",
        treatmentPlan: "",
        notes: "",
      })
      await loadEncounters()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to create encounter")
      console.error("Error creating encounter:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Note: Status updates removed since encounters table doesn't have a status field
  // This function is kept for potential future use
  const handleStatusUpdate = async (encounterId: string, newStatus: "active" | "completed") => {
    // For now, just show a message that status updates are not available
    onSuccess("Status updates are not available for encounters")
  }

  const canCreateEncounters = () => {
    return ["superadmin", "doctor", "nurse"].includes(userRole)
  }

  // Status badge function removed since encounters table doesn't have a status field

  const getEncounterTypeBadge = (type: string) => {
    const typeColors = {
      consultation: "bg-blue-100 text-blue-800",
      follow_up: "bg-green-100 text-green-800",
      emergency: "bg-red-100 text-red-800",
      routine: "bg-purple-100 text-purple-800",
      specialist: "bg-orange-100 text-orange-800",
    }

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {type.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Patient Encounters</h3>
          <p className="text-sm text-gray-600">Manage patient visits and medical encounters</p>
        </div>
        {canCreateEncounters() && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Encounter
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search encounters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {/* Status filter removed since encounters table doesn't have a status field */}
      </div>

      {/* Encounters Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Chief Complaint</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading encounters...
                </TableCell>
              </TableRow>
            ) : filteredEncounters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchTerm
                    ? "No encounters found matching your search"
                    : "No encounters recorded"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEncounters.map((encounter) => (
                <TableRow key={encounter.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {encounter.patient?.first_name} {encounter.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">MRN: {encounter.patient?.mrn}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{encounter.doctor?.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{new Date(encounter.encounter_date).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(encounter.encounter_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getEncounterTypeBadge(encounter.notes?.encounter_type || "consultation")}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={encounter.notes?.chief_complaint || "No chief complaint recorded"}>
                      {encounter.notes?.chief_complaint || "No chief complaint recorded"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedEncounter(encounter)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Encounter Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Encounter</DialogTitle>
            <DialogDescription>Record a new patient encounter</DialogDescription>
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
              <Label htmlFor="encounterType">Encounter Type</Label>
              <Select
                value={formData.encounterType}
                onValueChange={(value) => setFormData({ ...formData, encounterType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCOUNTER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">
                Chief Complaint <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="chiefComplaint"
                placeholder="Patient's main concern or reason for visit..."
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                placeholder="Clinical diagnosis or assessment..."
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatmentPlan">Treatment Plan</Label>
              <Textarea
                id="treatmentPlan"
                placeholder="Recommended treatment and follow-up..."
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional clinical notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Encounter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Encounter Details Dialog */}
      {selectedEncounter && (
        <Dialog open={!!selectedEncounter} onOpenChange={() => setSelectedEncounter(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Encounter Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient</Label>
                  <p className="font-medium">
                    {selectedEncounter.patient?.first_name} {selectedEncounter.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">MRN: {selectedEncounter.patient?.mrn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Doctor</Label>
                  <p className="font-medium">{selectedEncounter.doctor?.full_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date & Time</Label>
                  <p className="font-medium">{new Date(selectedEncounter.encounter_date).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <div>{getEncounterTypeBadge(selectedEncounter.notes?.encounter_type || "consultation")}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Chief Complaint</Label>
                <p className="mt-1 text-sm">{selectedEncounter.notes?.chief_complaint || "No chief complaint recorded"}</p>
              </div>

              {selectedEncounter.diagnosis && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Diagnosis</Label>
                  <p className="mt-1 text-sm">{selectedEncounter.diagnosis}</p>
                </div>
              )}

              {selectedEncounter.plan && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Treatment Plan</Label>
                  <p className="mt-1 text-sm">{selectedEncounter.plan}</p>
                </div>
              )}

              {selectedEncounter.notes?.additional_notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Additional Notes</Label>
                  <p className="mt-1 text-sm">{selectedEncounter.notes.additional_notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedEncounter(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
