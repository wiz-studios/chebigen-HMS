"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  DollarSign,
  Activity,
  Package,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: "clinical" | "financial" | "operational" | "compliance"
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  complexity: "basic" | "intermediate" | "advanced"
  estimatedTime: string
  dataPoints: string[]
  icon: any
}

export function ReportTemplates() {
  const templates: ReportTemplate[] = [
    {
      id: "daily-census",
      name: "Daily Census Report",
      description: "Current patient census, admissions, discharges, and bed occupancy",
      category: "operational",
      frequency: "daily",
      complexity: "basic",
      estimatedTime: "2-3 minutes",
      dataPoints: ["Current patients", "New admissions", "Discharges", "Bed occupancy", "Department breakdown"],
      icon: Users,
    },
    {
      id: "financial-dashboard",
      name: "Financial Performance Dashboard",
      description: "Revenue, expenses, billing metrics, and financial KPIs",
      category: "financial",
      frequency: "monthly",
      complexity: "advanced",
      estimatedTime: "5-7 minutes",
      dataPoints: [
        "Total revenue",
        "Outstanding receivables",
        "Payment trends",
        "Department profitability",
        "Cost analysis",
      ],
      icon: DollarSign,
    },
    {
      id: "quality-metrics",
      name: "Quality & Safety Metrics",
      description: "Patient safety indicators, quality measures, and compliance metrics",
      category: "clinical",
      frequency: "monthly",
      complexity: "intermediate",
      estimatedTime: "4-5 minutes",
      dataPoints: [
        "Patient satisfaction",
        "Readmission rates",
        "Infection rates",
        "Medication errors",
        "Safety incidents",
      ],
      icon: CheckCircle,
    },
    {
      id: "staff-productivity",
      name: "Staff Productivity Analysis",
      description: "Staff utilization, productivity metrics, and performance indicators",
      category: "operational",
      frequency: "weekly",
      complexity: "intermediate",
      estimatedTime: "3-4 minutes",
      dataPoints: [
        "Staff utilization",
        "Patient-to-staff ratios",
        "Overtime hours",
        "Productivity scores",
        "Department efficiency",
      ],
      icon: TrendingUp,
    },
    {
      id: "inventory-turnover",
      name: "Inventory Turnover Report",
      description: "Stock levels, usage patterns, expiry tracking, and procurement needs",
      category: "operational",
      frequency: "weekly",
      complexity: "basic",
      estimatedTime: "2-3 minutes",
      dataPoints: ["Stock levels", "Usage rates", "Expiry alerts", "Reorder points", "Cost analysis"],
      icon: Package,
    },
    {
      id: "regulatory-compliance",
      name: "Regulatory Compliance Report",
      description: "Compliance status, audit findings, and regulatory requirements tracking",
      category: "compliance",
      frequency: "quarterly",
      complexity: "advanced",
      estimatedTime: "8-10 minutes",
      dataPoints: [
        "Compliance scores",
        "Audit findings",
        "Corrective actions",
        "Training completion",
        "Policy updates",
      ],
      icon: AlertTriangle,
    },
    {
      id: "appointment-efficiency",
      name: "Appointment Efficiency Report",
      description: "Scheduling efficiency, wait times, no-shows, and capacity utilization",
      category: "operational",
      frequency: "weekly",
      complexity: "basic",
      estimatedTime: "2-3 minutes",
      dataPoints: ["Appointment volume", "Wait times", "No-show rates", "Capacity utilization", "Provider efficiency"],
      icon: Calendar,
    },
    {
      id: "clinical-outcomes",
      name: "Clinical Outcomes Analysis",
      description: "Treatment outcomes, recovery rates, and clinical effectiveness metrics",
      category: "clinical",
      frequency: "monthly",
      complexity: "advanced",
      estimatedTime: "6-8 minutes",
      dataPoints: [
        "Treatment success rates",
        "Recovery times",
        "Complication rates",
        "Patient outcomes",
        "Clinical pathways",
      ],
      icon: Activity,
    },
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "clinical":
        return "bg-blue-100 text-blue-800"
      case "financial":
        return "bg-green-100 text-green-800"
      case "operational":
        return "bg-purple-100 text-purple-800"
      case "compliance":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "basic":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Report Templates</h2>
        <p className="text-muted-foreground">Pre-configured report templates for common hospital reporting needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const Icon = template.icon
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={getCategoryColor(template.category)} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{template.estimatedTime}</span>
                  </div>
                  <Badge className={getComplexityColor(template.complexity)} variant="outline">
                    {template.complexity}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Key Data Points:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.dataPoints.slice(0, 3).map((point, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {point}
                      </Badge>
                    ))}
                    {template.dataPoints.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.dataPoints.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Use Template
                  </Button>
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
