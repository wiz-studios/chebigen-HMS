"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Receipt, Calendar, User, DollarSign, Loader2 } from "lucide-react"
import { Bill } from "@/lib/types/billing"
import { format } from "date-fns"

interface InvoiceDownloadProps {
  bill: Bill
  userRole: string
}

export function InvoiceDownload({ bill, userRole }: InvoiceDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const generateInvoice = async () => {
    setIsGenerating(true)
    try {
      await generatePDF(bill, 'invoice')
    } catch (error) {
      console.error("Error generating invoice:", error)
      alert("Error generating invoice. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const generateReceipt = async () => {
    setIsGenerating(true)
    try {
      await generatePDF(bill, 'receipt')
    } catch (error) {
      console.error("Error generating receipt:", error)
      alert("Error generating receipt. Please try again.")
    } finally {
      setIsGenerating(false)
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
        <div class="hospital-name">Chebigen Referral Hospital</div>
        <div class="tagline">Quality Healthcare Services</div>
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
        <div class="hospital-name">Chebigen Referral Hospital</div>
        <div class="tagline">Quality Healthcare Services</div>
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

  const generatePDF = async (bill: Bill, type: 'invoice' | 'receipt') => {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf')
    
    const doc = new jsPDF()
    let yPosition = 20
    
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
    
        // Patient Info Card with Professional Styling
        doc.setFillColor(247, 250, 252) // Off-white background
        doc.roundedRect(15, yPosition - 5, 180, 25, 3, 3, 'F')
        
        // Card border
        doc.setDrawColor(229, 231, 235) // Light gray border
        doc.setLineWidth(0.5)
        doc.roundedRect(15, yPosition - 5, 180, 25, 3, 3, 'S')
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(13, 148, 136) // Teal text
        doc.setFontSize(12)
        doc.text('👤 Patient Information', 20, yPosition)
        yPosition += 5
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(51, 65, 85) // Dark slate text
        doc.setFontSize(10)
        
        // Patient details with icons and better formatting
        doc.text(`🧍 Name: ${bill.patient?.first_name || 'Unknown'} ${bill.patient?.last_name || 'Patient'}`, 20, yPosition)
        doc.text(`🏥 MRN: ${bill.patient?.mrn || 'N/A'}`, 20, yPosition + 5)
        doc.text(`📞 Contact: ${bill.patient?.contact || 'N/A'}`, 20, yPosition + 10)
        yPosition += 20
    
    // Professional Services Table
    if (bill.items && bill.items.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(13, 148, 136) // Teal text
      doc.text('📋 Services Rendered:', 20, yPosition)
      yPosition += 10
      
      // Professional table header with subtle background
      doc.setFillColor(241, 245, 249) // Light tinted background
      doc.rect(15, yPosition - 3, 180, 8, 'F')
      
      // Table border
      doc.setDrawColor(224, 224, 224) // Very light gray borders
      doc.setLineWidth(0.3)
      doc.rect(15, yPosition - 3, 180, 8, 'S')
      
      // Table headers with professional styling
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85) // Dark slate text
      doc.text('Service/Item', 20, yPosition)
      doc.text('Qty', 100, yPosition)
      doc.text('Unit Price', 120, yPosition)
      doc.text('Amount', 160, yPosition)
      yPosition += 5
      
      // Table rows with professional alternating colors
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      bill.items.forEach((item, index) => {
        // Subtle alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250) // Very light gray
          doc.rect(15, yPosition - 2, 180, 5, 'F')
        } else {
          doc.setFillColor(255, 255, 255) // White
          doc.rect(15, yPosition - 2, 180, 5, 'F')
        }
        
        // Row border
        doc.setDrawColor(224, 224, 224)
        doc.setLineWidth(0.2)
        doc.line(15, yPosition + 3, 195, yPosition + 3)
        
        doc.setTextColor(51, 65, 85) // Dark slate text
        doc.text(item.description.substring(0, 25), 20, yPosition)
        
        // Right-aligned numeric fields for better readability
        doc.text(item.quantity.toString(), 100, yPosition)
        doc.text(formatCurrency(item.unit_price), 120, yPosition)
        doc.text(formatCurrency(item.total_price), 160, yPosition)
        yPosition += 5
      })
      yPosition += 5
    }
    
    // Professional Payment Summary
    doc.setFillColor(247, 250, 252) // Off-white background
    doc.roundedRect(15, yPosition - 5, 180, 40, 3, 3, 'F')
    
    // Card border
    doc.setDrawColor(229, 231, 235) // Light gray border
    doc.setLineWidth(0.5)
    doc.roundedRect(15, yPosition - 5, 180, 40, 3, 3, 'S')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(13, 148, 136) // Teal text
    doc.text('💰 Payment Summary:', 20, yPosition)
    yPosition += 10
    
    // Right-aligned totals for professional appearance
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85) // Dark slate text
    
    // Subtotal
    doc.text('Subtotal:', 120, yPosition)
    doc.text(formatCurrency(bill.total_amount), 160, yPosition)
    yPosition += 8
    
    // Amount paid
    doc.text('Amount Paid:', 120, yPosition)
    doc.text(formatCurrency(bill.paid_amount), 160, yPosition)
    yPosition += 8
    
    // Outstanding balance (if any)
    if (bill.paid_amount < bill.total_amount) {
      doc.setTextColor(220, 38, 38) // Red for outstanding balance
      doc.text('Outstanding Balance:', 120, yPosition)
      doc.text(formatCurrency(bill.total_amount - bill.paid_amount), 160, yPosition)
      doc.setTextColor(51, 65, 85) // Reset to dark slate
      yPosition += 8
    }
    
    // Status badge with color coding
    const statusColors = {
      'paid': [22, 163, 74], // Green
      'partial': [245, 158, 11], // Amber
      'pending': [220, 38, 38] // Red
    }
    const statusColor = statusColors[bill.status as keyof typeof statusColors] || [220, 38, 38]
    
    // Status badge background
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.roundedRect(120, yPosition - 2, 60, 6, 3, 3, 'F')
    
    // Status text in white
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(bill.status.toUpperCase(), 150, yPosition + 1)
    
    // Reset text color
    doc.setTextColor(51, 65, 85)
    yPosition += 15
    
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
    
    // Professional Footer with Branding
    // Divider line
    doc.setDrawColor(224, 224, 224) // Light gray
    doc.setLineWidth(0.5)
    doc.line(15, yPosition - 5, 195, yPosition - 5)
    
    // Confidentiality note
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128) // Gray text
    doc.text('This is a computer-generated document. No signature required.', 20, yPosition)
    yPosition += 8
    
    // Contact information with icons
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85) // Dark slate text
    doc.text('📍 P.O. Box 123, Nairobi', 20, yPosition)
    doc.text('📞 +254 700 000 000', 20, yPosition + 5)
    doc.text('✉️ info@chebigenhospital.co.ke', 20, yPosition + 10)
    yPosition += 15
    
    // Thank you message
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(13, 148, 136) // Teal text
    doc.text('Thank you for choosing Chebigen Referral Hospital', 20, yPosition)
    
    // Generation timestamp
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // Gray text
    doc.text('Generated on: ' + format(new Date(), 'MMM dd, yyyy HH:mm'), 20, yPosition + 8)
    
    // Download the PDF
    const filename = `${type}_${bill.id.slice(0, 8)}_${bill.patient?.first_name || 'Unknown'}_${bill.patient?.last_name || 'Patient'}.pdf`
    doc.save(filename)
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
          <FileText className="h-5 w-5" />
          Download Invoice/Receipt
        </CardTitle>
        <CardDescription>
          Generate and download invoice or receipt for this bill
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bill Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Bill ID:</span> {bill.id.slice(0, 8)}
            </div>
            <div>
              <span className="font-medium">Patient:</span> {bill.patient?.first_name || 'Unknown'} {bill.patient?.last_name || 'Patient'}
            </div>
            <div>
              <span className="font-medium">Total Amount:</span> {formatCurrency(bill.total_amount)}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge variant={bill.status === 'paid' ? 'default' : bill.status === 'partial' ? 'secondary' : 'destructive'} className="ml-2">
                {bill.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Download Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invoice Download */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium">Invoice</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Download a detailed invoice for this bill
            </p>
            <Button
              size="sm"
              onClick={() => generateInvoice()}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download Invoice
            </Button>
          </div>

          {/* Receipt Download */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-green-600" />
              <h3 className="font-medium">Receipt</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Download a payment receipt for this bill
            </p>
            <Button
              size="sm"
              onClick={() => generateReceipt()}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download Receipt
            </Button>
          </div>
        </div>

        {isGenerating && (
          <div className="text-center text-sm text-gray-600">
            Generating document...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
