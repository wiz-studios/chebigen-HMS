// Professional Receipt/Invoice Generator
// Based on comprehensive billing module specification

import jsPDF from 'jspdf'
import { Bill, BillItem, PaymentHistory } from '@/lib/types/billing'
import { format } from 'date-fns'

export interface ReceiptConfig {
  hospitalName: string
  hospitalAddress: string
  hospitalPhone: string
  hospitalEmail: string
  logoUrl?: string
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }
}

export interface ReceiptData {
  bill: Bill
  items: BillItem[]
  payments: PaymentHistory[]
  generatedAt: Date
  receiptNumber: string
}

export class ReceiptGenerator {
  private config: ReceiptConfig
  private doc: jsPDF

  constructor(config: ReceiptConfig) {
    this.config = config
    this.doc = new jsPDF()
  }

  // Generate professional receipt
  generateReceipt(data: ReceiptData): jsPDF {
    this.doc = new jsPDF()
    
    // Set up document
    this.setupDocument()
    
    // Generate header
    this.generateHeader()
    
    // Generate patient info
    this.generatePatientInfo(data)
    
    // Generate services table
    this.generateServicesTable(data)
    
    // Generate payment summary
    this.generatePaymentSummary(data)
    
    // Generate footer
    this.generateFooter()
    
    return this.doc
  }

  // Generate invoice (for unpaid bills)
  generateInvoice(data: ReceiptData): jsPDF {
    this.doc = new jsPDF()
    
    this.setupDocument()
    this.generateHeader()
    this.generatePatientInfo(data)
    this.generateServicesTable(data)
    this.generatePaymentSummary(data)
    this.generateFooter()
    
    return this.doc
  }

  private setupDocument(): void {
    this.doc.setProperties({
      title: 'Hospital Receipt',
      subject: 'Medical Services Receipt',
      author: this.config.hospitalName,
      creator: 'Hospital Management System'
    })
  }

  private generateHeader(): void {
    const pageWidth = this.doc.internal.pageSize.getWidth()
    const margin = 20
    
    // Hospital logo and name
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(this.config.colors.primary)
    this.doc.text(this.config.hospitalName, margin, 30)
    
    // Hospital address
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    this.doc.text(this.config.hospitalAddress, margin, 40)
    this.doc.text(`Phone: ${this.config.hospitalPhone}`, margin, 45)
    this.doc.text(`Email: ${this.config.hospitalEmail}`, margin, 50)
    
    // Receipt title with decorative line
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(this.config.colors.primary)
    this.doc.text('MEDICAL SERVICES RECEIPT', pageWidth - margin - 80, 30)
    
    // Decorative line
    this.doc.setDrawColor(this.config.colors.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(pageWidth - margin - 80, 35, pageWidth - margin, 35)
    
    // Receipt number and date
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    this.doc.text(`Receipt No: RCP-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, pageWidth - margin - 80, 45)
    this.doc.text(`Issued: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin - 80, 50)
  }

  private generatePatientInfo(data: ReceiptData): void {
    const margin = 20
    let yPos = 70
    
    // Patient information box
    this.doc.setFillColor(this.config.colors.background)
    this.doc.rect(margin, yPos, 170, 30, 'F')
    
    // Patient details
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(this.config.colors.primary)
    this.doc.text('PATIENT INFORMATION', margin + 5, yPos + 10)
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    this.doc.text(`Name: ${data.bill.patient?.first_name} ${data.bill.patient?.last_name}`, margin + 5, yPos + 18)
    this.doc.text(`MRN: ${data.bill.patient?.mrn}`, margin + 5, yPos + 25)
    this.doc.text(`Date: ${format(new Date(data.bill.created_at), 'dd/MM/yyyy')}`, margin + 90, yPos + 18)
    this.doc.text(`Bill ID: ${data.bill.id.substring(0, 8)}`, margin + 90, yPos + 25)
  }

  private generateServicesTable(data: ReceiptData): void {
    const margin = 20
    let yPos = 110
    
    // Table header
    this.doc.setFillColor(this.config.colors.primary)
    this.doc.rect(margin, yPos, 170, 8, 'F')
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('Service', margin + 2, yPos + 6)
    this.doc.text('Description', margin + 40, yPos + 6)
    this.doc.text('Qty', margin + 120, yPos + 6)
    this.doc.text('Price', margin + 135, yPos + 6)
    this.doc.text('Total', margin + 160, yPos + 6)
    
    yPos += 8
    
    // Table rows
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    
    data.items.forEach((item, index) => {
      if (yPos > 250) {
        this.doc.addPage()
        yPos = 20
      }
      
      const rowHeight = 8
      const bgColor = index % 2 === 0 ? this.config.colors.background : 255
      
      this.doc.setFillColor(bgColor)
      this.doc.rect(margin, yPos, 170, rowHeight, 'F')
      
      this.doc.text(item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1), margin + 2, yPos + 6)
      this.doc.text(item.description.substring(0, 30), margin + 40, yPos + 6)
      this.doc.text(item.quantity.toString(), margin + 120, yPos + 6)
      this.doc.text(this.formatCurrency(item.unit_price), margin + 135, yPos + 6)
      this.doc.text(this.formatCurrency(item.total_price), margin + 160, yPos + 6)
      
      yPos += rowHeight
    })
    
    // Table footer line
    this.doc.setDrawColor(this.config.colors.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(margin, yPos, margin + 170, yPos)
  }

  private generatePaymentSummary(data: ReceiptData): void {
    const margin = 20
    let yPos = 200
    
    // Payment summary box
    this.doc.setFillColor(this.config.colors.background)
    this.doc.rect(margin + 120, yPos, 70, 40, 'F')
    
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.total_price, 0)
    const vat = subtotal * 0.16 // 16% VAT
    const total = subtotal + vat
    const paidAmount = data.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const balance = total - paidAmount
    
    // Summary details
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    
    this.doc.text('Subtotal:', margin + 125, yPos + 10)
    this.doc.text(this.formatCurrency(subtotal), margin + 170, yPos + 10)
    
    this.doc.text('VAT (16%):', margin + 125, yPos + 18)
    this.doc.text(this.formatCurrency(vat), margin + 170, yPos + 18)
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TOTAL:', margin + 125, yPos + 26)
    this.doc.text(this.formatCurrency(total), margin + 170, yPos + 26)
    
    this.doc.text('PAID:', margin + 125, yPos + 34)
    this.doc.text(this.formatCurrency(paidAmount), margin + 170, yPos + 34)
    
    // Balance
    if (balance > 0) {
      this.doc.setTextColor(255, 0, 0)
      this.doc.text('BALANCE:', margin + 125, yPos + 42)
      this.doc.text(this.formatCurrency(balance), margin + 170, yPos + 42)
    } else {
      this.doc.setTextColor(0, 128, 0)
      this.doc.text('STATUS: PAID', margin + 125, yPos + 42)
    }
    
    // Payment method
    if (data.payments.length > 0) {
      const lastPayment = data.payments[data.payments.length - 1]
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(this.config.colors.text)
      this.doc.text(`Payment Method: ${lastPayment.payment_method.toUpperCase()}`, margin + 20, yPos + 50)
    }
  }

  private generateFooter(): void {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const margin = 20
    
    // Thank you message
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(this.config.colors.primary)
    this.doc.text('Thank you for choosing our medical services!', margin, pageHeight - 40)
    this.doc.text('Get well soon!', margin, pageHeight - 30)
    
    // Contact information
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(this.config.colors.text)
    this.doc.text(`For inquiries, contact us at ${this.config.hospitalPhone} or ${this.config.hospitalEmail}`, margin, pageHeight - 20)
    this.doc.text(`Visit us at ${this.config.hospitalAddress}`, margin, pageHeight - 15)
    
    // Watermark
    if (this.isBillPaid()) {
      this.doc.setFontSize(48)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(0, 128, 0, 0.1)
      this.doc.text('PAID', 100, pageHeight / 2, { angle: 45 })
    }
  }

  private isBillPaid(): boolean {
    // This would need to be passed in the data or determined from the bill status
    return true // Placeholder
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  // Download receipt as PDF
  downloadReceipt(data: ReceiptData, filename?: string): void {
    this.generateReceipt(data)
    const defaultFilename = `receipt-${data.receiptNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    this.doc.save(filename || defaultFilename)
  }

  // Download invoice as PDF
  downloadInvoice(data: ReceiptData, filename?: string): void {
    this.generateInvoice(data)
    const defaultFilename = `invoice-${data.receiptNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    this.doc.save(filename || defaultFilename)
  }
}

// Default receipt configuration
export const getDefaultReceiptConfig = (): ReceiptConfig => ({
  hospitalName: "St. Mary's Medical Center",
  hospitalAddress: "123 Medical Drive, Nairobi, Kenya",
  hospitalPhone: "+254 700 000 000",
  hospitalEmail: "info@stmarysmedical.co.ke",
  colors: {
    primary: '#2563eb', // Blue
    secondary: '#1e40af',
    accent: '#3b82f6',
    text: '#374151',
    background: '#f8fafc'
  }
})

// Create default receipt generator
export const receiptGenerator = new ReceiptGenerator(getDefaultReceiptConfig())
