// Auto Billing Service
// Automatically creates billing entries when doctors, nurses, and lab technicians complete their tasks

import { createClient } from '@/lib/supabase/client'
import { Bill, BillItem, ItemType } from '@/lib/types/billing'

export interface AutoBillingConfig {
  // Doctor consultation fees
  consultationFee: number
  followUpFee: number
  
  // Nurse procedure fees
  injectionFee: number
  vitalsCheckFee: number
  dressingFee: number
  
  // Lab test fees
  bloodTestFee: number
  urineTestFee: number
  xrayFee: number
  scanFee: number
}

export interface AutoBillingRequest {
  patientId: string
  serviceType: ItemType
  serviceName: string
  description: string
  cost: number
  performedBy: string
  performedByRole: string
  appointmentId?: string
  consultationId?: string
  labTestId?: string
}

export class AutoBillingService {
  private supabase = createClient()
  private config: AutoBillingConfig

  constructor(config?: Partial<AutoBillingConfig>) {
    this.config = {
      consultationFee: 500,
      followUpFee: 300,
      injectionFee: 200,
      vitalsCheckFee: 100,
      dressingFee: 150,
      bloodTestFee: 800,
      urineTestFee: 300,
      xrayFee: 1200,
      scanFee: 2500,
      ...config
    }
  }

  // Auto-bill doctor consultation
  async autoBillConsultation(
    patientId: string,
    doctorId: string,
    appointmentId: string,
    isFollowUp: boolean = false
  ): Promise<Bill | null> {
    try {
      const serviceName = isFollowUp ? 'Follow-up Consultation' : 'Initial Consultation'
      const cost = isFollowUp ? this.config.followUpFee : this.config.consultationFee

      return await this.createAutoBill({
        patientId,
        serviceType: 'appointment',
        serviceName,
        description: `${serviceName} - Medical consultation and examination`,
        cost,
        performedBy: doctorId,
        performedByRole: 'doctor',
        appointmentId
      })
    } catch (error) {
      console.error('Auto-billing consultation error:', error)
      return null
    }
  }

  // Auto-bill nurse procedure
  async autoBillNurseProcedure(
    patientId: string,
    nurseId: string,
    procedureType: 'injection' | 'vitals' | 'dressing',
    description?: string
  ): Promise<Bill | null> {
    try {
      const serviceConfig = {
        injection: { name: 'Injection Administration', cost: this.config.injectionFee },
        vitals: { name: 'Vital Signs Check', cost: this.config.vitalsCheckFee },
        dressing: { name: 'Wound Dressing', cost: this.config.dressingFee }
      }

      const config = serviceConfig[procedureType]

      return await this.createAutoBill({
        patientId,
        serviceType: 'procedure',
        serviceName: config.name,
        description: description || `${config.name} - Patient care procedure`,
        cost: config.cost,
        performedBy: nurseId,
        performedByRole: 'nurse'
      })
    } catch (error) {
      console.error('Auto-billing nurse procedure error:', error)
      return null
    }
  }

  // Auto-bill lab test
  async autoBillLabTest(
    patientId: string,
    labTechId: string,
    testType: 'blood' | 'urine' | 'xray' | 'scan',
    testName: string,
    labTestId: string
  ): Promise<Bill | null> {
    try {
      const testConfig = {
        blood: { cost: this.config.bloodTestFee },
        urine: { cost: this.config.urineTestFee },
        xray: { cost: this.config.xrayFee },
        scan: { cost: this.config.scanFee }
      }

      const cost = testConfig[testType].cost

      return await this.createAutoBill({
        patientId,
        serviceType: 'lab_test',
        serviceName: testName,
        description: `Laboratory test - ${testName}`,
        cost,
        performedBy: labTechId,
        performedByRole: 'lab_tech',
        labTestId
      })
    } catch (error) {
      console.error('Auto-billing lab test error:', error)
      return null
    }
  }

  // Create auto-bill with proper workflow
  private async createAutoBill(request: AutoBillingRequest): Promise<Bill | null> {
    try {
      // Check if there's already a pending bill for this patient
      const { data: existingBill, error: billError } = await this.supabase
        .from('bills')
        .select('*')
        .eq('patient_id', request.patientId)
        .eq('status', 'pending')
        .single()

      let billId: string

      if (existingBill) {
        // Add item to existing bill
        billId = existingBill.id
        await this.addItemToBill(billId, request)
      } else {
        // Create new bill
        const { data: newBill, error: createError } = await this.supabase
          .from('bills')
          .insert({
            patient_id: request.patientId,
            created_by: request.performedBy,
            status: 'pending',
            total_amount: request.cost,
            paid_amount: 0,
            notes: `Auto-generated bill for ${request.serviceName}`
          })
          .select()
          .single()

        if (createError) throw createError
        billId = newBill.id

        // Add the first item
        await this.addItemToBill(billId, request)
      }

      // Get the updated bill
      const { data: bill, error: fetchError } = await this.supabase
        .from('bills')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn),
          created_by_user:auth.users(id, raw_user_meta_data),
          items:bill_items(*)
        `)
        .eq('id', billId)
        .single()

      if (fetchError) throw fetchError

      // Create notification for the patient
      await this.createBillingNotification(bill, request)

      return bill
    } catch (error) {
      console.error('Create auto-bill error:', error)
      return null
    }
  }

  // Add item to existing bill
  private async addItemToBill(billId: string, request: AutoBillingRequest): Promise<void> {
    const { error: itemError } = await this.supabase
      .from('bill_items')
      .insert({
        bill_id: billId,
        item_type: request.serviceType,
        description: request.description,
        quantity: 1,
        unit_price: request.cost,
        total_price: request.cost
      })

    if (itemError) throw itemError

    // Update bill total
    const { error: updateError } = await this.supabase
      .from('bills')
      .update({
        total_amount: this.supabase.raw('total_amount + ?', [request.cost])
      })
      .eq('id', billId)

    if (updateError) throw updateError
  }

  // Create billing notification
  private async createBillingNotification(bill: any, request: AutoBillingRequest): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .insert({
          type: 'bill_created',
          title: 'New Bill Created',
          message: `A new bill of ${request.cost} KES has been created for ${request.serviceName}`,
          data: {
            bill_id: bill.id,
            amount: request.cost,
            service_name: request.serviceName,
            patient_id: request.patientId
          },
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Create billing notification error:', error)
    }
  }

  // Get auto-billing configuration
  getConfig(): AutoBillingConfig {
    return this.config
  }

  // Update auto-billing configuration
  updateConfig(newConfig: Partial<AutoBillingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Default auto-billing service instance
export const autoBillingService = new AutoBillingService()
