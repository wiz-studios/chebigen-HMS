// Auto Billing Hooks
// React hooks for integrating automatic billing into the application

import { useCallback } from 'react'
import { autoBillingService, AutoBillingRequest } from '@/lib/services/auto-billing-service'
import { useToast } from '@/hooks/use-toast'

export function useAutoBilling() {
  const { toast } = useToast()

  // Auto-bill consultation when doctor completes appointment
  const autoBillConsultation = useCallback(async (
    patientId: string,
    doctorId: string,
    appointmentId: string,
    isFollowUp: boolean = false
  ) => {
    try {
      const bill = await autoBillingService.autoBillConsultation(
        patientId,
        doctorId,
        appointmentId,
        isFollowUp
      )

      if (bill) {
        toast({
          title: "Bill Created",
          description: `Consultation fee of ${bill.total_amount} KES has been added to patient's bill.`,
          variant: "default"
        })
        return bill
      }
    } catch (error) {
      console.error('Auto-bill consultation error:', error)
      toast({
        title: "Billing Error",
        description: "Failed to create consultation bill. Please create manually.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Auto-bill nurse procedure
  const autoBillNurseProcedure = useCallback(async (
    patientId: string,
    nurseId: string,
    procedureType: 'injection' | 'vitals' | 'dressing',
    description?: string
  ) => {
    try {
      const bill = await autoBillingService.autoBillNurseProcedure(
        patientId,
        nurseId,
        procedureType,
        description
      )

      if (bill) {
        toast({
          title: "Procedure Billed",
          description: `${procedureType} procedure has been added to patient's bill.`,
          variant: "default"
        })
        return bill
      }
    } catch (error) {
      console.error('Auto-bill nurse procedure error:', error)
      toast({
        title: "Billing Error",
        description: "Failed to create procedure bill. Please create manually.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Auto-bill lab test
  const autoBillLabTest = useCallback(async (
    patientId: string,
    labTechId: string,
    testType: 'blood' | 'urine' | 'xray' | 'scan',
    testName: string,
    labTestId: string
  ) => {
    try {
      const bill = await autoBillingService.autoBillLabTest(
        patientId,
        labTechId,
        testType,
        testName,
        labTestId
      )

      if (bill) {
        toast({
          title: "Lab Test Billed",
          description: `${testName} has been added to patient's bill.`,
          variant: "default"
        })
        return bill
      }
    } catch (error) {
      console.error('Auto-bill lab test error:', error)
      toast({
        title: "Billing Error",
        description: "Failed to create lab test bill. Please create manually.",
        variant: "destructive"
      })
    }
  }, [toast])

  return {
    autoBillConsultation,
    autoBillNurseProcedure,
    autoBillLabTest
  }
}

// Hook for doctor consultation completion
export function useDoctorBilling() {
  const { autoBillConsultation } = useAutoBilling()

  const completeConsultation = useCallback(async (
    patientId: string,
    doctorId: string,
    appointmentId: string,
    isFollowUp: boolean = false
  ) => {
    // Complete the consultation logic here
    // ... (update appointment status, add notes, etc.)
    
    // Auto-bill the consultation
    return await autoBillConsultation(patientId, doctorId, appointmentId, isFollowUp)
  }, [autoBillConsultation])

  return { completeConsultation }
}

// Hook for nurse procedure billing
export function useNurseBilling() {
  const { autoBillNurseProcedure } = useAutoBilling()

  const logProcedure = useCallback(async (
    patientId: string,
    nurseId: string,
    procedureType: 'injection' | 'vitals' | 'dressing',
    description?: string
  ) => {
    // Log the procedure logic here
    // ... (update patient records, add procedure notes, etc.)
    
    // Auto-bill the procedure
    return await autoBillNurseProcedure(patientId, nurseId, procedureType, description)
  }, [autoBillNurseProcedure])

  return { logProcedure }
}

// Hook for lab technician billing
export function useLabBilling() {
  const { autoBillLabTest } = useAutoBilling()

  const submitTestResult = useCallback(async (
    patientId: string,
    labTechId: string,
    testType: 'blood' | 'urine' | 'xray' | 'scan',
    testName: string,
    labTestId: string,
    results: any
  ) => {
    // Submit test results logic here
    // ... (update lab test status, add results, etc.)
    
    // Auto-bill the lab test
    return await autoBillLabTest(patientId, labTechId, testType, testName, labTestId)
  }, [autoBillLabTest])

  return { submitTestResult }
}
