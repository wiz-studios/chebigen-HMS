"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CreditCard, AlertTriangle } from "lucide-react"
import { Bill, PaymentMethod, RecordPaymentRequest } from "@/lib/types/billing"
import { format } from "date-fns"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: Bill | null
  onSubmit: (data: RecordPaymentRequest) => void
}

export function PaymentDialog({ open, onOpenChange, bill, onSubmit }: PaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (bill && open) {
      const remainingAmount = bill.total_amount - bill.paid_amount
      setAmount(remainingAmount.toString())
    }
  }, [bill, open])

  const handleSubmit = async () => {
    if (!bill || !amount || parseFloat(amount) <= 0) {
      return
    }

    const paymentAmount = parseFloat(amount)
    const remainingAmount = bill.total_amount - bill.paid_amount

    if (paymentAmount > remainingAmount) {
      alert(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`)
      return
    }

    setIsLoading(true)
    try {
      const paymentData: RecordPaymentRequest = {
        bill_id: bill.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        notes: notes || undefined
      }

      console.log("PaymentDialog: Submitting payment:", paymentData)
      await onSubmit(paymentData)
      
      // Show success message
      const newRemainingAmount = remainingAmount - paymentAmount
      const isFullyPaid = newRemainingAmount <= 0
      
      if (isFullyPaid) {
        alert(`✅ Payment recorded successfully! Bill is now fully paid.`)
      } else {
        alert(`✅ Payment of ${formatCurrency(paymentAmount)} recorded successfully! Remaining balance: ${formatCurrency(newRemainingAmount)}`)
      }
      
      // Reset form
      setAmount("")
      setPaymentMethod("cash")
      setNotes("")
      
      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert(`❌ Error recording payment: ${error.message}`)
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

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'card':
        return <CreditCard className="h-4 w-4" />
      case 'insurance':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const variants = {
      cash: "bg-gray-50 text-gray-700 border-gray-200",
      card: "bg-blue-50 text-blue-700 border-blue-200",
      insurance: "bg-purple-50 text-purple-700 border-purple-200"
    }
    
    return (
      <Badge variant="outline" className={variants[method]}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Badge>
    )
  }

  if (!bill) return null

  const remainingAmount = bill.total_amount - bill.paid_amount
  const isFullPayment = parseFloat(amount) >= remainingAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for bill {bill.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pb-4">
          {/* Bill Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-medium">
                    {bill.patient?.first_name} {bill.patient?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill Status</p>
                  <Badge variant="outline" className={
                    bill.status === 'paid' ? 'bg-green-50 text-green-700' :
                    bill.status === 'partial' ? 'bg-blue-50 text-blue-700' :
                    bill.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium">{formatCurrency(bill.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="font-medium text-green-600">{formatCurrency(bill.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="font-medium text-red-600">{formatCurrency(remainingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  max={remainingAmount}
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Maximum: {formatCurrency(remainingAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Cash</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Card</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="insurance">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Insurance</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Amount:</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Method:</span>
                <div className="flex items-center space-x-2">
                  {getPaymentMethodIcon(paymentMethod)}
                  {getPaymentMethodBadge(paymentMethod)}
                </div>
              </div>

              {isFullPayment && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      This payment will fully settle the bill
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>New Balance:</span>
                  <span className={remainingAmount - (parseFloat(amount) || 0) <= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(remainingAmount - (parseFloat(amount) || 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t bg-white sticky bottom-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > remainingAmount || isLoading}
            >
              {isLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
