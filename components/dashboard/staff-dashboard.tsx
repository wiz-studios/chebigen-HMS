"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogoutButton } from "@/components/auth/logout-button"
import { PatientManagement } from "@/components/patients/patient-management"
import { AppointmentManagement } from "@/components/appointments/appointment-management"
import { ClinicalManagement } from "@/components/clinical/clinical-management"
import NotificationCenter from "@/components/notifications/notification-center"
import { MobileNavigation } from "@/components/ui/mobile-navigation"
import { MobileTabs, MobileTabContent } from "@/components/ui/mobile-tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { Bell } from "lucide-react"
import type { User } from "@/lib/auth"
import { Users, Calendar, FileText, Activity, Stethoscope, UserPlus, BarChart3 } from "lucide-react"

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  pendingResults: number
  activeEncounters: number
}

interface StaffDashboardProps {
  user: User
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingResults: 0,
    activeEncounters: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("patients")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadDashboardStats()
    loadUnreadNotifications()
  }, [])

  const loadDashboardStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Get total patients
      const { count: totalPatients } = await supabase.from("patients").select("*", { count: "exact", head: true })

      // Get today's appointments
      const today = new Date().toISOString().split("T")[0]
      const { count: todayAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_time", `${today}T00:00:00`)
        .lt("scheduled_time", `${today}T23:59:59`)

      // Get pending lab results
      const { count: pendingResults } = await supabase
        .from("lab_results")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      // Get active encounters
      const { count: activeEncounters } = await supabase
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .gte("encounter_date", `${today}T00:00:00`)

      setStats({
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingResults: pendingResults || 0,
        activeEncounters: activeEncounters || 0,
      })
    } catch (error) {
      console.error("Error loading dashboard stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUnreadNotifications = async () => {
    const supabase = createClient()
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) return

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .eq("read", false)

      setUnreadNotifications(count || 0)
    } catch (error) {
      console.error("Error loading unread notifications:", error)
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      doctor: "Doctor",
      nurse: "Nurse",
      receptionist: "Receptionist",
      lab_tech: "Lab Technician",
      pharmacist: "Pharmacist",
      accountant: "Accountant",
      admin: "Admin",
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      doctor: "bg-blue-100 text-blue-800",
      nurse: "bg-green-100 text-green-800",
      receptionist: "bg-purple-100 text-purple-800",
      lab_tech: "bg-yellow-100 text-yellow-800",
      pharmacist: "bg-pink-100 text-pink-800",
      accountant: "bg-indigo-100 text-indigo-800",
      admin: "bg-gray-100 text-gray-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const tabsConfig = [
    {
      value: "patients",
      label: isMobile ? "Patients" : "Patients",
      icon: Users,
    },
    {
      value: "appointments",
      label: isMobile ? "Appointments" : "Appointments",
      icon: Calendar,
    },
    {
      value: "clinical",
      label: isMobile ? "Clinical" : "Clinical",
      icon: FileText,
    },
    {
      value: "overview",
      label: isMobile ? "Overview" : "Overview",
      icon: Activity,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className={`${isMobile ? "px-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}`}>
          <div className={`flex justify-between items-center ${isMobile ? "py-4" : "py-6"}`}>
            <div className="flex items-center">
              <MobileNavigation user={user} unreadNotifications={unreadNotifications} />
              {!isMobile && (
                <div className="p-2 bg-blue-600 rounded-lg mr-4">
                  <Stethoscope className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h1 className={`font-bold text-gray-900 ${isMobile ? "text-lg" : "text-2xl"}`}>
                  {isMobile ? "Dashboard" : "Staff Dashboard"}
                </h1>
                <div className="flex items-center gap-2">
                  <p className={`text-gray-600 ${isMobile ? "text-sm" : ""}`}>
                    {isMobile ? user.full_name.split(" ")[0] : `Welcome back, ${user.full_name}`}
                  </p>
                  <Badge className={getRoleBadgeColor(user.role)}>{getRoleDisplayName(user.role)}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = "/notifications")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className={`${isMobile ? "px-4 py-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}`}>
        {/* Stats Overview */}
        <div className={`grid gap-4 mb-6 ${isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
          <Card>
            <CardHeader
              className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-1" : "pb-2"}`}
            >
              <CardTitle className={isMobile ? "text-xs font-medium" : "text-sm font-medium"}>
                {isMobile ? "Patients" : "Total Patients"}
              </CardTitle>
              <Users className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.totalPatients}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">Registered patients</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-1" : "pb-2"}`}
            >
              <CardTitle className={isMobile ? "text-xs font-medium" : "text-sm font-medium"}>
                {isMobile ? "Today" : "Today's Appointments"}
              </CardTitle>
              <Calendar className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.todayAppointments}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">Scheduled for today</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-1" : "pb-2"}`}
            >
              <CardTitle className={isMobile ? "text-xs font-medium" : "text-sm font-medium"}>
                {isMobile ? "Pending" : "Pending Results"}
              </CardTitle>
              <FileText className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold text-orange-600 ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.pendingResults}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">Lab results pending</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-1" : "pb-2"}`}
            >
              <CardTitle className={isMobile ? "text-xs font-medium" : "text-sm font-medium"}>
                {isMobile ? "Active" : "Active Encounters"}
              </CardTitle>
              <Activity className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.activeEncounters}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">Today's encounters</p>}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        {isMobile ? (
          <MobileTabs tabs={tabsConfig} value={activeTab} onValueChange={setActiveTab}>
            <MobileTabContent value="patients" activeValue={activeTab}>
              <PatientManagement userRole={user.role} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="appointments" activeValue={activeTab}>
              <AppointmentManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="clinical" activeValue={activeTab}>
              <ClinicalManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="overview" activeValue={activeTab}>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-green-100 rounded-full">
                          <UserPlus className="h-3 w-3 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New patient registered</p>
                          <p className="text-xs text-gray-500">5 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-blue-100 rounded-full">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Appointment scheduled</p>
                          <p className="text-xs text-gray-500">10 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {(user.role === "receptionist" || user.role === "nurse") && (
                        <Button size="sm" variant="outline" className="h-auto py-3 flex-col bg-transparent">
                          <UserPlus className="h-4 w-4 mb-1" />
                          <span className="text-xs">New Patient</span>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-auto py-3 flex-col bg-transparent">
                        <Calendar className="h-4 w-4 mb-1" />
                        <span className="text-xs">Schedule</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-auto py-3 flex-col bg-transparent"
                        onClick={() => (window.location.href = "/notifications")}
                      >
                        <Bell className="h-4 w-4 mb-1" />
                        <span className="text-xs">Notifications</span>
                      </Button>
                      {(user.role === "superadmin" || user.role === "doctor" || user.role === "accountant") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto py-3 flex-col bg-transparent"
                          onClick={() => (window.location.href = "/analytics")}
                        >
                          <BarChart3 className="h-4 w-4 mb-1" />
                          <span className="text-xs">Analytics</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </MobileTabContent>
          </MobileTabs>
        ) : (
          <Tabs defaultValue="patients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="patients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Patients
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Clinical
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patients">
              <PatientManagement userRole={user.role} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="appointments">
              <AppointmentManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="clinical">
              <ClinicalManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest patient activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-100 rounded-full">
                          <UserPlus className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New patient registered</p>
                          <p className="text-xs text-gray-500">5 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Appointment scheduled</p>
                          <p className="text-xs text-gray-500">10 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Lab result uploaded</p>
                          <p className="text-xs text-gray-500">15 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks for your role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(user.role === "receptionist" || user.role === "nurse") && (
                        <Button className="w-full justify-start bg-transparent" variant="outline">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Register New Patient
                        </Button>
                      )}
                      {(user.role === "doctor" || user.role === "nurse") && (
                        <Button className="w-full justify-start bg-transparent" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Create Encounter
                        </Button>
                      )}
                      <Button className="w-full justify-start bg-transparent" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Appointment
                      </Button>
                      <Button className="w-full justify-start bg-transparent" variant="outline">
                        <Activity className="h-4 w-4 mr-2" />
                        View Patient Records
                      </Button>
                      {(user.role === "superadmin" || user.role === "doctor" || user.role === "accountant") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => (window.location.href = "/analytics")}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      )}
                      {(user.role === "superadmin" || user.role === "pharmacist" || user.role === "nurse") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => (window.location.href = "/inventory")}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Manage Inventory
                        </Button>
                      )}
                      {(user.role === "superadmin" ||
                        user.role === "doctor" ||
                        user.role === "accountant" ||
                        user.role === "admin") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => (window.location.href = "/reports")}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generate Reports
                        </Button>
                      )}
                      <Button
                        className="w-full justify-start bg-transparent"
                        variant="outline"
                        onClick={() => (window.location.href = "/notifications")}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Notification Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
