"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AppointmentSchedulingForm } from "@/components/appointments/appointment-scheduling-form"
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar"
import type { UserRole } from "@/lib/auth"
import { Calendar, Search, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface Appointment {
  id: string
  patient_id: string
  provider_id: string
  scheduled_time: string
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"
  notes: string
  created_at: string
  duration?: number
  appointment_type?: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
    contact: string
  }
  doctor?: {
    full_name: string
  }
}

interface AppointmentManagementProps {
  userRole: UserRole
  userId?: string
  onStatsUpdate?: () => void
}

export function AppointmentManagement({ userRole, userId, onStatsUpdate }: AppointmentManagementProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showSchedulingForm, setShowSchedulingForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadAppointments()
  }, [userId, dateFilter])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter])

  const loadAppointments = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // First, get appointments
      let query = supabase.from("appointments").select("*")

      // Filter by date
      const today = new Date()
      if (dateFilter === "today") {
        const todayStr = today.toISOString().split("T")[0]
        query = query.gte("scheduled_time", `${todayStr}T00:00:00`).lt("scheduled_time", `${todayStr}T23:59:59`)
      } else if (dateFilter === "week") {
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6))
        query = query
          .gte("scheduled_time", weekStart.toISOString().split("T")[0] + "T00:00:00")
          .lte("scheduled_time", weekEnd.toISOString().split("T")[0] + "T23:59:59")
      }

      // Filter by user role
      if (userRole === "doctor" && userId) {
        query = query.eq("provider_id", userId)
      }

      const { data: appointments, error: appointmentsError } = await query.order("scheduled_time", { ascending: true })

      if (appointmentsError) {
        console.error("Error loading appointments:", appointmentsError)
        throw appointmentsError
      }

      if (!appointments || appointments.length === 0) {
        setAppointments([])
        return
      }

      // Get unique patient IDs and provider IDs
      const patientIds = [...new Set(appointments.map(apt => apt.patient_id))]
      const providerIds = [...new Set(appointments.map(apt => apt.provider_id))]

      // Fetch patient data
      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("id, first_name, last_name, mrn, contact")
        .in("id", patientIds)

      if (patientsError) {
        console.error("Error loading patients:", patientsError)
        throw patientsError
      }

      // Fetch doctor data
      const { data: doctors, error: doctorsError } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", providerIds)

      if (doctorsError) {
        console.error("Error loading doctors:", doctorsError)
        throw doctorsError
      }

      // Combine the data
      const enrichedAppointments = appointments.map(appointment => ({
        ...appointment,
        patient: patients?.find(p => p.id === appointment.patient_id),
        doctor: doctors?.find(d => d.id === appointment.provider_id)
      }))

      console.log("Loaded appointments:", enrichedAppointments)
      console.log("First appointment patient data:", enrichedAppointments?.[0]?.patient)
      
      setAppointments(enrichedAppointments)
    } catch (error) {
      setError("Failed to load appointments")
      console.error("Error loading appointments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = appointments

    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.doctor?.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === statusFilter)
    }

    setFilteredAppointments(filtered)
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: Appointment["status"]) => {
    const supabase = createClient()
    setError(null)

    try {
      // Debug: Log the current user and appointment details
      const { data: { user } } = await supabase.auth.getUser()
      console.log("Current user ID:", user?.id)
      console.log("User role:", userRole)
      console.log("Appointment ID:", appointmentId)
      console.log("New status:", newStatus)

      // Debug: Check the appointment details
      const { data: appointmentData, error: fetchError } = await supabase
        .from("appointments")
        .select("provider_id")
        .eq("id", appointmentId)
        .single()
      
      if (fetchError) {
        console.error("Error fetching appointment:", fetchError)
      } else {
        console.log("Appointment provider_id:", appointmentData?.provider_id)
        console.log("Is current user the provider?", user?.id === appointmentData?.provider_id)
      }

      const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId)

      if (error) {
        console.error("Update error details:", error)
        console.error("Error code:", error.code)
        console.error("Error message:", error.message)
        console.error("Error details:", error.details)
        console.error("Error hint:", error.hint)
        throw error
      }

      // Log the status change
      await supabase.from("audit_logs").insert({
        entity: "appointments",
        entity_id: appointmentId,
        action: "STATUS_UPDATED",
        details: {
          new_status: newStatus,
          updated_by: userId,
        },
        reason: `Appointment status changed to ${newStatus}`,
        severity: "low",
      })

      setSuccess(`Appointment ${newStatus} successfully`)
      console.log(`Appointment status updated to: ${newStatus}`)
      
      // Immediately update the local state to reflect the change
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: newStatus }
            : appointment
        )
      )
      
      // Reload appointments to get updated data from database
      await loadAppointments()
      onStatsUpdate?.()
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      setError("Failed to update appointment status")
      console.error("Error updating appointment:", error)
    }
  }

  const handleAppointmentScheduled = () => {
    setShowSchedulingForm(false)
    setSuccess("Appointment scheduled successfully")
    loadAppointments()
    onStatsUpdate?.()
  }

  const canScheduleAppointments = () => {
    return ["superadmin", "receptionist", "doctor", "nurse"].includes(userRole)
  }

  const canUpdateStatus = (appointment?: Appointment) => {
    // Only superadmins can update any appointment
    if (userRole === "superadmin") return true
    
    // Only the assigned doctor can update their own appointments
    if (userRole === "doctor" && appointment && appointment.provider_id === userId) return true
    
    // Receptionists and nurses cannot update appointment status
    return false
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock },
      confirmed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      in_progress: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
      no_show: { color: "bg-gray-100 text-gray-800", icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
    }

    return <Badge className={config.color}>{status.replace("_", " ").toUpperCase()}</Badge>
  }

  const getAppointmentTypeBadge = (type?: string) => {
    if (!type) {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          CONSULTATION
        </Badge>
      )
    }

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
              <CardTitle>Appointment Management</CardTitle>
              <CardDescription>Schedule and manage patient appointments</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
              </div>
              {canScheduleAppointments() && (
                <Button onClick={() => setShowSchedulingForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "calendar" ? (
            <AppointmentCalendar
              appointments={appointments}
              onAppointmentClick={(appointment) => setSelectedAppointment(appointment)}
              userRole={userRole}
            />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search appointments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="all">All Dates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Appointments Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Patient</TableHead>
                      <TableHead className="min-w-[120px]">Doctor</TableHead>
                      <TableHead className="min-w-[150px]">Date & Time</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading appointments...
                        </TableCell>
                      </TableRow>
                    ) : filteredAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {searchTerm || statusFilter !== "all"
                            ? "No appointments found matching your filters"
                            : "No appointments scheduled"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {appointment.patient?.first_name} {appointment.patient?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">MRN: {appointment.patient?.mrn}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{appointment.doctor?.full_name}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {new Date(appointment.scheduled_time).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(appointment.scheduled_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" - "}
                                {new Date(
                                  new Date(appointment.scheduled_time).getTime() + (appointment.duration || 30) * 60000,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getAppointmentTypeBadge(appointment.appointment_type || "consultation")}</TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedAppointment(appointment)} className="w-full sm:w-auto">
                                <Eye className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              {canUpdateStatus(appointment) && appointment.status === "scheduled" && (
                                <Button size="sm" onClick={() => handleStatusUpdate(appointment.id, "confirmed")} className="w-full sm:w-auto">
                                  <CheckCircle className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Confirm</span>
                                </Button>
                              )}
                              {canUpdateStatus(appointment) && appointment.status === "confirmed" && (
                                <Button size="sm" onClick={() => handleStatusUpdate(appointment.id, "in_progress")} className="w-full sm:w-auto">
                                  <Clock className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Start</span>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointment Scheduling Dialog */}
      <Dialog open={showSchedulingForm} onOpenChange={setShowSchedulingForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>Book an appointment for a patient</DialogDescription>
          </DialogHeader>
          <AppointmentSchedulingForm
            onSuccess={handleAppointmentScheduled}
            onCancel={() => setShowSchedulingForm(false)}
            userRole={userRole}
            currentUserId={userId}
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient</Label>
                  <p className="font-medium">
                    {selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">MRN: {selectedAppointment.patient?.mrn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Doctor</Label>
                  <p className="font-medium">{selectedAppointment.doctor?.full_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date & Time</Label>
                  <p className="font-medium">{new Date(selectedAppointment.scheduled_time).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Duration</Label>
                  <p className="font-medium">{selectedAppointment.duration || 30} minutes</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <div>{getAppointmentTypeBadge(selectedAppointment.appointment_type || "consultation")}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)} className="w-full sm:w-auto">
                  Close
                </Button>
                {canUpdateStatus(selectedAppointment) && (
                  <Select
                    value={selectedAppointment.status}
                    onValueChange={(value) =>
                      handleStatusUpdate(selectedAppointment.id, value as Appointment["status"])
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
