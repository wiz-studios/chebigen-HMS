"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Download, 
  Search, 
  User, 
  FileText, 
  Receipt, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { billingService } from "@/lib/supabase/billing"
import { Bill } from "@/lib/types/billing"
import { format } from "date-fns"

interface BulkInvoiceDownloadProps {
  userRole: string
  userId: string
}

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
  contact: string
}

export function BulkInvoiceDownload({ userRole, userId }: BulkInvoiceDownloadProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientBills, setPatientBills] = useState<Bill[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingBills, setIsLoadingBills] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const searchPatients = async () => {
    if (!searchTerm.trim()) return
    
    setIsSearching(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, mrn, first_name, last_name, contact')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,mrn.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error("Error searching patients:", error)
      alert("Error searching patients. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const loadPatientBills = async (patient: Patient) => {
    setIsLoadingBills(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get bills for this patient
      const { data: billsData, error } = await supabase
        .from('bills')
        .select(`
          *,
          patient:patients!bills_patient_id_fkey(id, mrn, first_name, last_name, contact),
          items:bill_items(*),
          payments:payment_history(*, paid_by_user:users!payment_history_paid_by_fkey(id, full_name, role))
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      
      setPatientBills(billsData || [])
      setSelectedPatient(patient)
      setShowDialog(true)
    } catch (error) {
      console.error("Error loading patient bills:", error)
      alert("Error loading patient bills. Please try again.")
    } finally {
      setIsLoadingBills(false)
    }
  }

  const toggleBillSelection = (billId: string) => {
    const newSelection = new Set(selectedBills)
    if (newSelection.has(billId)) {
      newSelection.delete(billId)
    } else {
      newSelection.add(billId)
    }
    setSelectedBills(newSelection)
  }

  const selectAllBills = () => {
    setSelectedBills(new Set(patientBills.map(bill => bill.id)))
  }

  const clearSelection = () => {
    setSelectedBills(new Set())
  }

  const generateBulkDocuments = async (type: 'invoice' | 'receipt', format: 'html' | 'pdf') => {
    if (selectedBills.size === 0) {
      alert("Please select at least one bill to download.")
      return
    }

    setIsGenerating(true)
    try {
      const selectedBillsData = patientBills.filter(bill => selectedBills.has(bill.id))
      
      // Generate PDF using jsPDF
      await generateBulkPDF(selectedBillsData, type)
      
      alert(`Successfully generated ${selectedBills.size} ${type}s!`)
    } catch (error) {
      console.error("Error generating bulk documents:", error)
      alert("Error generating documents. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const generateBulkPDF = async (bills: Bill[], type: 'invoice' | 'receipt') => {
    try {
      // Dynamic import of jsPDF
      const { jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      let yPosition = 20
      
      bills.forEach((bill, index) => {
        if (index > 0) {
          doc.addPage()
          yPosition = 20
        }
        
        // Professional Header with Brand Identity
        doc.setFillColor(13, 148, 136) // Teal primary accent
        doc.rect(15, 15, 180, 30, 'F')
        
        // Hospital name in white with professional typography
        doc.setTextColor(255, 255, 255) // White text
        doc.setFontSize(22)
        doc.setFont('helvetica', 'bold')
        doc.text('Chebigen Referral Hospital', 20, yPosition)
        yPosition += 8
        
        // Tagline in italic
        doc.setFontSize(11)
        doc.setFont('helvetica', 'italic')
        doc.text('Caring for You Always', 20, yPosition)
        yPosition += 15
        
        // Accent bar under header
        doc.setFillColor(13, 148, 136) // Teal accent bar
        doc.rect(15, yPosition - 2, 180, 2, 'F')
        yPosition += 5
        
        // Document type with navy blue
        doc.setTextColor(30, 58, 138) // Navy blue
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(type === 'invoice' ? 'INVOICE' : 'PAYMENT RECEIPT', 20, yPosition)
        
        // Reset text color for document
        doc.setTextColor(51, 65, 85) // Dark slate text
        yPosition += 15
        
        // Hospital details (right side)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('Chebigen Referral Hospital', 120, yPosition)
        doc.text('P.O. Box 123, Nairobi', 120, yPosition + 5)
        doc.text('Phone: +254 700 000 000', 120, yPosition + 10)
        doc.text('Email: info@chebigenhospital.co.ke', 120, yPosition + 15)
        doc.text('Website: www.chebigenhospital.co.ke', 120, yPosition + 20)
        
        // Bill info (left side)
        doc.text(`Bill ID: ${bill.id.slice(0, 8)}`, 20, yPosition)
        doc.text(`Date: ${format(new Date(bill.created_at), 'MMM dd, yyyy')}`, 20, yPosition + 5)
        doc.text(`Due Date: ${format(new Date(bill.created_at), 'MMM dd, yyyy')}`, 20, yPosition + 10)
        yPosition += 25
        
        // Patient info
        doc.setFont('helvetica', 'bold')
        doc.text('Patient Information:', 20, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`Name: ${bill.patient?.first_name || 'Unknown'} ${bill.patient?.last_name || 'Patient'}`, 20, yPosition)
        doc.text(`MRN: ${bill.patient?.mrn || 'N/A'}`, 20, yPosition + 5)
        doc.text(`Contact: ${bill.patient?.contact || 'N/A'}`, 20, yPosition + 10)
        yPosition += 20
        
        // Services rendered table
        if (bill.items && bill.items.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(12)
          doc.text('Services Rendered:', 20, yPosition)
          yPosition += 10
          
          // Table headers with better spacing
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Service/Item', 20, yPosition)
          doc.text('Qty', 100, yPosition)
          doc.text('Unit Price', 120, yPosition)
          doc.text('Amount', 160, yPosition)
          yPosition += 5
          
          // Table line
          doc.line(20, yPosition, 190, yPosition)
          yPosition += 5
          
          // Table rows
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          bill.items.forEach(item => {
            doc.text(item.description.substring(0, 25), 20, yPosition)
            doc.text(item.quantity.toString(), 100, yPosition)
            doc.text(formatCurrency(item.unit_price), 120, yPosition)
            doc.text(formatCurrency(item.total_price), 160, yPosition)
            yPosition += 5
          })
          yPosition += 5
        }
        
        // Payment Summary
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Payment Summary:', 20, yPosition)
        yPosition += 10
        
        // Summary box
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Subtotal: ${formatCurrency(bill.total_amount)}`, 20, yPosition)
        doc.text(`Amount Paid: ${formatCurrency(bill.paid_amount)}`, 20, yPosition + 8)
        if (bill.paid_amount < bill.total_amount) {
          doc.text(`Outstanding Balance: ${formatCurrency(bill.total_amount - bill.paid_amount)}`, 20, yPosition + 16)
        }
        doc.text(`Payment Status: ${bill.status.toUpperCase()}`, 20, yPosition + 24)
        yPosition += 35
        
        // Official confirmation section
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Official Confirmation:', 20, yPosition)
        yPosition += 15
        
        // Signature areas
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Authorized Signature:', 20, yPosition)
        doc.text('Date:', 120, yPosition)
        doc.line(20, yPosition + 15, 100, yPosition + 15) // Signature line
        doc.line(120, yPosition + 5, 180, yPosition + 5) // Date line
        yPosition += 20
        
        doc.text('Hospital Stamp:', 20, yPosition)
        doc.text(`Receipt No: ${bill.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`, 120, yPosition)
        doc.line(20, yPosition + 15, 100, yPosition + 15) // Stamp area
        yPosition += 25
        
        // Footer
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Generated on: ' + format(new Date(), 'MMM dd, yyyy HH:mm'), 20, yPosition)
        doc.text('Thank you for choosing Chebigen Referral Hospital', 20, yPosition + 8)
      })
      
      // Download the PDF
      const filename = `${type}s_${selectedPatient?.first_name || 'Unknown'}_${selectedPatient?.last_name || 'Patient'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    }
  }

  const generateHTMLInvoice = (bill: Bill) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - ${bill.id.slice(0, 8)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .hospital-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .invoice-title { font-size: 20px; margin-top: 10px; }
        .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .items-table th { background: #f3f4f6; font-weight: bold; }
        .total-section { margin-top: 20px; text-align: right; }
        .total-row { font-size: 18px; font-weight: bold; padding: 10px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="hospital-name">Hospital Management System</div>
        <div class="invoice-title">INVOICE</div>
        <div>Invoice #: ${bill.id.slice(0, 8).toUpperCase()}</div>
        <div>Date: ${format(new Date(bill.created_at), 'MMM dd, yyyy')}</div>
    </div>

    <div class="patient-info">
        <h3>Patient Information</h3>
        <p><strong>Name:</strong> ${bill.patient?.first_name || 'Unknown'} ${bill.patient?.last_name || 'Patient'}</p>
        <p><strong>MRN:</strong> ${bill.patient?.mrn || 'N/A'}</p>
        <p><strong>Contact:</strong> ${bill.patient?.contact || 'N/A'}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${bill.items?.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No items</td></tr>'}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">Total Amount: ${formatCurrency(bill.total_amount)}</div>
        <div>Status: <strong>${bill.status.toUpperCase()}</strong></div>
        ${bill.paid_amount > 0 ? `<div>Paid Amount: ${formatCurrency(bill.paid_amount)}</div>` : ''}
        ${bill.paid_amount < bill.total_amount ? `<div>Outstanding: ${formatCurrency(bill.total_amount - bill.paid_amount)}</div>` : ''}
    </div>

    <div class="footer">
        <p>Thank you for choosing our hospital services.</p>
        <p>For inquiries, please contact our billing department.</p>
        <p>Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
    </div>
</body>
</html>
    `
  }

  const generateHTMLReceipt = (bill: Bill) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${bill.id.slice(0, 8)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
        .hospital-name { font-size: 24px; font-weight: bold; color: #059669; }
        .receipt-title { font-size: 20px; margin-top: 10px; color: #059669; }
        .receipt-info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .items-table th { background: #f0fdf4; font-weight: bold; }
        .total-section { margin-top: 20px; text-align: right; }
        .total-row { font-size: 18px; font-weight: bold; padding: 10px 0; }
        .payment-info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="hospital-name">Hospital Management System</div>
        <div class="receipt-title">PAYMENT RECEIPT</div>
        <div>Receipt #: ${bill.id.slice(0, 8).toUpperCase()}</div>
        <div>Date: ${format(new Date(bill.created_at), 'MMM dd, yyyy')}</div>
    </div>

    <div class="receipt-info">
        <h3>Patient Information</h3>
        <p><strong>Name:</strong> ${bill.patient?.first_name || 'Unknown'} ${bill.patient?.last_name || 'Patient'}</p>
        <p><strong>MRN:</strong> ${bill.patient?.mrn || 'N/A'}</p>
        <p><strong>Contact:</strong> ${bill.patient?.contact || 'N/A'}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Service/Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${bill.items?.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No items</td></tr>'}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">Total Amount: ${formatCurrency(bill.total_amount)}</div>
        <div>Paid Amount: ${formatCurrency(bill.paid_amount)}</div>
        ${bill.paid_amount < bill.total_amount ? `<div style="color: #dc2626;">Outstanding: ${formatCurrency(bill.total_amount - bill.paid_amount)}</div>` : ''}
    </div>

    ${bill.paid_amount > 0 ? `
    <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Status:</strong> ${bill.status.toUpperCase()}</p>
        <p><strong>Amount Paid:</strong> ${formatCurrency(bill.paid_amount)}</p>
        <p><strong>Payment Date:</strong> ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p><strong>Thank you for your payment!</strong></p>
        <p>This receipt serves as proof of payment for the services rendered.</p>
        <p>For inquiries, please contact our billing department.</p>
        <p>Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
    </div>
</body>
</html>
    `
  }

  const downloadHTML = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Bulk Download Invoices/Receipts
        </CardTitle>
        <CardDescription>
          Search for a patient and download all their bills at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by patient name, MRN, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
          />
          <Button onClick={searchPatients} disabled={isSearching || !searchTerm.trim()}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {patients.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Search Results:</h3>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => loadPatientBills(patient)}
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                    <div className="text-sm text-gray-600">
                      MRN: {patient.mrn} • Contact: {patient.contact}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    loadPatientBills(patient)
                  }}
                  disabled={isLoadingBills}
                >
                  {isLoadingBills ? 'Loading...' : 'View Bills'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Patient Bills Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Bills - {selectedPatient?.first_name} {selectedPatient?.last_name}</DialogTitle>
              <DialogDescription>
                Select bills to download as invoices or receipts
              </DialogDescription>
            </DialogHeader>

            {patientBills.length > 0 ? (
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllBills}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedBills.size} of {patientBills.length} bills selected
                  </div>
                </div>

                {/* Bills Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patientBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedBills.has(bill.id)}
                              onChange={() => toggleBillSelection(bill.id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {bill.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(bill.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(bill.total_amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(bill.paid_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              bill.status === 'paid' ? 'default' : 
                              bill.status === 'partial' ? 'secondary' : 
                              'destructive'
                            }>
                              {bill.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Download Options */}
                {selectedBills.size > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {/* Invoice Download */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h3 className="font-medium">Download Invoices</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Generate invoices for selected bills
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateBulkDocuments('invoice', 'html')}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          HTML
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateBulkDocuments('invoice', 'pdf')}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>

                    {/* Receipt Download */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="h-4 w-4 text-green-600" />
                        <h3 className="font-medium">Download Receipts</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Generate receipts for selected bills
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateBulkDocuments('receipt', 'html')}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          HTML
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateBulkDocuments('receipt', 'pdf')}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="text-center text-sm text-gray-600 py-4">
                    Generating documents... Please wait.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Found</h3>
                <p className="text-gray-600">
                  This patient doesn't have any bills yet.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
