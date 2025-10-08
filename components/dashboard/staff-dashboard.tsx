"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { paymentSyncService, PaymentSyncEvent } from "@/lib/supabase/payment-sync"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LogoutButton } from "@/components/auth/logout-button"
import { SessionGuard } from "@/components/auth/session-guard"
import { PatientManagement } from "@/components/patients/patient-management"
import { AppointmentManagement } from "@/components/appointments/appointment-management"
import { ClinicalManagement } from "@/components/clinical/clinical-management"
import { EnhancedBillingDashboard } from "@/components/billing/enhanced-billing-dashboard"
import { PatientRegistrationForm } from "@/components/patients/patient-registration-form"
import { AppointmentSchedulingForm } from "@/components/appointments/appointment-scheduling-form"
import { EncounterManagement } from "@/components/clinical/encounter-management"
import { PrescriptionManagement } from "@/components/clinical/prescription-management"
import NotificationCenter from "@/components/notifications/notification-center"
import { MobileNavigation } from "@/components/ui/mobile-navigation"
import { MobileTabs, MobileTabContent } from "@/components/ui/mobile-tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { Bell, DollarSign } from "lucide-react"
import type { User } from "@/lib/auth"
import { Users, Calendar, FileText, Activity, Stethoscope, UserPlus, BarChart3 } from "lucide-react"

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  pendingResults: number
  activeEncounters: number
}

interface RecentActivity {
  id: string
  entity: string
  action: string
  details: any
  reason: string
  created_at: string
  user?: {
    full_name: string
  }
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
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("patients")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showEncounterModal, setShowEncounterModal] = useState(false)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadDashboardStats()
    loadUnreadNotifications()
    loadRecentActivities()
    
    // Set up enhanced payment synchronization
    const handlePaymentSync = (event: PaymentSyncEvent) => {
      console.log('StaffDashboard: Payment sync event received:', event)
      
      switch (event.type) {
        case 'payment_recorded':
        case 'payment_updated':
        case 'payment_deleted':
        case 'bill_status_changed':
          console.log('StaffDashboard: Refreshing dashboard due to payment sync event')
          loadDashboardStats()
          loadRecentActivities()
          break
      }
    }

    // Subscribe to system-wide payment updates
    const unsubscribePayments = paymentSyncService.subscribeToSystemPayments(handlePaymentSync)

    // Set up notification updates (keep existing notification subscription)
    const supabase = createClient()
    const notificationChannel = supabase
      .channel('system-notification-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('StaffDashboard: Notification change detected:', payload)
          loadUnreadNotifications()
        }
      )
      .subscribe()

    return () => {
      unsubscribePayments()
      supabase.removeChannel(notificationChannel)
    }
  }, [])

  const loadDashboardStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Get total patients
      const { count: totalPatients } = await supabase.from("patients").select("*", { count: "exact", head: true })

      // Get today's appointments (role-based filtering)
      const today = new Date().toISOString().split("T")[0]
      let appointmentQuery = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_time", `${today}T00:00:00`)
        .lt("scheduled_time", `${today}T23:59:59`)
      
      // Apply role-based filtering for appointment visibility
      if (user.role === "doctor") {
        appointmentQuery = appointmentQuery.eq("provider_id", user.id)
      } else if (user.role === "patient") {
        appointmentQuery = appointmentQuery.eq("patient_id", user.id)
      } else if (user.role === "lab_tech" || user.role === "pharmacist") {
        // Lab technicians and pharmacists don't see appointments
        appointmentQuery = appointmentQuery.eq("id", "00000000-0000-0000-0000-000000000000") // Impossible condition
      }
      // Receptionist, nurse, and superadmin see all appointments (no additional filtering)
      
      const { count: todayAppointments } = await appointmentQuery

      // Get pending lab results or prescriptions (role-based)
      let pendingResults = 0
      if (user.role === "lab_tech" || user.role === "superadmin") {
        const { count } = await supabase
          .from("lab_tests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
        pendingResults = count || 0
      } else if (user.role === "pharmacist") {
        const { count } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
        pendingResults = count || 0
      }

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

  const loadRecentActivities = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          user:users(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentActivities(data || [])
    } catch (error) {
      console.error("Error loading recent activities:", error)
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const getActivityIcon = (entity: string, action: string) => {
    if (entity === "patients") {
      return { icon: UserPlus, color: "bg-green-100 text-green-600" }
    } else if (entity === "appointments") {
      return { icon: Calendar, color: "bg-blue-100 text-blue-600" }
    } else if (entity === "lab_tests" || entity === "lab_results") {
      return { icon: FileText, color: "bg-purple-100 text-purple-600" }
    } else if (entity === "encounters") {
      return { icon: Activity, color: "bg-orange-100 text-orange-600" }
    } else if (entity === "prescriptions") {
      return { icon: BarChart3, color: "bg-pink-100 text-pink-600" }
    }
    return { icon: Activity, color: "bg-gray-100 text-gray-600" }
  }

  const getActivityDescription = (activity: RecentActivity) => {
    const { entity, action, details } = activity
    const userName = activity.user?.full_name || "Unknown user"
    
    switch (entity) {
      case "patients":
        if (action === "INSERT") return `New patient registered by ${userName}`
        if (action === "UPDATE") return `Patient updated by ${userName}`
        return `Patient ${action.toLowerCase()} by ${userName}`
      
      case "appointments":
        if (action === "INSERT") return `Appointment scheduled by ${userName}`
        if (action === "UPDATE") return `Appointment updated by ${userName}`
        return `Appointment ${action.toLowerCase()} by ${userName}`
      
      case "lab_tests":
        if (action === "INSERT") return `Lab test ordered by ${userName}`
        if (action === "UPDATE") return `Lab test updated by ${userName}`
        return `Lab test ${action.toLowerCase()} by ${userName}`
      
      case "encounters":
        if (action === "INSERT") return `Encounter created by ${userName}`
        if (action === "UPDATE") return `Encounter updated by ${userName}`
        return `Encounter ${action.toLowerCase()} by ${userName}`
      
      case "prescriptions":
        if (action === "INSERT") return `Prescription created by ${userName}`
        if (action === "UPDATE") return `Prescription updated by ${userName}`
        return `Prescription ${action.toLowerCase()} by ${userName}`
      
      default:
        return `${entity} ${action.toLowerCase()} by ${userName}`
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "new-patient":
        setShowPatientModal(true)
        break
      case "schedule-appointment":
        setShowAppointmentModal(true)
        break
      case "create-encounter":
        setShowEncounterModal(true)
        break
      case "create-prescription":
        setShowPrescriptionModal(true)
        break
      case "view-patients":
        setActiveTab("patients")
        break
      case "view-appointments":
        setActiveTab("appointments")
        break
      case "view-clinical":
        setActiveTab("clinical")
        break
      case "notifications":
        window.location.href = "/notifications"
        break
      case "analytics":
        window.location.href = "/analytics"
        break
      case "inventory":
        window.location.href = "/inventory"
        break
      case "reports":
        window.location.href = "/reports"
        break
      default:
        console.log("Unknown action:", action)
    }
  }

  const handleModalClose = () => {
    setShowPatientModal(false)
    setShowAppointmentModal(false)
    setShowEncounterModal(false)
    setShowPrescriptionModal(false)
    // Refresh data when modals close
    loadDashboardStats()
    loadRecentActivities()
  }

  const tabsConfig = [
    {
      value: "patients",
      label: isMobile ? "Pts" : "Patients",
      icon: Users,
    },
    {
      value: "appointments",
      label: isMobile ? "Apps" : "Appointments",
      icon: Calendar,
    },
    {
      value: "clinical",
      label: isMobile ? "Clin" : "Clinical",
      icon: FileText,
    },
    {
      value: "billing",
      label: isMobile ? "Bill" : "Billing",
      icon: DollarSign,
    },
    {
      value: "overview",
      label: isMobile ? "View" : "Overview",
      icon: Activity,
    },
  ]

  return (
    <SessionGuard requireAuth={true} allowedRoles={['admin', 'doctor', 'nurse', 'receptionist', 'accountant']}>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className={`${isMobile ? "px-3" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}`}>
          <div className={`flex justify-between items-center ${isMobile ? "py-3" : "py-6"}`}>
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

      <div className={`${isMobile ? "px-3 py-3" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}`}>
        {/* Stats Overview */}
        <div className={`grid gap-3 mb-6 ${isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
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
                {isMobile ? "Today" : 
                  user.role === "doctor" ? "Your Appointments Today" :
                  user.role === "patient" ? "Your Appointments Today" :
                  user.role === "receptionist" ? "All Appointments (Clinic)" :
                  user.role === "nurse" ? "All Appointments (Department)" :
                  user.role === "lab_tech" ? "Lab Orders Pending" :
                  user.role === "pharmacist" ? "Prescriptions to Fulfill" :
                  "Today's Appointments"}
              </CardTitle>
              <Calendar className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.todayAppointments}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">
                {user.role === "doctor" ? "Your scheduled appointments" :
                 user.role === "patient" ? "Your scheduled appointments" :
                 user.role === "receptionist" ? "All clinic appointments" :
                 user.role === "nurse" ? "All department appointments" :
                 user.role === "lab_tech" ? "Lab tests pending" :
                 user.role === "pharmacist" ? "Prescriptions to fulfill" :
                 "Scheduled for today"}
              </p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-1" : "pb-2"}`}
            >
              <CardTitle className={isMobile ? "text-xs font-medium" : "text-sm font-medium"}>
                {isMobile ? "Pending" : 
                  user.role === "lab_tech" ? "Lab Orders Pending" :
                  user.role === "pharmacist" ? "Prescriptions to Fulfill" :
                  "Pending Results"}
              </CardTitle>
              <FileText className={`text-muted-foreground ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-bold text-orange-600 ${isMobile ? "text-lg" : "text-2xl"}`}>
                {isLoading ? "..." : stats.pendingResults}
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground">
                {user.role === "lab_tech" ? "Lab tests pending" :
                 user.role === "pharmacist" ? "Active prescriptions" :
                 "Lab results pending"}
              </p>}
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
              <PatientManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="appointments" activeValue={activeTab}>
              <AppointmentManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="clinical" activeValue={activeTab}>
              <ClinicalManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </MobileTabContent>

            <MobileTabContent value="billing" activeValue={activeTab}>
              <EnhancedBillingDashboard userRole={user.role} userId={user.id} />
            </MobileTabContent>

            <MobileTabContent value="overview" activeValue={activeTab}>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivities.length > 0 ? (
                        recentActivities.slice(0, 5).map((activity) => {
                          const { icon: Icon, color } = getActivityIcon(activity.entity, activity.action)
                          return (
                            <div key={activity.id} className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-full ${color}`}>
                                <Icon className="h-3 w-3" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{getActivityDescription(activity)}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-1">
                      {(user.role === "receptionist" || user.role === "nurse") && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-auto py-2 flex-col bg-transparent"
                          onClick={() => handleQuickAction("new-patient")}
                        >
                          <UserPlus className="h-3 w-3 mb-1" />
                          <span className="text-xs">New Patient</span>
                        </Button>
                      )}
                      {(user.role === "receptionist" || user.role === "doctor" || user.role === "nurse" || user.role === "superadmin") && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-auto py-2 flex-col bg-transparent"
                          onClick={() => handleQuickAction("schedule-appointment")}
                        >
                          <Calendar className="h-3 w-3 mb-1" />
                          <span className="text-xs">Schedule</span>
                        </Button>
                      )}
                      {(user.role === "doctor" || user.role === "nurse") && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-auto py-2 flex-col bg-transparent"
                          onClick={() => handleQuickAction("create-encounter")}
                        >
                          <Activity className="h-3 w-3 mb-1" />
                          <span className="text-xs">Encounter</span>
                        </Button>
                      )}
                      {user.role === "doctor" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-auto py-2 flex-col bg-transparent"
                          onClick={() => handleQuickAction("create-prescription")}
                        >
                          <BarChart3 className="h-3 w-3 mb-1" />
                          <span className="text-xs">Prescription</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-auto py-2 flex-col bg-transparent"
                        onClick={() => handleQuickAction("notifications")}
                      >
                        <Bell className="h-3 w-3 mb-1" />
                        <span className="text-xs">Notifications</span>
                      </Button>
                      {(user.role === "superadmin" || user.role === "doctor" || user.role === "accountant") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto py-2 flex-col bg-transparent"
                          onClick={() => handleQuickAction("analytics")}
                        >
                          <BarChart3 className="h-3 w-3 mb-1" />
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger 
                value="patients" 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3 min-w-0"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Patients</span>
                <span className="sm:hidden whitespace-nowrap">Pts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3 min-w-0"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Appointments</span>
                <span className="sm:hidden whitespace-nowrap">Apps</span>
              </TabsTrigger>
              <TabsTrigger 
                value="clinical" 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3 min-w-0"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Clinical</span>
                <span className="sm:hidden whitespace-nowrap">Clin</span>
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3 min-w-0"
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Billing</span>
                <span className="sm:hidden whitespace-nowrap">Bill</span>
              </TabsTrigger>
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3 min-w-0"
              >
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Overview</span>
                <span className="sm:hidden whitespace-nowrap">View</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patients">
              <PatientManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="appointments">
              <AppointmentManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="clinical">
              <ClinicalManagement userRole={user.role} userId={user.id} onStatsUpdate={loadDashboardStats} />
            </TabsContent>

            <TabsContent value="billing">
              <EnhancedBillingDashboard userRole={user.role} userId={user.id} />
            </TabsContent>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest system activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivities.length > 0 ? (
                        recentActivities.slice(0, 6).map((activity) => {
                          const { icon: Icon, color } = getActivityIcon(activity.entity, activity.action)
                          return (
                            <div key={activity.id} className="flex items-center space-x-4">
                              <div className={`p-2 rounded-full ${color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{getActivityDescription(activity)}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No recent activity</p>
                        </div>
                      )}
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
                        <Button 
                          className="w-full justify-start bg-transparent" 
                          variant="outline"
                          onClick={() => handleQuickAction("new-patient")}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Register New Patient
                        </Button>
                      )}
                      {(user.role === "receptionist" || user.role === "doctor" || user.role === "nurse" || user.role === "superadmin") && (
                        <Button 
                          className="w-full justify-start bg-transparent" 
                          variant="outline"
                          onClick={() => handleQuickAction("schedule-appointment")}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Appointment
                        </Button>
                      )}
                      <Button 
                        className="w-full justify-start bg-transparent" 
                        variant="outline"
                        onClick={() => handleQuickAction("view-patients")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Patient Records
                      </Button>
                      <Button 
                        className="w-full justify-start bg-transparent" 
                        variant="outline"
                        onClick={() => handleQuickAction("view-appointments")}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        View Appointments
                      </Button>
                      <Button 
                        className="w-full justify-start bg-transparent" 
                        variant="outline"
                        onClick={() => handleQuickAction("view-clinical")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Clinical Management
                      </Button>
                      {(user.role === "doctor" || user.role === "nurse") && (
                        <Button 
                          className="w-full justify-start bg-transparent" 
                          variant="outline"
                          onClick={() => handleQuickAction("create-encounter")}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Create Encounter
                        </Button>
                      )}
                      {user.role === "doctor" && (
                        <Button 
                          className="w-full justify-start bg-transparent" 
                          variant="outline"
                          onClick={() => handleQuickAction("create-prescription")}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Create Prescription
                        </Button>
                      )}
                      {(user.role === "superadmin" || user.role === "doctor" || user.role === "accountant") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => handleQuickAction("analytics")}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      )}
                      {(user.role === "superadmin" || user.role === "pharmacist" || user.role === "nurse") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => handleQuickAction("inventory")}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Manage Inventory
                        </Button>
                      )}
                      {(user.role === "superadmin" ||
                        user.role === "doctor" ||
                        user.role === "accountant") && (
                        <Button
                          className="w-full justify-start bg-transparent"
                          variant="outline"
                          onClick={() => handleQuickAction("reports")}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generate Reports
                        </Button>
                      )}
                      <Button
                        className="w-full justify-start bg-transparent"
                        variant="outline"
                        onClick={() => handleQuickAction("notifications")}
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

      {/* Modal Dialogs */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
            <DialogDescription>
              Add a new patient to the system
            </DialogDescription>
          </DialogHeader>
          <PatientRegistrationForm 
            onSuccess={() => {
              handleModalClose()
            }}
            onCancel={() => {
              setShowPatientModal(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment for a patient
            </DialogDescription>
          </DialogHeader>
          <AppointmentSchedulingForm 
            onSuccess={() => {
              handleModalClose()
            }}
            onCancel={() => {
              setShowAppointmentModal(false)
            }}
            userRole={user.role}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEncounterModal} onOpenChange={setShowEncounterModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Encounter</DialogTitle>
            <DialogDescription>
              Create a new patient encounter
            </DialogDescription>
          </DialogHeader>
          <EncounterManagement 
            userRole={user.role} 
            userId={user.id}
            onStatsUpdate={loadDashboardStats}
            onSuccess={() => {
              handleModalClose()
            }}
            onError={(error: any) => {
              console.error("Error in encounter management:", error)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Prescription</DialogTitle>
            <DialogDescription>
              Create a new prescription for a patient
            </DialogDescription>
          </DialogHeader>
          <PrescriptionManagement 
            userRole={user.role} 
            userId={user.id}
            onStatsUpdate={loadDashboardStats}
            onSuccess={() => {
              handleModalClose()
            }}
            onError={(error: any) => {
              console.error("Error in prescription management:", error)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
    </SessionGuard>
  )
}
