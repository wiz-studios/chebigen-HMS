"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, DollarSign, FileText, Stethoscope } from "lucide-react"

interface BillingTriggerProps {
  appointmentId?: string
  encounterId?: string
  labResultId?: string
  patientId: string
  userRole: string
  userId: string
  onInvoiceCreated?: () => void
}

export function BillingTrigger({ 
  appointmentId, 
  encounterId, 
  labResultId, 
  patientId, 
  userRole, 
  userId, 
  onInvoiceCreated 
}: BillingTriggerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canCreateInvoice = () => {
    return ["superadmin", "accountant", "receptionist", "doctor"].includes(userRole)
  }

  const generateInvoiceFromAppointment = async () => {
    if (!canCreateInvoice()) {
      setError("You don't have permission to create invoices.")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get appointment details
      const { data: appointment } = await supabase
        .from("appointments")
        .select("*, patient:patients(*), provider:users(*)")
        .eq("id", appointmentId)
        .single()

      if (!appointment) {
        throw new Error("Appointment not found")
      }

      // Calculate charges based on appointment type
      const consultationFee = 1500 // Base consultation fee
      const totalAmount = consultationFee

      // Create invoice
      const invoiceNumber = `INV-${Date.now()}`
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          created_by: userId,
          encounter_id: encounterId,
          invoice_number: invoiceNumber,
          amount: totalAmount,
          status: "sent",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Add invoice items
      await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        description: `Consultation - ${appointment.appointment_type}`,
        quantity: 1,
        unit_price: consultationFee,
        amount: consultationFee
      })

      setSuccess("Invoice created successfully!")
      onInvoiceCreated?.()

    } catch (error) {
      console.error("Error creating invoice:", error)
      setError("Failed to create invoice. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const generateInvoiceFromLabResult = async () => {
    if (!canCreateInvoice()) {
      setError("You don't have permission to create invoices.")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get lab result details
      const { data: labResult } = await supabase
        .from("lab_results")
        .select("*, order:orders(*, patient:patients(*))")
        .eq("id", labResultId)
        .single()

      if (!labResult) {
        throw new Error("Lab result not found")
      }

      // Calculate lab test charges
      const labTestFee = 800 // Base lab test fee
      const totalAmount = labTestFee

      // Create invoice
      const invoiceNumber = `INV-${Date.now()}`
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          created_by: userId,
          invoice_number: invoiceNumber,
          amount: totalAmount,
          status: "sent",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Add invoice items
      await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        description: `Lab Test - ${labResult.order?.details?.test_name || 'Laboratory Test'}`,
        quantity: 1,
        unit_price: labTestFee,
        amount: labTestFee
      })

      setSuccess("Lab test invoice created successfully!")
      onInvoiceCreated?.()

    } catch (error) {
      console.error("Error creating lab invoice:", error)
      setError("Failed to create lab test invoice. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  if (!canCreateInvoice()) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Generate Bill
        </CardTitle>
        <CardDescription>
          Create an invoice for services provided
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointmentId && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Appointment Consultation</p>
                <p className="text-sm text-gray-500">Base consultation fee: KES 1,500</p>
              </div>
            </div>
            <Button 
              onClick={generateInvoiceFromAppointment}
              disabled={isCreating}
              size="sm"
            >
              {isCreating ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        )}

        {labResultId && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Lab Test</p>
                <p className="text-sm text-gray-500">Laboratory test fee: KES 800</p>
              </div>
            </div>
            <Button 
              onClick={generateInvoiceFromLabResult}
              disabled={isCreating}
              size="sm"
              variant="outline"
            >
              {isCreating ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        )}

        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
