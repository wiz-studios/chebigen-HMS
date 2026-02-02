"use client"

import type React from "react"

import { useState } from "react"
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
import { formatToEATDisplay, isAppointmentOverdue, formatOverdueDuration, getCurrentEATTime } from "@/lib/time-utils"
import { usePaginatedList } from "@/hooks/usePaginatedList"
import type { UserRole } from "@/lib/auth"
import { Calendar, Search, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { useQueryClient } from 'react-query'
import { format } from 'date-fns'
import { AppointmentDetailsDialog } from "./appointment-details-dialog"
import { useCallback, useEffect } from "react"

interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Appointment {
  id: string
  patient_id: string
  provider_id: string
  scheduled_time: string
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "arrived"
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
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showSchedulingForm, setShowSchedulingForm] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const queryClient = useQueryClient()

  // Calculate date range for filtering
  const getDateRange = () => {
    const today = getCurrentEATTime()
    switch (dateFilter) {
      case "today":
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd")
        }
      case "week":
        const weekEnd = new Date(today)
        weekEnd.setDate(weekEnd.getDate() + 7)
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(weekEnd, "yyyy-MM-dd")
        }
      default:
        return null
    }
  }

  // Use the paginated list hook with filters
  const {
    data: appointmentsData,
    isLoading,
    error: queryError,
    isFetching
  } = usePaginatedList<Appointment>(
    'appointments',
    {
      page,
      limit: pageSize,
      filters: {
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : undefined,
        date_range: getDateRange(),
        ...(userRole === "doctor" ? { provider_id: userId } : {}),
        ...(userRole === "patient" ? { patient_id: userId } : {}),
        ...(userRole === "accountant" || userRole === "lab_tech" || userRole === "pharmacist" ? { provider_id: "none" } : {})
      },
      sortBy: 'scheduled_time',
      sortOrder: 'asc'
    }
  )

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(value)
      setPage(1)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    // Call handleSearch with an empty string and use its returned cleanup function as the effect cleanup.
    // This ensures the debounce timer (if any) is cleared on unmount.
    return handleSearch("")
  }, [handleSearch])

  const handleStatusUpdate = async (appointmentId: string, newStatus: Appointment["status"]) => {
    const supabase = createClient()
    
    // Optimistic update
    queryClient.setQueryData(['appointments', { page, limit: pageSize }], (old: any) => ({
      ...old,
      data: old.data.map((apt: Appointment) =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      )
    }))

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId)

      if (error) throw error

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

      // Invalidate queries to refresh data
      queryClient.invalidateQueries('appointments')
      if (onStatsUpdate) onStatsUpdate()
      
      setSuccess(`Appointment ${newStatus} successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error("Error updating appointment status:", error)
      // Revert optimistic update on error by invalidating the query
      queryClient.invalidateQueries('appointments')
    }
  }

  const handleAppointmentScheduled = () => {
    setShowSchedulingForm(false)
    queryClient.invalidateQueries('appointments')
    if (onStatsUpdate) onStatsUpdate()
  }

  const canScheduleAppointments = ["superadmin", "receptionist", "doctor"].includes(userRole)
  
  const canUpdateStatus = (appointment?: Appointment) => {
    if (userRole === "superadmin") return true
    if (userRole === "doctor" && appointment && appointment.provider_id === userId) return true
    return false
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock },
      confirmed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      arrived: { color: "bg-purple-100 text-purple-800", icon: CheckCircle },
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
    <div className="space-y-4">
      {queryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading appointments: {queryError.message}
          </AlertDescription>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Appointment Management</CardTitle>
              <CardDescription className="text-sm">Schedule and manage patient appointments</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setViewMode("list")}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setViewMode("calendar")}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
              </div>
              {canScheduleAppointments && (
                <Button 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowSchedulingForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "calendar" ? (
            <AppointmentCalendar
              appointments={(appointmentsData as PaginatedResult<Appointment>)?.data || []}
              onAppointmentClick={(appointment) => setSelectedAppointment(appointment)}
              userRole={userRole}
            />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search appointments..."
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Date" />
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
                    ) : (appointmentsData as PaginatedResult<Appointment>)?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {searchTerm || statusFilter !== "all"
                            ? "No appointments found matching your filters"
                            : "No appointments scheduled"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ((appointmentsData as PaginatedResult<Appointment>)?.data || []).map((appointment) => (
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
                                {formatToEATDisplay(appointment.scheduled_time)}
                              </div>
                              {isAppointmentOverdue(appointment.scheduled_time, appointment.status) && (
                                <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{formatOverdueDuration(appointment.scheduled_time)}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getAppointmentTypeBadge(appointment.appointment_type || "consultation")}</TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canUpdateStatus(appointment) && appointment.status === "scheduled" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(appointment.id, "confirmed")}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
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

              {/* Pagination Controls */}
              {((appointmentsData as PaginatedResult<Appointment>)?.meta?.totalPages ?? 0) > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || isLoading || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {(appointmentsData as PaginatedResult<Appointment>)?.meta?.totalPages}
                    {isFetching && !isLoading && " (Refreshing...)"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === (appointmentsData as PaginatedResult<Appointment>)?.meta?.totalPages || isLoading || isFetching}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointment Scheduling Dialog */}
      <Dialog open={showSchedulingForm} onOpenChange={setShowSchedulingForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Enter appointment details below.
            </DialogDescription>
          </DialogHeader>
          <AppointmentSchedulingForm
            onSuccess={handleAppointmentScheduled}
            onCancel={() => setShowSchedulingForm(false)}
            userRole={userRole}
            currentUserId={userId}
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Details/Update Dialog */}
      {selectedAppointment && (
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
          onStatusUpdate={handleStatusUpdate}
          canUpdateStatus={canUpdateStatus}
        />
      )}
    </div>
  )
}