"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
  RefreshCw,
  CreditCard,
  FileText
} from "lucide-react"
import { billingService } from "@/lib/supabase/billing"
import { getBillingPermissions } from "@/lib/types/billing"
import { BillingStats, BillingFilters } from "@/lib/types/billing"
import { Bill } from "@/lib/types/billing"
import { BillList } from "./bill-list"
import { CreateBillDialog } from "./create-bill-dialog"
import { PaymentDialog } from "./payment-dialog"
import { ReceiptDownload } from "./receipt-download"
import { BillingWorkflow } from "./billing-workflow"
import { BillingReports } from "./billing-reports"
import { useAutoBilling } from "@/lib/hooks/use-auto-billing"

interface ComprehensiveBillingDashboardProps {
  userRole: string
  userId: string
}

export function ComprehensiveBillingDashboard({ userRole, userId }: ComprehensiveBillingDashboardProps) {
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
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const permissions = getBillingPermissions(userRole)
  const { autoBillConsultation, autoBillNurseProcedure, autoBillLabTest } = useAutoBilling()

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, billsData] = await Promise.all([
        billingService.getBillingStats(),
        billingService.getBills(filters)
      ])
      
      setStats(statsData)
      setBills(billsData)
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecordPayment = (bill: Bill) => {
    setSelectedBill(bill)
    setShowPaymentDialog(true)
  }

  const handlePaymentRecorded = () => {
    setShowPaymentDialog(false)
    setSelectedBill(null)
    loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      paid: "bg-green-50 text-green-700 border-green-200",
      partial: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-red-50 text-red-700 border-red-200"
    }
    return colors[status as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Management</h1>
          <p className="text-gray-600">Comprehensive billing system with M-PESA integration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {permissions.canCreateBill && (
            <Button onClick={() => setShowCreateBill(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageBillAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Per bill
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Payment Methods Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                  <span>Cash Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">60%</div>
                <p className="text-sm text-gray-600">of total payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span>Card Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">30%</div>
                <p className="text-sm text-gray-600">of total payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-purple-600" />
                  <span>Insurance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">10%</div>
                <p className="text-sm text-gray-600">of total payments</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bills */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">
                          {bill.patient?.first_name} {bill.patient?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">MRN: {bill.patient?.mrn}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(bill.total_amount)}</p>
                        <Badge variant="outline" className={getStatusColor(bill.status)}>
                          {bill.status}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        {permissions.canRecordPayment && bill.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => handleRecordPayment(bill)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay
                          </Button>
                        )}
                        <ReceiptDownload bill={bill} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <BillList
            bills={bills}
            permissions={permissions}
            onRecordPayment={handleRecordPayment}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          {selectedBill ? (
            <BillingWorkflow
              bill={selectedBill}
              onStatusChange={loadData}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Select a Bill</h3>
                  <p className="text-gray-600">Choose a bill to view its workflow</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <BillingReports
            stats={stats}
            bills={bills}
            permissions={permissions}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showCreateBill && (
        <CreateBillDialog
          open={showCreateBill}
          onOpenChange={setShowCreateBill}
          onBillCreated={loadData}
        />
      )}

      {showPaymentDialog && selectedBill && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          bill={selectedBill}
          onSubmit={handlePaymentRecorded}
        />
      )}
    </div>
  )
}
