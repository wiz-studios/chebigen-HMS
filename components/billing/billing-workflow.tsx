"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  UserPlus, 
  FileText, 
  CreditCard, 
  Receipt, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign
} from "lucide-react"
import { Bill } from "@/lib/types/billing"
import { format } from "date-fns"

interface BillingWorkflowProps {
  bill: Bill
  onStatusChange?: (newStatus: string) => void
}

export function BillingWorkflow({ bill, onStatusChange }: BillingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowSteps, setWorkflowSteps] = useState([
    {
      id: 'patient_registered',
      title: 'Patient Registered',
      description: 'Patient has been registered in the system',
      icon: UserPlus,
      status: 'completed',
      date: bill.created_at
    },
    {
      id: 'services_provided',
      title: 'Services Provided',
      description: 'Medical services have been provided',
      icon: FileText,
      status: 'completed',
      date: bill.created_at
    },
    {
      id: 'bill_created',
      title: 'Bill Created',
      description: 'Bill has been created and is pending review',
      icon: FileText,
      status: bill.status === 'pending' ? 'current' : 'completed',
      date: bill.created_at
    },
    {
      id: 'bill_reviewed',
      title: 'Bill Reviewed',
      description: 'Accountant has reviewed and finalized the bill',
      icon: CheckCircle,
      status: bill.status === 'pending' ? 'pending' : 'completed',
      date: bill.status !== 'pending' ? bill.updated_at : null
    },
    {
      id: 'payment_recorded',
      title: 'Payment Recorded',
      description: 'Payment has been recorded and bill is settled',
      icon: CreditCard,
      status: bill.status === 'paid' ? 'completed' : 'pending',
      date: bill.status === 'paid' ? bill.updated_at : null
    },
    {
      id: 'receipt_generated',
      title: 'Receipt Generated',
      description: 'Receipt has been generated and sent to patient',
      icon: Receipt,
      status: bill.status === 'paid' ? 'completed' : 'pending',
      date: bill.status === 'paid' ? bill.updated_at : null
    }
  ])

  useEffect(() => {
    // Determine current step based on bill status
    const stepIndex = workflowSteps.findIndex(step => step.status === 'current')
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex)
    } else {
      // Find the last completed step
      const lastCompletedIndex = workflowSteps.findLastIndex(step => step.status === 'completed')
      setCurrentStep(Math.max(0, lastCompletedIndex))
    }
  }, [bill.status])

  const getStepIcon = (step: any, index: number) => {
    const Icon = step.icon
    
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (step.status === 'current') {
      return <Clock className="h-5 w-5 text-blue-600" />
    } else if (step.status === 'pending') {
      return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
    
    return <Icon className="h-5 w-5 text-gray-400" />
  }

  const getStepStatus = (step: any) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'current':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'pending':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const getWorkflowProgress = () => {
    const completedSteps = workflowSteps.filter(step => step.status === 'completed').length
    return (completedSteps / workflowSteps.length) * 100
  }

  const getNextAction = () => {
    if (bill.status === 'pending') {
      return {
        title: 'Review Bill',
        description: 'Accountant needs to review and finalize this bill',
        action: 'Review',
        icon: CheckCircle
      }
    } else if (bill.status === 'partial') {
      return {
        title: 'Record Payment',
        description: 'Record additional payment for this bill',
        action: 'Record Payment',
        icon: CreditCard
      }
    } else if (bill.status === 'paid') {
      return {
        title: 'Generate Receipt',
        description: 'Generate and send receipt to patient',
        action: 'Generate Receipt',
        icon: Receipt
      }
    }
    return null
  }

  const nextAction = getNextAction()

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Billing Workflow</span>
          </CardTitle>
          <CardDescription>
            Track the progress of this bill through the billing process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(getWorkflowProgress())}%</span>
              </div>
              <Progress value={getWorkflowProgress()} className="h-2" />
            </div>

            {/* Workflow Steps */}
            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getStepIcon(step, index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <Badge variant="outline" className={getStepStatus(step)}>
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    {step.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(step.date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Bill Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(bill.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(bill.paid_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className={`text-lg font-semibold ${bill.total_amount - bill.paid_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(bill.total_amount - bill.paid_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant="outline" className={getStepStatus({ status: bill.status })}>
                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Action */}
      {nextAction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <nextAction.icon className="h-5 w-5" />
              <span>Next Action Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{nextAction.title}</h4>
                <p className="text-sm text-gray-600">{nextAction.description}</p>
              </div>
              
              <Button className="w-full">
                {nextAction.action}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Available */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Methods</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <span className="text-sm">Cash</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <CreditCard className="h-5 w-5 text-gray-600" />
              <span className="text-sm">Card</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              <span className="text-sm">Insurance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
