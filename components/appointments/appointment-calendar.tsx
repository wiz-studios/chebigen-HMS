"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatToEATDisplay, isAppointmentOverdue, formatOverdueDuration } from "@/lib/time-utils"
import type { UserRole } from "@/lib/auth"
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from "lucide-react"

interface Appointment {
  id: string
  patient_id: string
  provider_id: string
  scheduled_time: string
  duration?: number
  appointment_type?: string
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "arrived"
  notes: string
  created_at: string
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

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  userRole: UserRole
}

export function AppointmentCalendar({ appointments, onAppointmentClick, userRole }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.scheduled_time).toISOString().split("T")[0]
      return appointmentDate === dateStr
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-500",
      confirmed: "bg-green-500",
      arrived: "bg-purple-500",
      in_progress: "bg-yellow-500",
      completed: "bg-green-600",
      cancelled: "bg-red-500",
      no_show: "bg-gray-500",
    }
    return colors[status as keyof typeof colors] || "bg-gray-500"
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfMonth = getFirstDayOfMonth(currentDate)
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  // Generate calendar days
  const calendarDays = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-lg">{monthName}</span>
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">Prev</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">Next</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={index} className="p-1 sm:p-2 h-16 sm:h-24" />
            }

            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const dayAppointments = getAppointmentsForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <div
                key={day}
                className={`p-1 sm:p-2 h-16 sm:h-24 border rounded-lg ${
                  isToday ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                } hover:bg-gray-50 transition-colors`}
              >
                <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-900"}`}>{day}</div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: getStatusColor(appointment.status) }}
                      onClick={() => onAppointmentClick(appointment)}
                    >
                      <div className="text-white font-medium truncate">
                        <span className="hidden sm:inline">
                          {formatToEATDisplay(appointment.scheduled_time).split(' ')[1]} {/* Show only time part */}
                        </span>
                        <span className="sm:hidden">
                          {formatToEATDisplay(appointment.scheduled_time).split(' ')[1]}
                        </span>
                      </div>
                      <div className="text-white truncate hidden sm:block">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                      </div>
                      {isAppointmentOverdue(appointment.scheduled_time, appointment.status) && (
                        <div className="text-white text-xs flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-2 w-2" />
                          <span>Overdue</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">+{dayAppointments.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-sm">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-sm">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-sm">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-600"></div>
            <span className="text-sm">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm">Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
