"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentEATTime, formatToEATDisplay } from "@/lib/time-utils"
import type { UserRole } from "@/lib/auth"
import { AlertCircle, Search } from "lucide-react"

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
  contact: string
}

interface Doctor {
  id: string
  full_name: string
}

interface AppointmentSchedulingFormProps {
  onSuccess: () => void
  onCancel: () => void
  userRole: UserRole
  currentUserId?: string
}

interface AppointmentFormData {
  patientId: string
  doctorId: string
  scheduledTime: string
  duration: number
  appointmentType: string
  notes: string
}

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "routine", label: "Routine Check-up" },
  { value: "specialist", label: "Specialist Visit" },
  { value: "emergency", label: "Emergency" },
]

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
]

export function AppointmentSchedulingForm({
  onSuccess,
  onCancel,
  userRole,
  currentUserId,
}: AppointmentSchedulingFormProps) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: "",
    doctorId: userRole === "doctor" ? currentUserId || "" : "",
    scheduledTime: "",
    duration: 30,
    appointmentType: "consultation",
    notes: "",
  })
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
    if (userRole !== "doctor") {
      loadDoctors()
    }
  }, [userRole])

  useEffect(() => {
    filterPatients()
  }, [patients, patientSearch])

  const loadPatients = async () => {
    const supabase = createClient()
    try {
      console.log("Loading patients for appointment scheduling...")
      const { data, error } = await supabase.from("patients").select("id, mrn, first_name, last_name, contact")

      if (error) {
        console.error("Error loading patients:", error)
        throw error
      }

      console.log("Loaded patients:", data?.length || 0, "patients")
      setPatients(data || [])
    } catch (error) {
      console.error("Error loading patients:", error)
      setError("Failed to load patients. Please check your permissions.")
    }
  }

  const loadDoctors = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "doctor")
        .eq("status", "active")

      if (error) throw error

      setDoctors(data || [])
    } catch (error) {
      console.error("Error loading doctors:", error)
    }
  }

  const filterPatients = () => {
    if (!patientSearch) {
      setFilteredPatients(patients.slice(0, 10)) // Show first 10 patients
      return
    }

    const filtered = patients.filter(
      (patient) =>
        patient.first_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        patient.mrn.toLowerCase().includes(patientSearch.toLowerCase()),
    )

    setFilteredPatients(filtered.slice(0, 10))
  }

  const handleInputChange = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Basic validation
    if (!formData.patientId || !formData.doctorId || !formData.scheduledTime) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    // Check if appointment time is in the future (using EAT)
    const appointmentTime = new Date(formData.scheduledTime)
    const currentEAT = getCurrentEATTime()
    
    console.log("Appointment time:", appointmentTime.toISOString())
    console.log("Current EAT time:", currentEAT.toISOString())
    console.log("Is appointment in future?", appointmentTime > currentEAT)
    
    if (appointmentTime <= currentEAT) {
      setError("Appointment time must be in the future")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Check for conflicting appointments
      const { data: conflicts, error: conflictError } = await supabase
        .from("appointments")
        .select("id")
        .eq("provider_id", formData.doctorId) // Use provider_id instead of doctor_id
        .gte("scheduled_time", formData.scheduledTime)
        .lt(
          "scheduled_time",
          new Date(new Date(formData.scheduledTime).getTime() + formData.duration * 60000).toISOString(),
        )
        .neq("status", "cancelled")

      if (conflictError) throw conflictError

      if (conflicts && conflicts.length > 0) {
        setError("Doctor is not available at the selected time")
        setIsLoading(false)
        return
      }

      // Insert appointment
      const { data, error: insertError } = await supabase
        .from("appointments")
        .insert({
          patient_id: formData.patientId,
          provider_id: formData.doctorId, // Use provider_id instead of doctor_id
          scheduled_time: formData.scheduledTime,
          status: "scheduled",
          notes: formData.notes,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log the appointment creation
      await supabase.from("audit_logs").insert({
        entity: "appointments",
        entity_id: data.id,
        action: "APPOINTMENT_SCHEDULED",
        details: {
          patient_id: formData.patientId,
          doctor_id: formData.doctorId,
          scheduled_time: formData.scheduledTime,
          appointment_type: formData.appointmentType,
        },
        reason: "New appointment scheduled",
        severity: "low",
      })

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to schedule appointment")
      console.error("Error scheduling appointment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate time slots for today and next 30 days
  const generateTimeSlots = () => {
    const slots = []
    const today = getCurrentEATTime()

    for (let day = 0; day < 30; day++) {
      const date = new Date(today)
      date.setDate(today.getDate() + day)

      // Skip weekends for now (can be customized)
      if (date.getDay() === 0 || date.getDay() === 6) continue

      // Generate slots from 8 AM to 5 PM
      for (let hour = 8; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(date)
          slotTime.setHours(hour, minute, 0, 0)

          // Skip past times for today (only check if it's today)
          const currentEAT = getCurrentEATTime()
          const isToday = slotTime.toDateString() === currentEAT.toDateString()
          if (isToday && slotTime <= currentEAT) continue

          slots.push({
            value: slotTime.toISOString().slice(0, 16),
            label: formatToEATDisplay(slotTime.toISOString()),
          })
        }
      }
    }

    return slots.slice(0, 50) // Limit to 50 slots for performance
  }

  const timeSlots = generateTimeSlots()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Patient Selection */}
      <div className="space-y-2">
        <Label htmlFor="patient">
          Patient <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients by name or MRN..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={formData.patientId} onValueChange={(value) => handleInputChange("patientId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {filteredPatients.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  {patients.length === 0 ? "No patients found" : "No patients match your search"}
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} (MRN: {patient.mrn})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Doctor Selection (if not a doctor) */}
      {userRole !== "doctor" && (
        <div className="space-y-2">
          <Label htmlFor="doctor">
            Doctor <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.doctorId} onValueChange={(value) => handleInputChange("doctorId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduledTime">
            Date & Time <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.scheduledTime} onValueChange={(value) => handleInputChange("scheduledTime", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select date and time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Select
            value={formData.duration.toString()}
            onValueChange={(value) => handleInputChange("duration", Number.parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointment Type */}
      <div className="space-y-2">
        <Label htmlFor="appointmentType">Appointment Type</Label>
        <Select value={formData.appointmentType} onValueChange={(value) => handleInputChange("appointmentType", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes or special instructions..."
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
        />
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Scheduling..." : "Schedule Appointment"}
        </Button>
      </div>
    </form>
  )
}
