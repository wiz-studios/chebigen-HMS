"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  FileText,
  Pill,
  AlertTriangle,
  Clock,
  Volume2,
  VolumeX,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface NotificationPreferences {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  appointment_reminders: boolean
  lab_result_alerts: boolean
  prescription_alerts: boolean
  system_alerts: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: string
  updated_at: string
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testNotification, setTestNotification] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences if none exist
        const { data: newPrefs, error: createError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
          })
          .select()
          .single()

        if (createError) throw createError
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error)
      toast.error("Failed to load notification preferences")
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", preferences.id)
        .select()
        .single()

      if (error) throw error

      setPreferences(data)
      toast.success("Notification preferences updated")
    } catch (error) {
      console.error("Error updating preferences:", error)
      toast.error("Failed to update preferences")
    } finally {
      setSaving(false)
    }
  }

  const sendTestNotification = async () => {
    setTestNotification(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc("create_notification", {
        p_user_id: user.id,
        p_title: "Test Notification",
        p_message: "This is a test notification to verify your settings are working correctly.",
        p_type: "info",
        p_priority: "normal",
      })

      if (error) throw error

      toast.success("Test notification sent!")
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast.error("Failed to send test notification")
    } finally {
      setTestNotification(false)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load notification preferences</p>
            <Button onClick={loadPreferences} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Customize how and when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Delivery Methods
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-green-600" />
                  <div>
                    <Label className="text-sm font-medium">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive in-app notifications</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) => updatePreferences({ push_notifications: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Types</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <Label className="text-sm font-medium">Appointment Reminders</Label>
                    <p className="text-xs text-muted-foreground">Reminders for upcoming appointments</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.appointment_reminders}
                  onCheckedChange={(checked) => updatePreferences({ appointment_reminders: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <div>
                    <Label className="text-sm font-medium">Lab Result Alerts</Label>
                    <p className="text-xs text-muted-foreground">Notifications when lab results are ready</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.lab_result_alerts}
                  onCheckedChange={(checked) => updatePreferences({ lab_result_alerts: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Pill className="h-4 w-4 text-green-600" />
                  <div>
                    <Label className="text-sm font-medium">Prescription Alerts</Label>
                    <p className="text-xs text-muted-foreground">Medication and prescription notifications</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.prescription_alerts}
                  onCheckedChange={(checked) => updatePreferences({ prescription_alerts: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    <Label className="text-sm font-medium">System Alerts</Label>
                    <p className="text-xs text-muted-foreground">Important system and security notifications</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.system_alerts}
                  onCheckedChange={(checked) => updatePreferences({ system_alerts: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quiet Hours
            </h3>
            <p className="text-sm text-muted-foreground">
              Set quiet hours to reduce non-urgent notifications during specific times
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quiet Hours Start</Label>
                <Select
                  value={preferences.quiet_hours_start}
                  onValueChange={(value) => updatePreferences({ quiet_hours_start: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0")
                      const time = `${hour}:00:00`
                      return (
                        <SelectItem key={time} value={time}>
                          {formatTime(time)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quiet Hours End</Label>
                <Select
                  value={preferences.quiet_hours_end}
                  onValueChange={(value) => updatePreferences({ quiet_hours_end: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0")
                      const time = `${hour}:00:00`
                      return (
                        <SelectItem key={time} value={time}>
                          {formatTime(time)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {preferences.quiet_hours_start !== preferences.quiet_hours_end ? (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>
                    Quiet hours: {formatTime(preferences.quiet_hours_start)} - {formatTime(preferences.quiet_hours_end)}
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>No quiet hours set</span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Test Notification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Notifications</h3>
            <p className="text-sm text-muted-foreground">Send a test notification to verify your settings</p>
            <Button onClick={sendTestNotification} disabled={testNotification} variant="outline">
              {testNotification ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test Notification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Statistics</CardTitle>
          <CardDescription>Your notification activity over the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationStats />
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from("notifications")
        .select("type, priority, read, created_at")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())

      if (error) throw error

      const totalNotifications = data.length
      const readNotifications = data.filter((n) => n.read).length
      const unreadNotifications = totalNotifications - readNotifications

      const typeBreakdown = data.reduce(
        (acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const priorityBreakdown = data.reduce(
        (acc, n) => {
          acc[n.priority] = (acc[n.priority] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      setStats({
        total: totalNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        readRate: totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : 0,
        typeBreakdown,
        priorityBreakdown,
      })
    } catch (error) {
      console.error("Error loading notification stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground">No notification data available</div>
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-4 w-4" />
      case "lab_result":
        return <FileText className="h-4 w-4" />
      case "prescription":
        return <Pill className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "text-blue-600"
      case "lab_result":
        return "text-purple-600"
      case "prescription":
        return "text-green-600"
      case "warning":
        return "text-orange-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.read}</div>
          <div className="text-sm text-muted-foreground">Read</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
          <div className="text-sm text-muted-foreground">Unread</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.readRate}%</div>
          <div className="text-sm text-muted-foreground">Read Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">By Type</h4>
          <div className="space-y-2">
            {Object.entries(stats.typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${getTypeColor(type)}`}>
                  {getTypeIcon(type)}
                  <span className="text-sm capitalize">{type.replace("_", " ")}</span>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">By Priority</h4>
          <div className="space-y-2">
            {Object.entries(stats.priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm capitalize">{priority}</span>
                <Badge
                  variant={
                    priority === "urgent"
                      ? "destructive"
                      : priority === "high"
                        ? "secondary"
                        : priority === "low"
                          ? "outline"
                          : "default"
                  }
                >
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
