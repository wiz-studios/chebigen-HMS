"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

interface Invoice {
  id: string
  patient_id: string
  invoice_number: string
  amount: number
  status: string
  patient: {
    first_name: string
    last_name: string
    mrn: string
  }
}

interface PaymentFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userRole: string
  userId?: string
}

export function PaymentForm({ isOpen, onClose, onSuccess, userRole, userId }: PaymentFormProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load invoices when form opens
  useEffect(() => {
    if (isOpen) {
      loadInvoices()
    }
  }, [isOpen])

  const loadInvoices = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          patient_id,
          invoice_number,
          amount,
          status,
          patient:patients!inner(first_name, last_name, mrn)
        `)
        .in("status", ["sent", "overdue"])
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Transform data to match interface
      const transformedData = (data || []).map(invoice => ({
        ...invoice,
        patient: Array.isArray(invoice.patient) ? invoice.patient[0] : invoice.patient
      }))
      
      setInvoices(transformedData)
    } catch (error) {
      console.error("Error loading invoices:", error)
      setError("Failed to load invoices. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Get selected invoice details
      const selectedInvoiceData = invoices.find(inv => inv.id === selectedInvoice)
      if (!selectedInvoiceData) {
        throw new Error("Selected invoice not found")
      }

      if (!selectedInvoiceData.patient_id) {
        throw new Error("Patient information not found for this invoice")
      }

      // Create payment
      const { data, error } = await supabase
        .from("payments")
        .insert({
          invoice_id: selectedInvoice,
          patient_id: selectedInvoiceData.patient_id,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference_number: referenceNumber || null,
          notes: notes || null
        })
        .select()
        .single()

      if (error) throw error

      setSuccess("Payment recorded successfully!")
      onSuccess()
      
      // Reset form
      setSelectedInvoice("")
      setAmount("")
      setPaymentMethod("")
      setPaymentDate(new Date().toISOString().split('T')[0])
      setReferenceNumber("")
      setNotes("")
      
      // Close form after a short delay
      setTimeout(() => {
        onClose()
        setSuccess(null)
      }, 1500)

    } catch (error) {
      console.error("Error recording payment:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to record payment. Please try again."
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setSuccess(null)
    setSelectedInvoice("")
    setAmount("")
    setPaymentMethod("")
    setPaymentDate(new Date().toISOString().split('T')[0])
    setReferenceNumber("")
    setNotes("")
    onClose()
  }

  const selectedInvoiceData = invoices.find(inv => inv.id === selectedInvoice)
  const maxAmount = selectedInvoiceData ? selectedInvoiceData.amount : 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for an invoice
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Invoice *</Label>
            <Select value={selectedInvoice} onValueChange={setSelectedInvoice} required>
              <SelectTrigger>
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading invoices...
                    </div>
                  </SelectItem>
                ) : invoices.length === 0 ? (
                  <SelectItem value="no-invoices" disabled>
                    No unpaid invoices found
                  </SelectItem>
                ) : (
                  invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.patient?.first_name || 'Unknown'} {invoice.patient?.last_name || 'Patient'} 
                      (KES {invoice.amount.toLocaleString()})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount (KES) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {selectedInvoiceData && (
              <p className="text-sm text-gray-500">
                Invoice total: KES {selectedInvoiceData.amount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Transaction ID, check number, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedInvoice || !amount || !paymentMethod}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
