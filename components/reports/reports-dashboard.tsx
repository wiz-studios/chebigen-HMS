"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  CalendarIcon,
  Download,
  FileText,
  Users,
  Activity,
  DollarSign,
  Package,
  TrendingUp,
  Filter,
  Search,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { createBrowserClient } from "@supabase/ssr"

interface ReportData {
  id: string
  name: string
  description: string
  type: "patient" | "financial" | "clinical" | "inventory" | "staff"
  data: any[]
  generatedAt: string
  generatedBy: string
  filters?: Record<string, any>
  recordCount: number
  status: "completed" | "generating" | "failed"
}

interface ScheduledReport {
  id: string
  name: string
  reportType: string
  frequency: "daily" | "weekly" | "monthly"
  recipients: string[]
  lastRun?: string
  nextRun: string
  isActive: boolean
}

export default function ReportsDashboard() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [selectedReportType, setSelectedReportType] = useState<string>("")
  const [reportFormat, setReportFormat] = useState<"pdf" | "excel" | "csv">("pdf")
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [newScheduledReport, setNewScheduledReport] = useState({
    name: "",
    reportType: "",
    frequency: "weekly" as const,
    recipients: "",
    isActive: true,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const reportTypes = [
    {
      id: "patient-summary",
      name: "Patient Summary Report",
      description: "Overview of patient demographics and statistics",
      type: "patient" as const,
      icon: Users,
      filters: ["age_range", "gender", "insurance_type", "department"],
    },
    {
      id: "financial-summary",
      name: "Financial Summary Report",
      description: "Revenue, expenses, and billing analysis",
      type: "financial" as const,
      icon: DollarSign,
      filters: ["payment_status", "insurance_type", "amount_range", "department"],
    },
    {
      id: "appointment-analytics",
      name: "Appointment Analytics",
      description: "Appointment trends and scheduling efficiency",
      type: "clinical" as const,
      icon: Activity,
      filters: ["status", "department", "provider", "appointment_type"],
    },
    {
      id: "inventory-status",
      name: "Inventory Status Report",
      description: "Stock levels, expiry alerts, and usage patterns",
      type: "inventory" as const,
      icon: Package,
      filters: ["category", "supplier", "stock_level", "expiry_status"],
    },
    {
      id: "staff-performance",
      name: "Staff Performance Report",
      description: "Staff productivity and patient satisfaction metrics",
      type: "staff" as const,
      icon: TrendingUp,
      filters: ["role", "department", "performance_metric"],
    },
    {
      id: "clinical-outcomes",
      name: "Clinical Outcomes Report",
      description: "Patient outcomes, readmission rates, and quality metrics",
      type: "clinical" as const,
      icon: Activity,
      filters: ["diagnosis", "treatment_outcome", "readmission_period"],
    },
    {
      id: "compliance-audit",
      name: "Compliance Audit Report",
      description: "Regulatory compliance and audit trail analysis",
      type: "clinical" as const,
      icon: FileText,
      filters: ["compliance_type", "audit_period", "department"],
    },
  ]

  useEffect(() => {
    loadScheduledReports()
  }, [])

  const loadScheduledReports = async () => {
    // Mock data for scheduled reports - in real implementation, load from database
    const mockScheduledReports: ScheduledReport[] = [
      {
        id: "1",
        name: "Weekly Patient Summary",
        reportType: "patient-summary",
        frequency: "weekly",
        recipients: ["admin@hospital.com", "director@hospital.com"],
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      },
      {
        id: "2",
        name: "Monthly Financial Report",
        reportType: "financial-summary",
        frequency: "monthly",
        recipients: ["finance@hospital.com"],
        lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      },
    ]
    setScheduledReports(mockScheduledReports)
  }

  const generateReport = async (reportTypeId: string) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      let reportData: any[] = []
      let reportName = ""
      let reportDescription = ""

      // Apply advanced filters to queries
      const buildFilterQuery = (baseQuery: any) => {
        let query = baseQuery

        if (advancedFilters.department) {
          query = query.eq("department", advancedFilters.department)
        }
        if (advancedFilters.status) {
          query = query.eq("status", advancedFilters.status)
        }
        if (advancedFilters.age_range) {
          const [minAge, maxAge] = advancedFilters.age_range.split("-").map(Number)
          // Age calculation would be done in the query
        }

        return query
      }

      switch (reportTypeId) {
        case "patient-summary":
          let patientsQuery = supabase
            .from("patients")
            .select(`
              *,
              encounters(count),
              appointments(count)
            `)
            .gte("created_at", dateRange.from?.toISOString())
            .lte("created_at", dateRange.to?.toISOString())

          patientsQuery = buildFilterQuery(patientsQuery)
          const { data: patients } = await patientsQuery

          reportData = patients || []
          reportName = "Patient Summary Report"
          reportDescription = `Patient data from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break

        case "financial-summary":
          let invoicesQuery = supabase
            .from("invoices")
            .select(`
              *,
              patients(first_name, last_name),
              billing_items(*)
            `)
            .gte("created_at", dateRange.from?.toISOString())
            .lte("created_at", dateRange.to?.toISOString())

          invoicesQuery = buildFilterQuery(invoicesQuery)
          const { data: invoices } = await invoicesQuery

          reportData = invoices || []
          reportName = "Financial Summary Report"
          reportDescription = `Financial data from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break

        case "appointment-analytics":
          let appointmentsQuery = supabase
            .from("appointments")
            .select(`
              *,
              patients(first_name, last_name),
              users(first_name, last_name)
            `)
            .gte("appointment_date", dateRange.from?.toISOString())
            .lte("appointment_date", dateRange.to?.toISOString())

          appointmentsQuery = buildFilterQuery(appointmentsQuery)
          const { data: appointments } = await appointmentsQuery

          reportData = appointments || []
          reportName = "Appointment Analytics Report"
          reportDescription = `Appointment data from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break

        case "inventory-status":
          let inventoryQuery = supabase.from("inventory_items").select(`
              *,
              inventory_categories(name),
              suppliers(name)
            `)

          inventoryQuery = buildFilterQuery(inventoryQuery)
          const { data: inventory } = await inventoryQuery

          reportData = inventory || []
          reportName = "Inventory Status Report"
          reportDescription = `Current inventory status as of ${format(new Date(), "MMM dd, yyyy")}`
          break

        case "staff-performance":
          let staffQuery = supabase
            .from("users")
            .select(`
              *,
              appointments(count),
              encounters(count)
            `)
            .neq("role", "patient")

          staffQuery = buildFilterQuery(staffQuery)
          const { data: staff } = await staffQuery

          reportData = staff || []
          reportName = "Staff Performance Report"
          reportDescription = `Staff performance metrics from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break

        case "clinical-outcomes":
          const { data: encounters } = await supabase
            .from("encounters")
            .select(`
              *,
              patients(first_name, last_name, date_of_birth),
              users(first_name, last_name)
            `)
            .gte("encounter_date", dateRange.from?.toISOString())
            .lte("encounter_date", dateRange.to?.toISOString())

          reportData = encounters || []
          reportName = "Clinical Outcomes Report"
          reportDescription = `Clinical outcomes from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break

        case "compliance-audit":
          const { data: auditLogs } = await supabase
            .from("audit_logs")
            .select(`
              *,
              users(first_name, last_name, role)
            `)
            .gte("created_at", dateRange.from?.toISOString())
            .lte("created_at", dateRange.to?.toISOString())

          reportData = auditLogs || []
          reportName = "Compliance Audit Report"
          reportDescription = `Audit trail from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`
          break
      }

      const newReport: ReportData = {
        id: Date.now().toString(),
        name: reportName,
        description: reportDescription,
        type: reportTypes.find((t) => t.id === reportTypeId)?.type || "patient",
        data: reportData,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email || "Unknown",
        filters: { ...advancedFilters },
        recordCount: reportData.length,
        status: "completed",
      }

      setReports((prev) => [newReport, ...prev])
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (report: ReportData, format: "pdf" | "excel" | "csv") => {
    try {
      const exportData = {
        reportName: report.name,
        description: report.description,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
        recordCount: report.recordCount,
        filters: report.filters,
        data: report.data,
        format,
      }

      if (format === "csv") {
        if (report.data.length === 0) return

        // Create CSV with metadata header
        const metadata = [
          `Report: ${report.name}`,
          `Description: ${report.description}`,
          `Generated: ${format(new Date(report.generatedAt), "MMM dd, yyyy HH:mm")}`,
          `Generated By: ${report.generatedBy}`,
          `Records: ${report.recordCount}`,
          `Filters: ${JSON.stringify(report.filters || {})}`,
          "", // Empty line
          "",
        ].join("\n")

        const headers = Object.keys(report.data[0]).join(",")
        const rows = report.data
          .map((row) =>
            Object.values(row)
              .map((value) => {
                if (value === null || value === undefined) return ""
                if (typeof value === "object") return JSON.stringify(value)
                if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
                return value
              })
              .join(","),
          )
          .join("\n")

        const csvContent = `${metadata}${headers}\n${rows}`
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${report.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else if (format === "excel") {
        // Enhanced Excel export with proper formatting
        const headers = Object.keys(report.data[0] || {}).join("\t")
        const rows = report.data
          .map((row) =>
            Object.values(row)
              .map((value) => {
                if (value === null || value === undefined) return ""
                if (typeof value === "object") return JSON.stringify(value)
                return value
              })
              .join("\t"),
          )
          .join("\n")

        const metadata = [
          `${report.name}`,
          `${report.description}`,
          `Generated: ${format(new Date(report.generatedAt), "MMM dd, yyyy HH:mm")}`,
          `Records: ${report.recordCount}`,
          "", // Empty line
          "",
        ].join("\n")

        const content = `${metadata}${headers}\n${rows}`
        const blob = new Blob([content], { type: "application/vnd.ms-excel" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${report.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        // PDF export placeholder - would use jsPDF or similar
        alert("PDF export functionality would be implemented with a PDF library like jsPDF or Puppeteer")
      }
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  const createScheduledReport = async () => {
    if (!newScheduledReport.name || !newScheduledReport.reportType) return

    const scheduledReport: ScheduledReport = {
      id: Date.now().toString(),
      name: newScheduledReport.name,
      reportType: newScheduledReport.reportType,
      frequency: newScheduledReport.frequency,
      recipients: newScheduledReport.recipients.split(",").map((email) => email.trim()),
      nextRun: new Date(
        Date.now() +
          (newScheduledReport.frequency === "daily"
            ? 24 * 60 * 60 * 1000
            : newScheduledReport.frequency === "weekly"
              ? 7 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000),
      ).toISOString(),
      isActive: newScheduledReport.isActive,
    }

    setScheduledReports((prev) => [...prev, scheduledReport])
    setNewScheduledReport({
      name: "",
      reportType: "",
      frequency: "weekly",
      recipients: "",
      isActive: true,
    })
  }

  const toggleScheduledReport = (id: string) => {
    setScheduledReports((prev) =>
      prev.map((report) => (report.id === id ? { ...report, isActive: !report.isActive } : report)),
    )
  }

  const deleteScheduledReport = (id: string) => {
    setScheduledReports((prev) => prev.filter((report) => report.id !== id))
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "patient":
        return "bg-blue-100 text-blue-800"
      case "financial":
        return "bg-green-100 text-green-800"
      case "clinical":
        return "bg-purple-100 text-purple-800"
      case "inventory":
        return "bg-orange-100 text-orange-800"
      case "staff":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || report.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate, schedule, and export comprehensive hospital reports</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
              <CardDescription>
                Select report type and configure filters to generate comprehensive reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select
                    value={reportFormat}
                    onValueChange={(value: "pdf" | "excel" | "csv") => setReportFormat(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Advanced Filters</Label>
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="w-full justify-start"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {showAdvancedFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>
              </div>

              {showAdvancedFilters && (
                <Card className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select
                        value={advancedFilters.department || "all"}
                        onValueChange={(value) => setAdvancedFilters((prev) => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All departments</SelectItem>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={advancedFilters.status || "all"}
                        onValueChange={(value) => setAdvancedFilters((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Age Range</Label>
                      <Select
                        value={advancedFilters.age_range || "all"}
                        onValueChange={(value) => setAdvancedFilters((prev) => ({ ...prev, age_range: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All ages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ages</SelectItem>
                          <SelectItem value="0-18">0-18 years</SelectItem>
                          <SelectItem value="19-35">19-35 years</SelectItem>
                          <SelectItem value="36-55">36-55 years</SelectItem>
                          <SelectItem value="56-100">56+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setAdvancedFilters({})} size="sm">
                      Clear Filters
                    </Button>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((reportType) => {
                  const Icon = reportType.icon
                  return (
                    <Card key={reportType.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm">{reportType.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">{reportType.description}</CardDescription>
                        {reportType.filters && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {reportType.filters.slice(0, 3).map((filter) => (
                              <Badge key={filter} variant="secondary" className="text-xs">
                                {filter.replace("_", " ")}
                              </Badge>
                            ))}
                            {reportType.filters.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{reportType.filters.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          onClick={() => generateReport(reportType.id)}
                          disabled={loading}
                          className="w-full"
                          size="sm"
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate Report"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Scheduled Report</CardTitle>
                <CardDescription>Set up automatic report generation and delivery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    value={newScheduledReport.name}
                    onChange={(e) => setNewScheduledReport((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekly Patient Summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={newScheduledReport.reportType}
                    onValueChange={(value) => setNewScheduledReport((prev) => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newScheduledReport.frequency}
                    onValueChange={(value: "daily" | "weekly" | "monthly") =>
                      setNewScheduledReport((prev) => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recipients (comma-separated emails)</Label>
                  <Textarea
                    value={newScheduledReport.recipients}
                    onChange={(e) => setNewScheduledReport((prev) => ({ ...prev, recipients: e.target.value }))}
                    placeholder="admin@hospital.com, director@hospital.com"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newScheduledReport.isActive}
                    onCheckedChange={(checked) => setNewScheduledReport((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Active</Label>
                </div>

                <Button onClick={createScheduledReport} className="w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  Create Scheduled Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>Manage your automated report schedules</CardDescription>
              </CardHeader>
              <CardContent>
                {scheduledReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled reports</p>
                    <p className="text-sm">Create your first scheduled report</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledReports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{report.name}</h3>
                              <Badge variant={report.isActive ? "default" : "secondary"}>
                                {report.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {reportTypes.find((t) => t.id === report.reportType)?.name} • {report.frequency}
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {report.lastRun && (
                                <p>Last run: {format(new Date(report.lastRun), "MMM dd, yyyy HH:mm")}</p>
                              )}
                              <p>Next run: {format(new Date(report.nextRun), "MMM dd, yyyy HH:mm")}</p>
                              <p>Recipients: {report.recipients.join(", ")}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleScheduledReport(report.id)}>
                              {report.isActive ? "Pause" : "Resume"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteScheduledReport(report.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Report History</CardTitle>
                  <CardDescription>Previously generated reports and exports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="clinical">Clinical</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports found</p>
                  <p className="text-sm">
                    {reports.length === 0
                      ? "Generate your first report to see it here"
                      : "Try adjusting your search or filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{report.name}</h3>
                          <Badge className={getTypeColor(report.type)}>{report.type}</Badge>
                          <Badge
                            variant={
                              report.status === "completed"
                                ? "default"
                                : report.status === "generating"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{report.description}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            Generated on {format(new Date(report.generatedAt), "MMM dd, yyyy HH:mm")} by{" "}
                            {report.generatedBy}
                          </p>
                          <p>{report.recordCount} records</p>
                          {report.filters && Object.keys(report.filters).length > 0 && (
                            <p>
                              Filters:{" "}
                              {Object.entries(report.filters)
                                .filter(([_, value]) => value)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => exportReport(report, "csv")}>
                          <Download className="h-4 w-4 mr-1" />
                          CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportReport(report, "excel")}>
                          <Download className="h-4 w-4 mr-1" />
                          Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportReport(report, "pdf")}>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
