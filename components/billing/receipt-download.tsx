"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt, Download, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { Bill } from "@/lib/types/billing"
import { receiptGenerator, ReceiptData } from "@/lib/services/receipt-generator"
import { format } from "date-fns"

interface ReceiptDownloadProps {
  bill: Bill
  onDownload?: () => void
}

export function ReceiptDownload({ bill, onDownload }: ReceiptDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const handleDownloadReceipt = async () => {
    if (!bill) return

    setIsGenerating(true)
    try {
      // Prepare receipt data
      const receiptData: ReceiptData = {
        bill,
        items: bill.items || [],
        payments: bill.payments || [],
        generatedAt: new Date(),
        receiptNumber: `RCP-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      }

      // Generate and download receipt
      receiptGenerator.downloadReceipt(receiptData)
      
      onDownload?.()
      setShowDialog(false)
    } catch (error) {
      console.error('Receipt generation error:', error)
      alert('Failed to generate receipt. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!bill) return

    setIsGenerating(true)
    try {
      // Prepare receipt data
      const receiptData: ReceiptData = {
        bill,
        items: bill.items || [],
        payments: bill.payments || [],
        generatedAt: new Date(),
        receiptNumber: `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      }

      // Generate and download invoice
      receiptGenerator.downloadInvoice(receiptData)
      
      onDownload?.()
      setShowDialog(false)
    } catch (error) {
      console.error('Invoice generation error:', error)
      alert('Failed to generate invoice. Please try again.')
    } finally {
      setIsGenerating(false)
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const remainingAmount = bill.total_amount - bill.paid_amount
  const isFullyPaid = remainingAmount <= 0

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Receipt className="h-4 w-4 mr-2" />
          Download Receipt
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Download Receipt/Invoice</span>
          </DialogTitle>
          <DialogDescription>
            Generate and download a professional receipt or invoice for this bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-medium">
                    {bill.patient?.first_name} {bill.patient?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">MRN</p>
                  <p className="font-medium">{bill.patient?.mrn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium">{formatCurrency(bill.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="font-medium text-green-600">{formatCurrency(bill.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(bill.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{format(new Date(bill.created_at), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          {bill.items && bill.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bill.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-600">
                          {item.item_type} • Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                {isFullyPaid ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Payment Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span>Payment Pending</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(bill.paid_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Remaining:</span>
                  <span className={`font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Download Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleDownloadReceipt}
                disabled={isGenerating}
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <Receipt className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Download Receipt</div>
                  <div className="text-xs opacity-80">Professional receipt PDF</div>
                </div>
              </Button>

              <Button
                onClick={handleDownloadInvoice}
                disabled={isGenerating}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <FileText className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Download Invoice</div>
                  <div className="text-xs opacity-80">Detailed invoice PDF</div>
                </div>
              </Button>
            </div>

            {isGenerating && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Generating document...</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
