"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Pill,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Package,
  Activity,
  CheckCircle,
  Info,
} from "lucide-react"

interface NotificationTemplate {
  id: string
  name: string
  description: string
  category: "clinical" | "administrative" | "emergency" | "system"
  type: string
  priority: "low" | "normal" | "high" | "urgent"
  title: string
  message: string
  icon: any
  color: string
  triggers: string[]
  recipients: string[]
}

export function NotificationTemplates() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const templates: NotificationTemplate[] = [
    {
      id: "appointment-reminder-24h",
      name: "24-Hour Appointment Reminder",
      description: "Remind patients of upcoming appointments 24 hours in advance",
      category: "clinical",
      type: "appointment",
      priority: "normal",
      title: "Appointment Reminder",
      message: "You have an appointment tomorrow at {time} with Dr. {doctor_name}",
      icon: Calendar,
      color: "text-blue-600",
      triggers: ["24 hours before appointment"],
      recipients: ["Patient"],
    },
    {
      id: "lab-results-critical",
      name: "Critical Lab Results Alert",
      description: "Immediate notification for critical lab values requiring urgent attention",
      category: "clinical",
      type: "lab_result",
      priority: "urgent",
      title: "CRITICAL: Lab Results Require Immediate Attention",
      message: "Critical lab values detected for {patient_name}. Immediate review required.",
      icon: AlertTriangle,
      color: "text-red-600",
      triggers: ["Critical lab values detected"],
      recipients: ["Ordering physician", "Department head", "On-call physician"],
    },
    {
      id: "medication-interaction",
      name: "Drug Interaction Alert",
      description: "Alert when potential drug interactions are detected",
      category: "clinical",
      type: "prescription",
      priority: "high",
      title: "Drug Interaction Warning",
      message: "Potential interaction detected between {drug1} and {drug2} for {patient_name}",
      icon: Pill,
      color: "text-orange-600",
      triggers: ["New prescription with interaction"],
      recipients: ["Prescribing physician", "Pharmacist"],
    },
    {
      id: "bed-availability-low",
      name: "Low Bed Availability Alert",
      description: "Notify when bed occupancy reaches critical levels",
      category: "administrative",
      type: "warning",
      priority: "high",
      title: "Low Bed Availability",
      message: "Bed occupancy at {percentage}%. Only {available_beds} beds remaining.",
      icon: Users,
      color: "text-orange-600",
      triggers: ["Bed occupancy > 90%"],
      recipients: ["Bed management", "Nursing supervisors", "Administration"],
    },
    {
      id: "shift-change-handoff",
      name: "Shift Change Handoff",
      description: "Notify incoming staff of important patient information during shift changes",
      category: "clinical",
      type: "info",
      priority: "normal",
      title: "Shift Handoff - Important Updates",
      message: "Shift handoff summary: {patient_count} patients, {critical_count} critical cases",
      icon: Clock,
      color: "text-blue-600",
      triggers: ["Shift change time"],
      recipients: ["Incoming shift staff", "Charge nurse"],
    },
    {
      id: "payment-overdue",
      name: "Overdue Payment Reminder",
      description: "Remind patients of overdue payments",
      category: "administrative",
      type: "info",
      priority: "normal",
      title: "Payment Reminder",
      message: "Your payment of ${amount} is now {days_overdue} days overdue",
      icon: DollarSign,
      color: "text-green-600",
      triggers: ["Payment overdue by 30 days"],
      recipients: ["Patient", "Billing department"],
    },
    {
      id: "inventory-low-stock",
      name: "Low Stock Alert",
      description: "Alert when inventory items reach minimum stock levels",
      category: "administrative",
      type: "warning",
      priority: "normal",
      title: "Low Stock Alert",
      message: "{item_name} is running low. Current stock: {current_stock}, Minimum: {min_stock}",
      icon: Package,
      color: "text-orange-600",
      triggers: ["Stock level below minimum"],
      recipients: ["Inventory manager", "Department head", "Purchasing"],
    },
    {
      id: "patient-discharge-ready",
      name: "Patient Ready for Discharge",
      description: "Notify when patient meets discharge criteria",
      category: "clinical",
      type: "success",
      priority: "normal",
      title: "Patient Ready for Discharge",
      message: "{patient_name} meets discharge criteria and is ready for discharge planning",
      icon: CheckCircle,
      color: "text-green-600",
      triggers: ["Discharge criteria met"],
      recipients: ["Attending physician", "Discharge planner", "Nursing staff"],
    },
    {
      id: "emergency-code-blue",
      name: "Code Blue Emergency",
      description: "Immediate alert for cardiac arrest emergencies",
      category: "emergency",
      type: "error",
      priority: "urgent",
      title: "CODE BLUE - Cardiac Arrest",
      message: "CODE BLUE: {location}. Immediate response required.",
      icon: Activity,
      color: "text-red-600",
      triggers: ["Code blue activation"],
      recipients: ["Code blue team", "All available physicians", "Nursing supervisors"],
    },
    {
      id: "system-maintenance",
      name: "Scheduled System Maintenance",
      description: "Notify users of upcoming system maintenance",
      category: "system",
      type: "info",
      priority: "normal",
      title: "Scheduled System Maintenance",
      message: "System maintenance scheduled for {date} from {start_time} to {end_time}",
      icon: Info,
      color: "text-blue-600",
      triggers: ["24 hours before maintenance"],
      recipients: ["All users"],
    },
    {
      id: "infection-control-alert",
      name: "Infection Control Alert",
      description: "Alert for potential infection control issues",
      category: "clinical",
      type: "warning",
      priority: "high",
      title: "Infection Control Alert",
      message: "Potential infection control issue detected in {location}. Immediate assessment required.",
      icon: AlertTriangle,
      color: "text-red-600",
      triggers: ["Infection control criteria met"],
      recipients: ["Infection control team", "Department head", "Nursing supervisors"],
    },
    {
      id: "quality-metric-threshold",
      name: "Quality Metric Threshold Alert",
      description: "Alert when quality metrics fall below acceptable thresholds",
      category: "administrative",
      type: "warning",
      priority: "high",
      title: "Quality Metric Alert",
      message: "{metric_name} has fallen below threshold: {current_value} (Target: {target_value})",
      icon: Activity,
      color: "text-orange-600",
      triggers: ["Quality metric below threshold"],
      recipients: ["Quality assurance", "Department head", "Administration"],
    },
  ]

  const categories = [
    { id: "all", name: "All Templates", count: templates.length },
    { id: "clinical", name: "Clinical", count: templates.filter((t) => t.category === "clinical").length },
    {
      id: "administrative",
      name: "Administrative",
      count: templates.filter((t) => t.category === "administrative").length,
    },
    { id: "emergency", name: "Emergency", count: templates.filter((t) => t.category === "emergency").length },
    { id: "system", name: "System", count: templates.filter((t) => t.category === "system").length },
  ]

  const filteredTemplates =
    selectedCategory === "all" ? templates : templates.filter((t) => t.category === selectedCategory)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "clinical":
        return "bg-blue-100 text-blue-800"
      case "administrative":
        return "bg-green-100 text-green-800"
      case "emergency":
        return "bg-red-100 text-red-800"
      case "system":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "normal":
        return "bg-blue-100 text-blue-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Templates</h2>
        <p className="text-muted-foreground">Pre-configured notification templates for common hospital scenarios</p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.name}
              <Badge variant="secondary" className="text-xs">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = template.icon
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${template.color}`} />
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Priority</span>
                        <Badge className={getPriorityColor(template.priority)} variant="outline">
                          {template.priority}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Title</span>
                        <p className="text-xs font-medium">{template.title}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Message</span>
                        <p className="text-xs text-muted-foreground">{template.message}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Triggers</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.triggers.slice(0, 2).map((trigger, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                          {template.triggers.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.triggers.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Recipients</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.recipients.slice(0, 2).map((recipient, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {recipient}
                            </Badge>
                          ))}
                          {template.recipients.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.recipients.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        Configure
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
