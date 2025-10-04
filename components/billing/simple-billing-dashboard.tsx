"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, Receipt, AlertTriangle } from "lucide-react"

interface BillingStats {
  totalPatients: number
  totalBills: number
  totalRevenue: number
  pendingAmount: number
}

interface SimpleBillingDashboardProps {
  userRole: string
  userId?: string
}

export function SimpleBillingDashboard({ userRole, userId }: SimpleBillingDashboardProps) {
  const [stats, setStats] = useState<BillingStats>({
    totalPatients: 0,
    totalBills: 0,
    totalRevenue: 0,
    pendingAmount: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Get total patients
      const { count: totalPatients, error: patientsError } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })

      if (patientsError) {
        console.error("Error loading patients:", patientsError)
        throw patientsError
      }

      // Try to get billing data
      let totalBills = 0
      let totalRevenue = 0
      let pendingAmount = 0

      try {
        // Get total bills count
        const { count: billsCount } = await supabase
          .from("bills")
          .select("*", { count: "exact", head: true })

        // Get total revenue (sum of paid bills)
        const { data: revenueData } = await supabase
          .from("bills")
          .select("amount")
          .eq("status", "paid")

        // Get pending amount (sum of pending bills)
        const { data: pendingData } = await supabase
          .from("bills")
          .select("amount")
          .eq("status", "pending")

        totalBills = billsCount || 0
        totalRevenue = revenueData?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0
        pendingAmount = pendingData?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0
      } catch (billingError) {
        // Billing tables don't exist yet - that's okay
        console.log("Billing tables not available yet")
      }

      setStats({
        totalPatients: totalPatients || 0,
        totalBills,
        totalRevenue,
        pendingAmount
      })

    } catch (error) {
      console.error("Error loading stats:", error)
      setStats({
        totalPatients: 0,
        totalBills: 0,
        totalRevenue: 0,
        pendingAmount: 0
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
        {/* Total Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Registered patients
            </p>
          </CardContent>
        </Card>

        {/* Total Bills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-xs text-muted-foreground">
              All bills created
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From paid bills
            </p>
          </CardContent>
        </Card>

        {/* Pending Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common billing tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">
              Create New Bill
            </Button>
            <Button className="w-full" variant="outline">
              Record Payment
            </Button>
            <Button className="w-full" variant="outline">
              View All Bills
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing Summary</CardTitle>
            <CardDescription>Current billing status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Revenue</span>
              <span className="font-medium text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending Amount</span>
              <span className="font-medium text-yellow-600">
                {formatCurrency(stats.pendingAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Bills</span>
              <Badge variant="outline">
                {stats.totalBills}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
