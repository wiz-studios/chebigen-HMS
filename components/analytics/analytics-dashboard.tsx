"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

interface AnalyticsData {
  patientGrowth: Array<{ month: string; patients: number; appointments: number }>
  departmentStats: Array<{ department: string; patients: number; revenue: number }>
  appointmentTrends: Array<{ date: string; scheduled: number; completed: number; cancelled: number }>
  revenueMetrics: {
    totalRevenue: number
    pendingPayments: number
    averagePerPatient: number
    monthlyGrowth: number
  }
  operationalMetrics: {
    averageWaitTime: number
    patientSatisfaction: number
    bedOccupancy: number
    staffUtilization: number
  }
  clinicalMetrics: {
    totalEncounters: number
    pendingResults: number
    prescriptionsFilled: number
    readmissionRate: number
  }
}

interface AnalyticsDashboardProps {
  userRole: string
}

export function AnalyticsDashboard({ userRole }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Number.parseInt(timeRange))

      // Patient Growth Data
      const patientGrowthData = await generatePatientGrowthData(supabase, startDate, endDate)

      // Department Statistics
      const departmentData = await generateDepartmentStats(supabase)

      // Appointment Trends
      const appointmentData = await generateAppointmentTrends(supabase, startDate, endDate)

      // Revenue Metrics
      const revenueData = await generateRevenueMetrics(supabase, startDate, endDate)

      // Operational Metrics
      const operationalData = await generateOperationalMetrics(supabase)

      // Clinical Metrics
      const clinicalData = await generateClinicalMetrics(supabase, startDate, endDate)

      setData({
        patientGrowth: patientGrowthData,
        departmentStats: departmentData,
        appointmentTrends: appointmentData,
        revenueMetrics: revenueData,
        operationalMetrics: operationalData,
        clinicalMetrics: clinicalData,
      })
    } catch (error) {
      console.error("Error loading analytics data:", error)
      setError("Failed to load analytics data")
    } finally {
      setIsLoading(false)
    }
  }

  const generatePatientGrowthData = async (supabase: any, startDate: Date, endDate: Date) => {
    // Generate mock data for demonstration - in real implementation, query actual data
    const months = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const monthName = currentDate.toLocaleDateString("en-US", { month: "short" })
      months.push({
        month: monthName,
        patients: Math.floor(Math.random() * 50) + 20,
        appointments: Math.floor(Math.random() * 100) + 50,
      })
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return months.slice(-6) // Last 6 months
  }

  const generateDepartmentStats = async (supabase: any) => {
    return [
      { department: "Cardiology", patients: 145, revenue: 125000 },
      { department: "Orthopedics", patients: 98, revenue: 89000 },
      { department: "Pediatrics", patients: 167, revenue: 67000 },
      { department: "Emergency", patients: 234, revenue: 156000 },
      { department: "General Medicine", patients: 189, revenue: 98000 },
    ]
  }

  const generateAppointmentTrends = async (supabase: any, startDate: Date, endDate: Date) => {
    const days = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      days.push({
        date: currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        scheduled: Math.floor(Math.random() * 30) + 10,
        completed: Math.floor(Math.random() * 25) + 8,
        cancelled: Math.floor(Math.random() * 5) + 1,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days.slice(-14) // Last 14 days
  }

  const generateRevenueMetrics = async (supabase: any, startDate: Date, endDate: Date) => {
    return {
      totalRevenue: 487500,
      pendingPayments: 45600,
      averagePerPatient: 1250,
      monthlyGrowth: 12.5,
    }
  }

  const generateOperationalMetrics = async (supabase: any) => {
    return {
      averageWaitTime: 23,
      patientSatisfaction: 4.2,
      bedOccupancy: 78,
      staffUtilization: 85,
    }
  }

  const generateClinicalMetrics = async (supabase: any, startDate: Date, endDate: Date) => {
    return {
      totalEncounters: 1247,
      pendingResults: 34,
      prescriptionsFilled: 892,
      readmissionRate: 3.2,
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getMetricColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold
    return isGood ? "text-green-600" : "text-red-600"
  }

  const getMetricIcon = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold
    return isGood ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || "Failed to load analytics data"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into hospital operations</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.revenueMetrics.totalRevenue)}</div>
            <div className={`flex items-center text-xs ${getMetricColor(data.revenueMetrics.monthlyGrowth, 0)}`}>
              {getMetricIcon(data.revenueMetrics.monthlyGrowth, 0)}
              <span className="ml-1">+{data.revenueMetrics.monthlyGrowth}% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Satisfaction</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.operationalMetrics.patientSatisfaction}/5.0</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="ml-1">Above target (4.0)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.operationalMetrics.averageWaitTime} min</div>
            <div
              className={`flex items-center text-xs ${getMetricColor(data.operationalMetrics.averageWaitTime, 30, true)}`}
            >
              {getMetricIcon(data.operationalMetrics.averageWaitTime, 30, true)}
              <span className="ml-1">Target: &lt;30 min</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.operationalMetrics.bedOccupancy}%</div>
            <Progress value={data.operationalMetrics.bedOccupancy} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Growth</CardTitle>
                <CardDescription>New patients and appointments over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="patients"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.departmentStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {data.departmentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Patient volume and revenue by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="patients" fill="#3b82f6" name="Patients" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <CardDescription>Daily appointment statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.appointmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={2} name="Scheduled" />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} name="Cancelled" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Encounters</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.clinicalMetrics.totalEncounters}</div>
                <p className="text-xs text-muted-foreground">Clinical visits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Results</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data.clinicalMetrics.pendingResults}</div>
                <p className="text-xs text-muted-foreground">Lab results pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prescriptions Filled</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.clinicalMetrics.prescriptionsFilled}</div>
                <p className="text-xs text-muted-foreground">Medications dispensed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Readmission Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.clinicalMetrics.readmissionRate}%</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="ml-1">Below target (5%)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
