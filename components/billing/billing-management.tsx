"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UserRole } from "@/lib/auth"
import { Plus, Search, Eye, DollarSign, CreditCard, Receipt, AlertCircle, CheckCircle } from "lucide-react"
import { InvoiceForm } from "./invoice-form"
import { PaymentForm } from "./payment-form"
import { BillingDashboard } from "./billing-dashboard"
import { BillingTrigger } from "./billing-trigger"
import { ServiceCatalog } from "./service-catalog"
import { useAuthErrorHandler, isAuthError } from "@/lib/auth-error-handler"

interface Invoice {
  id: string
  patient_id: string
  invoice_number: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  due_date: string
  created_at: string
  updated_at: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
}

interface Payment {
  id: string
  invoice_id: string
  patient_id: string
  amount: number
  payment_method: "cash" | "card" | "bank_transfer" | "insurance"
  payment_date: string
  reference_number?: string
  notes?: string
  created_at: string
  invoice?: {
    invoice_number: string
  }
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
}

interface BillingManagementProps {
  userRole: UserRole
  userId?: string
  onStatsUpdate?: () => void
}

export function BillingManagement({ userRole, userId, onStatsUpdate }: BillingManagementProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [showServiceCatalog, setShowServiceCatalog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const { handleAuthError } = useAuthErrorHandler()

  // Access control based on HMS Access Control Matrix
  const canAccessBilling = () => {
    // Billing/Invoices: SuperAdmin (Full), Accountant (Full CRUD), Patient (View self only)
    return ["superadmin", "accountant", "patient"].includes(userRole)
  }

  const canCreateInvoices = () => {
    // Billing/Invoices: SuperAdmin (Full), Accountant (Full CRUD)
    return ["superadmin", "accountant"].includes(userRole)
  }

  const canManagePayments = () => {
    // Payments: SuperAdmin (Full), Accountant (Full record/manage)
    return ["superadmin", "accountant"].includes(userRole)
  }

  useEffect(() => {
    if (canAccessBilling()) {
      loadInvoices()
      loadPayments()
    } else {
      setInvoices([])
      setPayments([])
      setError("You don't have permission to access billing information. " +
        (userRole === "receptionist" ? "Use the Appointments section for scheduling." :
         userRole === "doctor" ? "Use the Clinical section for patient care." :
         userRole === "nurse" ? "Use the Vitals section for nursing notes." :
         userRole === "lab_tech" ? "Use the Lab Results section for test management." :
         userRole === "pharmacist" ? "Use the Prescriptions section for medication management." :
         "Contact your administrator for access."))
    }
  }, [userId])

  useEffect(() => {
    filterInvoices()
    filterPayments()
  }, [invoices, payments, searchTerm, statusFilter])

  const loadInvoices = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Check if invoices table exists by trying to query it
      const { data: testData, error: testError } = await supabase
        .from("invoices")
        .select("id")
        .limit(1)

      if (testError) {
        // Table doesn't exist or other error - set empty array and continue
        console.log("Invoices table not available:", testError.message)
        setInvoices([])
        setError("Billing system is not yet configured. The invoices and payments tables need to be created in the database.")
        return
      }

      let query = supabase
        .from("invoices")
        .select(`
          *,
          patient:patients(first_name, last_name, mrn)
        `)

      // Filter by user role based on HMS Access Control Matrix
      if (userRole === "patient" && userId) {
        // Patients: View self billing only
        query = query.eq("patient_id", userId)
      }
      // Superadmin and accountant see all invoices (no additional filtering)

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error

      setInvoices(data || [])
    } catch (error) {
      console.error("Error loading invoices:", error)
      
      // Handle authentication errors
      if (isAuthError(error)) {
        handleAuthError(error)
        return
      }
      
      setError("Billing system is not yet configured. The invoices and payments tables need to be created in the database.")
      setInvoices([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadPayments = async () => {
    const supabase = createClient()

    try {
      let query = supabase
        .from("payments")
        .select(`
          *,
          invoice:invoices(invoice_number),
          patient:patients(first_name, last_name, mrn)
        `)

      // Filter by user role based on HMS Access Control Matrix
      if (userRole === "patient" && userId) {
        // Patients: View self payments only
        query = query.eq("patient_id", userId)
      }
      // Superadmin and accountant see all payments (no additional filtering)

      const { data, error } = await query.order("payment_date", { ascending: false })

      if (error) throw error

      setPayments(data || [])
    } catch (error) {
      console.error("Error loading payments:", error)
      
      // Handle authentication errors
      if (isAuthError(error)) {
        handleAuthError(error)
        return
      }
      
      setError("Billing system is not yet configured. The invoices and payments tables need to be created in the database.")
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }

  const filterPayments = () => {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.invoice?.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPayments(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-yellow-100 text-yellow-800",
    }
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
  }

  const getPaymentMethodBadge = (method: string) => {
    const methodColors = {
      cash: "bg-green-100 text-green-800",
      card: "bg-blue-100 text-blue-800",
      bank_transfer: "bg-purple-100 text-purple-800",
      insurance: "bg-orange-100 text-orange-800",
    }
    return methodColors[method as keyof typeof methodColors] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  if (!canAccessBilling()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>Manage invoices, payments, and financial records</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access billing information. 
              {userRole === "receptionist" && " Use the Appointments section for scheduling."}
              {userRole === "doctor" && " Use the Clinical section for patient care."}
              {userRole === "nurse" && " Use the Vitals section for nursing notes."}
              {userRole === "lab_tech" && " Use the Lab Results section for test management."}
              {userRole === "pharmacist" && " Use the Prescriptions section for medication management."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>Manage invoices, payments, and financial records</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Billing Management</h3>
          <p className="text-sm text-gray-600">
            {userRole === "patient" ? "View your billing information and payment history" : 
             "Manage invoices, payments, and financial records"}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateInvoices() && (
            <Button onClick={() => setShowInvoiceForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
          {canManagePayments() && (
            <Button variant="outline" onClick={() => setShowPaymentForm(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          {canCreateInvoices() && (
            <Button variant="outline" onClick={() => setShowServiceCatalog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Service Catalog
            </Button>
          )}
        </div>
      </div>

      {/* Billing Dashboard - Only show for staff with billing access */}
      {!userRole.includes("patient") && (
        <BillingDashboard userRole={userRole} userId={userId} />
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search invoices and payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            {userRole === "patient" ? "Your billing invoices" : "All system invoices"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {invoice.patient ? (
                          <div>
                            <div className="font-medium">
                              {invoice.patient.first_name} {invoice.patient.last_name}
                            </div>
                            <div className="text-sm text-gray-500">MRN: {invoice.patient.mrn}</div>
                          </div>
                        ) : (
                          "Unknown Patient"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setShowInvoiceDetails(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments
          </CardTitle>
          <CardDescription>
            {userRole === "patient" ? "Your payment history" : "All system payments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.reference_number || "N/A"}
                      </TableCell>
                      <TableCell>{payment.invoice?.invoice_number || "N/A"}</TableCell>
                      <TableCell>
                        {payment.patient ? (
                          <div>
                            <div className="font-medium">
                              {payment.patient.first_name} {payment.patient.last_name}
                            </div>
                            <div className="text-sm text-gray-500">MRN: {payment.patient.mrn}</div>
                          </div>
                        ) : (
                          "Unknown Patient"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodBadge(payment.payment_method)}>
                          {payment.payment_method.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setShowPaymentDetails(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Invoice Form */}
      <InvoiceForm
        isOpen={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        onSuccess={() => {
          loadInvoices()
          setSuccess("Invoice created successfully!")
          setTimeout(() => setSuccess(null), 3000)
        }}
        userRole={userRole}
        userId={userId}
      />

      {/* Payment Form */}
      <PaymentForm
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSuccess={() => {
          loadInvoices()
          loadPayments()
          setSuccess("Payment recorded successfully!")
          setTimeout(() => setSuccess(null), 3000)
        }}
        userRole={userRole}
        userId={userId}
      />

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Invoice #{selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p className="text-sm">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusBadge(selectedInvoice.status)}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedInvoice.patient && (
                <div>
                  <Label className="text-sm font-medium">Patient</Label>
                  <p className="text-sm">
                    {selectedInvoice.patient.first_name} {selectedInvoice.patient.last_name} 
                    (MRN: {selectedInvoice.patient.mrn})
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Payment Reference: {selectedPayment?.reference_number || "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <Badge className={getPaymentMethodBadge(selectedPayment.payment_method)}>
                    {selectedPayment.payment_method.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Date</Label>
                  <p className="text-sm">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reference Number</Label>
                  <p className="text-sm">{selectedPayment.reference_number || "N/A"}</p>
                </div>
              </div>
              {selectedPayment.invoice && (
                <div>
                  <Label className="text-sm font-medium">Invoice</Label>
                  <p className="text-sm">#{selectedPayment.invoice.invoice_number}</p>
                </div>
              )}
              {selectedPayment.patient && (
                <div>
                  <Label className="text-sm font-medium">Patient</Label>
                  <p className="text-sm">
                    {selectedPayment.patient.first_name} {selectedPayment.patient.last_name} 
                    (MRN: {selectedPayment.patient.mrn})
                  </p>
                </div>
              )}
              {selectedPayment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Service Catalog Dialog */}
      <Dialog open={showServiceCatalog} onOpenChange={setShowServiceCatalog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Catalog</DialogTitle>
            <DialogDescription>
              Manage service pricing and catalog
            </DialogDescription>
          </DialogHeader>
          <ServiceCatalog userRole={userRole} userId={userId} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
