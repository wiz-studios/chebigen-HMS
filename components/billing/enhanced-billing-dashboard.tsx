"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { paymentSyncService, PaymentSyncEvent } from "@/lib/supabase/payment-sync"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  DollarSign, 
  Receipt, 
  AlertTriangle, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw
} from "lucide-react"
import { billingService } from "@/lib/supabase/billing"
import { getBillingPermissions } from "@/lib/types/billing"
import { BillingStats, BillingFilters } from "@/lib/types/billing"
import { Bill } from "@/lib/types/billing"
import { BillList } from "./bill-list"
import { CreateBillDialog } from "./create-bill-dialog"
import { BillingReports } from "./billing-reports"
import { PaymentDialog } from "./payment-dialog"
import { BillDebugPanel } from "./bill-debug-panel"

interface EnhancedBillingDashboardProps {
  userRole: string
  userId: string
}

export function EnhancedBillingDashboard({ userRole, userId }: EnhancedBillingDashboardProps) {
  const [stats, setStats] = useState<BillingStats>({
    totalBills: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    partialAmount: 0,
    cancelledAmount: 0,
    averageBillAmount: 0,
    billsByStatus: { pending: 0, paid: 0, partial: 0, cancelled: 0 },
    revenueByMonth: []
  })
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<BillingFilters>({})
  const [showCreateBill, setShowCreateBill] = useState(false)
  
  // Debug dialog state
  console.log("Dashboard: showCreateBill state:", showCreateBill)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const processingPayments = useRef<Set<string>>(new Set())
  const paymentLocks = useRef<Map<string, number>>(new Map())
  const loadDataTimeout = useRef<NodeJS.Timeout | null>(null)

  const permissions = getBillingPermissions(userRole)
  
  // Debug permissions
  console.log("Dashboard: User role:", userRole)
  console.log("Dashboard: Permissions:", permissions)
  console.log("Dashboard: Can create bill:", permissions.canCreateBill)

  useEffect(() => {
    loadData()
    
    // Set up enhanced payment synchronization with debouncing
    let refreshTimeout: NodeJS.Timeout | null = null
    
    const handlePaymentSync = (event: PaymentSyncEvent) => {
      console.log('Dashboard: Payment sync event received:', event)
      
      switch (event.type) {
        case 'payment_recorded':
        case 'payment_updated':
        case 'payment_deleted':
        case 'bill_status_changed':
          console.log('Dashboard: Scheduling data refresh due to payment sync event')
          // Debounce rapid updates
          if (refreshTimeout) {
            clearTimeout(refreshTimeout)
          }
          refreshTimeout = setTimeout(() => {
            console.log('Dashboard: Executing debounced data refresh')
            loadData()
          }, 500) // 500ms debounce
          break
      }
    }

    // Subscribe to system-wide payment updates (temporarily disabled to prevent duplicates)
    // const unsubscribe = paymentSyncService.subscribeToSystemPayments(handlePaymentSync)
    const unsubscribe = () => {} // Disabled to prevent duplicate payments

    // Clean up old payment locks every 30 seconds
    const lockCleanupInterval = setInterval(() => {
      const now = Date.now()
      const oldLocks = Array.from(paymentLocks.current.entries())
        .filter(([billId, lockTime]) => (now - lockTime) > 30000) // Remove locks older than 30 seconds
        .map(([billId]) => billId)
      
      oldLocks.forEach(billId => {
        paymentLocks.current.delete(billId)
        processingPayments.current.delete(billId)
      })
      
      if (oldLocks.length > 0) {
        console.log('Dashboard: Cleaned up old payment locks:', oldLocks)
      }
    }, 30000)

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
      if (loadDataTimeout.current) {
        clearTimeout(loadDataTimeout.current)
      }
      clearInterval(lockCleanupInterval)
      unsubscribe()
    }
  }, [filters])

  const loadData = async () => {
    // Clear any existing timeout
    if (loadDataTimeout.current) {
      clearTimeout(loadDataTimeout.current)
    }

    // Debounce loadData calls
    loadDataTimeout.current = setTimeout(async () => {
      console.log("=== DASHBOARD: Loading data ===", new Date().toISOString())
      setIsLoading(true)
    try {
      console.log("Dashboard: Fetching stats and bills...")
      const [statsData, billsData] = await Promise.all([
        billingService.getBillingStats(userRole, userId),
        billingService.getBills(filters, 1, 20, userRole, userId)
      ])
      
      console.log("Dashboard: Stats data:", statsData)
      console.log("Dashboard: Bills data:", billsData)
      console.log("Dashboard: Bills count:", billsData.bills?.length || 0)
      
      // Log each bill's status
      if (billsData.bills) {
        billsData.bills.forEach((bill, index) => {
          console.log(`Dashboard: Bill ${index + 1}:`, {
            id: bill.id,
            status: bill.status,
            total_amount: bill.total_amount,
            paid_amount: bill.paid_amount
          })
        })
      }
      
      setStats(statsData)
      setBills(billsData.bills)
      console.log("Dashboard: Data loaded successfully")
    } catch (error) {
      console.error("Dashboard: Error loading billing data:", error)
    } finally {
      setIsLoading(false)
    }
    }, 100) // 100ms debounce
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const handleCreateBill = async (billData: any) => {
    console.log("Creating bill with data:", billData)
    console.log("User ID:", userId)
    console.log("User Role:", userRole)
    
    try {
      const result = await billingService.createBill(billData, userId)
      console.log("=== DASHBOARD: Bill created successfully ===")
      console.log("Bill result:", result)
      console.log("Bill total amount:", result.total_amount)
      console.log("Bill items:", result.items)
      
      // Show success message first
      alert(`Bill created successfully! Total: ${result.total_amount}`)
      
      // Small delay to ensure database has processed the bill
      setTimeout(async () => {
        console.log("Dashboard: Refreshing data after bill creation...")
        await loadData()
        setShowCreateBill(false)
      }, 2000) // Increased delay to 2 seconds
    } catch (error) {
      console.error("Error creating bill:", error)
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Show detailed error to user
      const errorMessage = error.message || error.toString()
      alert(`Error creating bill: ${errorMessage}`)
    }
  }

  const handleRecordPayment = async (paymentData: any) => {
    try {
      console.log("=== DASHBOARD: Starting payment recording ===")
      console.log("Dashboard: Recording payment:", paymentData)
      
      // Check if we're already processing a payment for this bill
      const billId = paymentData.bill_id
      const now = Date.now()
      
      // Check if this bill is locked (within last 10 seconds)
      const lockTime = paymentLocks.current.get(billId)
      if (lockTime && (now - lockTime) < 10000) {
        console.log("Dashboard: Payment locked for bill:", billId, "lock time:", lockTime)
        throw new Error("Payment is currently locked for this bill. Please wait a moment.")
      }
      
      if (processingPayments.current.has(billId)) {
        console.log("Dashboard: Payment already being processed for bill:", billId)
        throw new Error("Payment is already being processed for this bill")
      }
      
      // Mark this bill as being processed and lock it
      processingPayments.current.add(billId)
      paymentLocks.current.set(billId, now)
      
      try {
        const payment = await billingService.recordPayment(paymentData, userId, userRole)
        console.log("Dashboard: Payment recorded successfully:", payment.id)
        
        // Wait a moment for database to process
        console.log("Dashboard: Waiting for database to process...")
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Refresh data to show updated bill status
        console.log("Dashboard: Refreshing data after payment...")
        await loadData()
        
        console.log("Dashboard: Payment recording completed successfully")
        
        // Close dialog after data refresh
        setShowPaymentDialog(false)
        setSelectedBill(null)
      } finally {
        // Always remove from processing set and lock
        processingPayments.current.delete(billId)
        paymentLocks.current.delete(billId)
      }
    } catch (error) {
      console.error("Dashboard: Error recording payment:", error)
      throw error // Re-throw to let PaymentDialog handle the error message
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageBillAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per bill amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills by Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.billsByStatus.pending}
                </p>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.billsByStatus.paid}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Paid
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Partial</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.billsByStatus.partial}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Partial
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.billsByStatus.cancelled}
                </p>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Cancelled
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bills" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="bills">Bills</TabsTrigger>
            {permissions.canGenerateReports && (
              <TabsTrigger value="reports">Reports</TabsTrigger>
            )}
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {permissions.canCreateBill && (
              <Button 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  console.log("Create Bill button clicked!")
                  console.log("Setting showCreateBill to true")
                  setShowCreateBill(true)
                  // Force re-render to ensure dialog opens
                  setTimeout(() => {
                    console.log("Dialog should be open now")
                  }, 100)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Bill
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="w-full sm:w-auto"
              onClick={async () => {
              console.log("=== FIXING ALL BILL AMOUNTS (COMPREHENSIVE) ===");
              try {
                // Get all bills with 0 total
                const billsResult = await billingService.getBills({}, 1, 1000, userRole, userId);
                console.log("Bills result:", billsResult);
                
                if (!billsResult || !billsResult.bills) {
                  console.error("No bills data returned from getBills");
                  alert("Error: Could not fetch bills data. Please check console for details.");
                  return;
                }
                
                const zeroBills = billsResult.bills.filter(bill => bill.total_amount === 0);
                console.log("Found bills with zero total:", zeroBills.length);
                
                if (zeroBills.length === 0) {
                  alert("No bills with zero amounts found!");
                  return;
                }
                
                // Recalculate each bill
                let fixedCount = 0;
                for (const bill of zeroBills) {
                  try {
                    console.log(`Fixing bill ${bill.id}...`);
                    await billingService.recalculateBillTotals(bill.id);
                    fixedCount++;
                    console.log(`Successfully fixed bill ${bill.id}`);
                  } catch (error) {
                    console.error(`Error fixing bill ${bill.id}:`, error);
                  }
                }
                
                // Refresh the dashboard
                await loadData();
                
                alert(`🎉 FIXED ${fixedCount} out of ${zeroBills.length} bills with zero amounts! 🎉`);
              } catch (error) {
                console.error("Fix all amounts error:", error);
                alert(`Error fixing amounts: ${error.message}`);
              }
            }}>
              Fix All Amounts
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={async () => {
                console.log("Dashboard: Manual refresh triggered")
                await loadData()
                alert("Data refreshed!")
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {permissions.canGenerateReports && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="bills" className="space-y-4">
          <BillList 
            bills={bills}
            permissions={permissions}
            onRecordPayment={(bill: Bill) => {
              setSelectedBill(bill)
              setShowPaymentDialog(true)
            }}
            onRefresh={loadData}
          />
        </TabsContent>

        {permissions.canGenerateReports && (
          <TabsContent value="reports" className="space-y-4">
            <BillingReports stats={stats} />
          </TabsContent>
        )}

        <TabsContent value="debug" className="space-y-4">
          <BillDebugPanel userRole={userRole} userId={userId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {permissions.canCreateBill && (
        <CreateBillDialog
          key={`create-bill-${showCreateBill}`}
          open={showCreateBill}
          onOpenChange={setShowCreateBill}
          onSubmit={handleCreateBill}
        />
      )}

      {permissions.canRecordPayment && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          bill={selectedBill}
          onSubmit={handleRecordPayment}
        />
      )}
    </div>
  )
}
