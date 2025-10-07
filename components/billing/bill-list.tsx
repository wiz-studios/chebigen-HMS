"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Eye, 
  CreditCard, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  User,
  DollarSign,
  Download
} from "lucide-react"
import { Bill, BillingPermissions } from "@/lib/types/billing"
import { format } from "date-fns"
import { InvoiceDownload } from "./invoice-download"

interface BillListProps {
  bills: Bill[]
  permissions: BillingPermissions
  onRecordPayment: (bill: Bill) => void
  onRefresh: () => void
}

export function BillList({ bills, permissions, onRecordPayment, onRefresh }: BillListProps) {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showInvoiceDownload, setShowInvoiceDownload] = useState(false)

  // Debug: Log patient data with timestamp to track re-renders
  console.log("=== BILL LIST: Debugging bill data ===", new Date().toISOString())
  console.log("BillList: Received", bills.length, "bills")
  bills.forEach((bill, index) => {
    console.log(`Bill ${index + 1}:`, {
      id: bill.id,
      total_amount: bill.total_amount,
      paid_amount: bill.paid_amount,
      status: bill.status,
      patient: bill.patient,
      patient_id: bill.patient_id,
      items: bill.items,
      items_count: bill.items?.length || 0
    })
  })


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      paid: "bg-green-50 text-green-700 border-green-200",
      partial: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-red-50 text-red-700 border-red-200"
    }
    
    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return null
    
    const variants = {
      cash: "bg-gray-50 text-gray-700 border-gray-200",
      card: "bg-blue-50 text-blue-700 border-blue-200",
      insurance: "bg-purple-50 text-purple-700 border-purple-200"
    }
    
    return (
      <Badge variant="outline" className={variants[method as keyof typeof variants]}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Badge>
    )
  }

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill)
    setShowDetails(true)
  }

  const handleRecordPayment = (bill: Bill) => {
    onRecordPayment(bill)
  }

  const handleDownloadInvoice = (bill: Bill) => {
    setSelectedBill(bill)
    setShowInvoiceDownload(true)
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">No bills found</h3>
              <p className="text-gray-500">Create your first bill to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
          <CardDescription>
            Manage patient bills and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-sm">
                    {bill.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {bill.patient?.first_name} {bill.patient?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          MRN: {bill.patient?.mrn || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(bill.total_amount)}
                      </div>
                      {bill.paid_amount > 0 && (
                        <div className="text-sm text-gray-500">
                          Paid: {formatCurrency(bill.paid_amount)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(bill.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {format(new Date(bill.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(bill)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {permissions.canRecordPayment && bill.status !== 'paid' && bill.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecordPayment(bill)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Download Invoice/Receipt - Available to everyone */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(bill)}
                        title="Download Invoice/Receipt"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {permissions.canEditBill && bill.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {permissions.canDeleteBill && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>Bill Details</DialogTitle>
                <DialogDescription>
                  Complete information for bill {selectedBill?.id.slice(0, 8)}...
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDetails(false)
                  setShowInvoiceDownload(true)
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogHeader>
          
          {selectedBill && (
            <div className="space-y-6">
              {/* Bill Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Patient Information</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {selectedBill.patient?.first_name} {selectedBill.patient?.last_name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">MRN:</span> {selectedBill.patient?.mrn}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Contact:</span> {selectedBill.patient?.contact}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Bill Information</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedBill.status)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Created:</span> {format(new Date(selectedBill.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Created by:</span> {selectedBill.created_by_user?.full_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              {selectedBill.items && selectedBill.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Bill Items</h4>
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
                      {selectedBill.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {item.item_type.replace('_', ' ')}
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
                </div>
              )}

              {/* Payment History */}
              {selectedBill.payments && selectedBill.payments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment History</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Recorded by</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.paid_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodBadge(payment.payment_method)}
                          </TableCell>
                          <TableCell>
                            {payment.paid_by_user?.full_name}
                          </TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Bill Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-medium">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedBill.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(selectedBill.paid_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Remaining Balance:</span>
                  <span className={selectedBill.total_amount - selectedBill.paid_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(selectedBill.total_amount - selectedBill.paid_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Download Dialog */}
      <Dialog open={showInvoiceDownload} onOpenChange={setShowInvoiceDownload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download Invoice/Receipt</DialogTitle>
            <DialogDescription>
              Generate and download invoice or receipt for this bill
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <InvoiceDownload 
              bill={selectedBill} 
              userRole="any" // Anyone can download invoices/receipts
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
