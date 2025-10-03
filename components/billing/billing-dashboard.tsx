"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Users, AlertTriangle, CheckCircle } from "lucide-react"

interface BillingStats {
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  todayRevenue: number
  totalInvoices: number
  paidInvoices: number
  overdueInvoices: number
}

interface BillingDashboardProps {
  userRole: string
  userId?: string
}

export function BillingDashboard({ userRole, userId }: BillingDashboardProps) {
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todayRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadBillingStats()
  }, [])

  const loadBillingStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Check if billing tables exist first
      const { data: testInvoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id")
        .limit(1)

      if (invoiceError) {
        console.log("Invoices table not available:", invoiceError.message)
        setStats({
          totalRevenue: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          todayRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0
        })
        return
      }

      // Get total revenue (sum of all paid invoices)
      const { data: revenueData, error: revenueError } = await supabase
        .from("invoices")
        .select("amount")
        .eq("status", "paid")

      if (revenueError) {
        console.error("Error loading revenue data:", revenueError)
      }

      // Get pending amount (sum of sent invoices)
      const { data: pendingData, error: pendingError } = await supabase
        .from("invoices")
        .select("amount")
        .eq("status", "sent")

      if (pendingError) {
        console.error("Error loading pending data:", pendingError)
      }

      // Get overdue amount
      const { data: overdueData, error: overdueError } = await supabase
        .from("invoices")
        .select("amount")
        .eq("status", "overdue")

      if (overdueError) {
        console.error("Error loading overdue data:", overdueError)
      }

      // Get today's revenue
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData, error: todayError } = await supabase
        .from("payments")
        .select("amount")
        .eq("payment_date", today)

      if (todayError) {
        console.error("Error loading today's revenue:", todayError)
      }

      // Get invoice counts
      const { data: invoiceCounts, error: countError } = await supabase
        .from("invoices")
        .select("status")

      if (countError) {
        console.error("Error loading invoice counts:", countError)
      }

      const totalRevenue = revenueData?.reduce((sum, inv) => sum + inv.amount, 0) || 0
      const pendingAmount = pendingData?.reduce((sum, inv) => sum + inv.amount, 0) || 0
      const overdueAmount = overdueData?.reduce((sum, inv) => sum + inv.amount, 0) || 0
      const todayRevenue = todayData?.reduce((sum, pay) => sum + pay.amount, 0) || 0

      const totalInvoices = invoiceCounts?.length || 0
      const paidInvoices = invoiceCounts?.filter(inv => inv.status === "paid").length || 0
      const overdueInvoices = invoiceCounts?.filter(inv => inv.status === "overdue").length || 0

      setStats({
        totalRevenue,
        pendingAmount,
        overdueAmount,
        todayRevenue,
        totalInvoices,
        paidInvoices,
        overdueInvoices
      })

    } catch (error) {
      console.error("Error loading billing stats:", error)
      // Set default stats if there's an error
      setStats({
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        todayRevenue: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.paidInvoices} paid invoices
            </p>
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Payments received today
            </p>
          </CardContent>
        </Card>

        {/* Pending Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        {/* Overdue Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueInvoices} overdue invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Invoices:</span>
              <Badge variant="outline">{stats.totalInvoices}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Paid:</span>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.paidInvoices}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Overdue:</span>
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.overdueInvoices}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Collection Rate:</span>
                <span className="font-medium">
                  {stats.totalInvoices > 0 ? 
                    Math.round((stats.paidInvoices / stats.totalInvoices) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${stats.totalInvoices > 0 ? 
                      (stats.paidInvoices / stats.totalInvoices) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">
              Use the billing management section to:
            </p>
            <ul className="text-xs space-y-1 text-gray-500">
              <li>• Create new invoices</li>
              <li>• Record payments</li>
              <li>• Track overdue accounts</li>
              <li>• Generate reports</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
