'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, AlertTriangle } from 'lucide-react'
import { billingService } from '@/lib/supabase/billing'

interface BillDebugPanelProps {
  userRole: string
  userId: string
}

export function BillDebugPanel({ userRole, userId }: BillDebugPanelProps) {
  const [debugData, setDebugData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const fetchDebugData = async () => {
    setIsLoading(true)
    try {
      console.log("=== DEBUG PANEL: Fetching debug data ===")
      
      // Get bills data
      const billsResult = await billingService.getBills({}, 1, 10, userRole, userId)
      console.log("Debug Panel: Bills result:", billsResult)
      
      // Get stats data
      const statsResult = await billingService.getBillingStats(userRole, userId)
      console.log("Debug Panel: Stats result:", statsResult)
      
      setDebugData({
        bills: billsResult.bills || [],
        stats: statsResult,
        timestamp: new Date().toISOString()
      })
      
      console.log("Debug Panel: Debug data updated")
    } catch (error) {
      console.error("Debug Panel: Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const testBillStatus = async (billId: string) => {
    try {
      console.log("=== DEBUG PANEL: Testing bill status for:", billId)
      const result = await billingService.testDatabaseState(billId)
      setTestResult(result)
      console.log("Debug Panel: Test result:", result)
    } catch (error) {
      console.error("Debug Panel: Error testing bill status:", error)
      setTestResult({ error: error.message })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bill Debug Panel
          </CardTitle>
          <Button 
            onClick={fetchDebugData} 
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugData ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{debugData.stats.totalBills}</div>
                <div className="text-sm text-muted-foreground">Total Bills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{debugData.stats.billsByStatus.paid}</div>
                <div className="text-sm text-muted-foreground">Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{debugData.stats.billsByStatus.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{debugData.stats.billsByStatus.partial}</div>
                <div className="text-sm text-muted-foreground">Partial</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Recent Bills Status:</h4>
              {debugData.bills.slice(0, 5).map((bill: any, index: number) => (
                <div key={bill.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">#{bill.id.slice(0, 8)}</span>
                    <Badge 
                      variant={
                        bill.status === 'paid' ? 'default' : 
                        bill.status === 'partial' ? 'secondary' : 'outline'
                      }
                    >
                      {bill.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {formatCurrency(bill.paid_amount)} / {formatCurrency(bill.total_amount)}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => testBillStatus(bill.id)}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(debugData.timestamp).toLocaleTimeString()}
            </div>

            {testResult && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Bill Status:</strong> {testResult.bill?.status}</div>
                  <div><strong>Expected Status:</strong> {testResult.expectedStatus}</div>
                  <div><strong>Status Matches:</strong> {testResult.statusMatches ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Total Payments:</strong> {formatCurrency(testResult.totalPayments || 0)}</div>
                  <div><strong>Bill Paid Amount:</strong> {formatCurrency(testResult.bill?.paid_amount || 0)}</div>
                  <div><strong>Bill Total Amount:</strong> {formatCurrency(testResult.bill?.total_amount || 0)}</div>
                  <div><strong>Payment Count:</strong> {testResult.payments?.length || 0}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No debug data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
