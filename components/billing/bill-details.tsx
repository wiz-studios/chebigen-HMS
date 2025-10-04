"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, DollarSign, Receipt, Calendar, User } from "lucide-react"
import { PaymentForm } from "./payment-form"

interface BillItem {
  item_id: string
  item_type: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Payment {
  payment_id: string
  amount: number
  payment_method: string
  paid_at: string
  notes?: string
  paid_by_user?: {
    full_name: string
  }
}

interface Bill {
  bill_id: string
  patient_id: string
  created_by: string
  created_at: string
  status: "pending" | "paid" | "partial" | "cancelled"
  total_amount: number
  paid_amount: number
  payment_method?: string
  notes?: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
  created_by_user?: {
    full_name: string
  }
}

interface BillDetailsProps {
  bill: Bill | null
  isOpen: boolean
  onClose: () => void
  userRole: string
  userId?: string
  onPaymentRecorded: () => void
}

export function BillDetails({ bill, isOpen, onClose, userRole, userId, onPaymentRecorded }: BillDetailsProps) {
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRecordPayments = () => {
    return ["superadmin", "receptionist"].includes(userRole)
  }

  useEffect(() => {
    if (isOpen && bill) {
      loadBillDetails()
    }
  }, [isOpen, bill])

  const loadBillDetails = async () => {
    if (!bill) return

    const supabase = createClient()
    setIsLoading(true)

    try {
      // Load bill items
      const { data: itemsData, error: itemsError } = await supabase
        .from("bill_items")
        .select("*")
        .eq("bill_id", bill.bill_id)
        .order("created_at")

      if (itemsError) throw itemsError

      // Load payment history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_history")
        .select(`
          *,
          paid_by_user:users!payment_history_paid_by_fkey(full_name)
        `)
        .eq("bill_id", bill.bill_id)
        .order("paid_at", { ascending: false })

      if (paymentsError) throw paymentsError

      setBillItems(itemsData || [])
      setPayments(paymentsData || [])
    } catch (error) {
      console.error("Error loading bill details:", error)
      setError("Failed to load bill details.")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      partial: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const getItemTypeLabel = (type: string) => {
    const typeLabels = {
      appointment: "Appointment",
      lab_test: "Lab Test",
      procedure: "Procedure",
      medication: "Medication"
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels = {
      cash: "Cash",
      card: "Card",
      insurance: "Insurance"
    }
    return methodLabels[method as keyof typeof methodLabels] || method
  }

  if (!bill) return null

  const remainingBalance = bill.total_amount - bill.paid_amount

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Bill Details
            </DialogTitle>
            <DialogDescription>
              Bill ID: {bill.bill_id}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Bill Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      Patient
                    </div>
                    <p className="font-medium">
                      {bill.patient?.first_name} {bill.patient?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">MRN: {bill.patient?.mrn}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Created
                    </div>
                    <p className="font-medium">{new Date(bill.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">
                      by {bill.created_by_user?.full_name || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <Badge className={getStatusBadge(bill.status)}>
                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Payment Method</div>
                    <p className="font-medium">
                      {bill.payment_method ? getPaymentMethodLabel(bill.payment_method) : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-600">Total Amount</div>
                    <p className="text-lg font-bold">{formatCurrency(bill.total_amount)}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Paid Amount</div>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(bill.paid_amount)}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Remaining Balance</div>
                    <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(remainingBalance)}
                    </p>
                  </div>
                </div>

                {bill.notes && (
                  <div>
                    <div className="text-sm text-gray-600">Notes</div>
                    <p className="text-sm">{bill.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bill Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill Items</CardTitle>
                <CardDescription>Items included in this bill</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Loading items...</div>
                ) : billItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No items found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billItems.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell>
                            <Badge variant="outline">
                              {getItemTypeLabel(item.item_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.total_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Payment History</CardTitle>
                    <CardDescription>All payments made for this bill</CardDescription>
                  </div>
                  {canRecordPayments() && bill.status !== "paid" && (
                    <Button onClick={() => setShowPaymentForm(true)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No payments recorded</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.payment_id}>
                          <TableCell>{new Date(payment.paid_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPaymentMethodLabel(payment.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.paid_by_user?.full_name || "Unknown"}</TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Form */}
      <PaymentForm
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSuccess={() => {
          onPaymentRecorded()
          setShowPaymentForm(false)
        }}
        userRole={userRole}
        userId={userId}
      />
    </>
  )
}
