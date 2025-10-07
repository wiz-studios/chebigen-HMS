// Enhanced Billing System API Functions
// Based on comprehensive billing module specification

import { createClient } from '@/lib/supabase/client'
import { 
  Bill, 
  BillItem, 
  PaymentHistory, 
  CreateBillRequest, 
  UpdateBillRequest, 
  RecordPaymentRequest,
  BillingStats,
  BillingFilters,
  BillingPermissions,
  getBillingPermissions
} from '@/lib/types/billing'

export class BillingService {
  private supabase = createClient()

  // Method to manually recalculate bill totals
  async recalculateBillTotals(billId: string): Promise<void> {
    console.log("BillingService: Recalculating totals for bill:", billId)
    
    try {
      // Get all bill items for this bill
      const { data: items, error: itemsError } = await this.supabase
        .from('bill_items')
        .select('total_price')
        .eq('bill_id', billId)
      
      if (itemsError) {
        console.error("BillingService: Error fetching bill items:", itemsError)
        throw itemsError
      }
      
      // Calculate total
      const totalAmount = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0
      console.log("BillingService: Calculated total:", totalAmount)
      
      // Update the bill
      const { error: updateError } = await this.supabase
        .from('bills')
        .update({ total_amount: totalAmount })
        .eq('id', billId)
      
      if (updateError) {
        console.error("BillingService: Error updating bill total:", updateError)
        throw updateError
      }
      
      console.log("BillingService: Successfully updated bill total to:", totalAmount)
    } catch (error) {
      console.error("BillingService: Error recalculating totals:", error)
      throw error
    }
  }

  // Debug method to test bill fetching
  async debugBillFetch(userRole: string, userId: string) {
    console.log("BillingService: Debug - Testing bill fetch")
    console.log("BillingService: Debug - User role:", userRole, "User ID:", userId)
    
    try {
      // Test direct query without RLS
      const { data: allBills, error: allBillsError } = await this.supabase
        .from('bills')
        .select('*')
      
      console.log("BillingService: Debug - All bills query:", {
        count: allBills?.length || 0,
        error: allBillsError?.message || null
      })
      
      // Test filtered query
      const { data: filteredBills, error: filteredError } = await this.supabase
        .from('bills')
        .select('*')
        .eq('created_by', userId)
      
      console.log("BillingService: Debug - Filtered bills query:", {
        count: filteredBills?.length || 0,
        error: filteredError?.message || null,
        bills: filteredBills
      })
      
      // Test user role verification
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      
      console.log("BillingService: Debug - User data:", {
        role: userData?.role,
        error: userError?.message || null
      })
      
      return {
        allBills: allBills?.length || 0,
        filteredBills: filteredBills?.length || 0,
        userRole: userData?.role,
        errors: {
          allBills: allBillsError?.message,
          filtered: filteredError?.message,
          user: userError?.message
        }
      }
    } catch (error) {
      console.error("BillingService: Debug error:", error)
      throw error
    }
  }

  // Debug method to check triggers and bill items
  async debugBillItems(billId: string) {
    console.log("BillingService: Debug - Checking bill items for bill:", billId)
    
    try {
      // Check if bill items exist
      const { data: items, error: itemsError } = await this.supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId)
      
      console.log("BillingService: Debug - Bill items:", {
        count: items?.length || 0,
        items: items,
        error: itemsError?.message || null
      })
      
      // Check current bill total
      const { data: bill, error: billError } = await this.supabase
        .from('bills')
        .select('total_amount, paid_amount, status')
        .eq('id', billId)
        .single()
      
      console.log("BillingService: Debug - Bill totals:", {
        total_amount: bill?.total_amount,
        paid_amount: bill?.paid_amount,
        status: bill?.status,
        error: billError?.message || null
      })
      
      // Calculate expected total
      const expectedTotal = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0
      console.log("BillingService: Debug - Expected total:", expectedTotal)
      
      return {
        itemsCount: items?.length || 0,
        items: items,
        currentTotal: bill?.total_amount || 0,
        expectedTotal: expectedTotal,
        billStatus: bill?.status,
        errors: {
          items: itemsError?.message,
          bill: billError?.message
        }
      }
    } catch (error) {
      console.error("BillingService: Debug bill items error:", error)
      throw error
    }
  }

  // Create a new bill
  async createBill(request: CreateBillRequest, userId: string): Promise<Bill> {
    try {
    const { data: bill, error: billError } = await this.supabase
      .from('bills')
      .insert({
        patient_id: request.patient_id,
        created_by: userId,
        notes: request.notes,
        total_amount: 0, // Will be calculated by trigger
        paid_amount: 0
      })
      .select()
      .single()

      if (billError) {
        console.error("BillingService: Error creating bill:", billError)
        throw billError
      }

      if (!bill) {
        console.error("BillingService: No bill returned after creation")
        throw new Error("Failed to create bill - no data returned")
      }

    // Insert bill items
    if (request.items.length > 0) {
      const items = request.items.map(item => ({
        ...item,
        bill_id: bill.id,
        total_price: item.quantity * item.unit_price
      }))

      console.log("BillingService: Bill items to insert:", items)
      console.log("BillingService: Items total calculation:", items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })))

      const { error: itemsError } = await this.supabase
        .from('bill_items')
        .insert(items)

      if (itemsError) {
        console.error("BillingService: Error inserting bill items:", itemsError)
        throw itemsError
      }

      console.log("BillingService: Bill items inserted successfully")
      
      // Wait for triggers to process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check if triggers updated the total
      const { data: triggerCheck, error: triggerError } = await this.supabase
        .from('bills')
        .select('total_amount')
        .eq('id', bill.id)
        .single()
      
      if (triggerError) {
        console.error("BillingService: Error checking trigger update:", triggerError)
      } else {
        console.log("BillingService: Trigger check - bill total:", triggerCheck?.total_amount)
      }

        // Always manually calculate and update the total to ensure accuracy
        console.log("BillingService: Manually calculating bill total...")
        const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)
        console.log("BillingService: Calculated total amount:", totalAmount)
        
        // EMERGENCY: Force update with multiple approaches
        console.log("BillingService: EMERGENCY - Force updating bill total amount...")
        
        // Approach 1: Standard update
        console.log("BillingService: Approach 1 - Standard update...")
        const { error: updateError1 } = await this.supabase
          .from('bills')
          .update({ 
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', bill.id)
        
        if (updateError1) {
          console.error("BillingService: Standard update failed:", updateError1)
        } else {
          console.log("BillingService: Standard update completed")
        }
        
        // Approach 2: Force update with RPC call
        console.log("BillingService: Approach 2 - RPC force update...")
        try {
          const { error: rpcError } = await this.supabase.rpc('force_update_bill_total', {
            bill_id: bill.id,
            new_total: totalAmount
          })
          
          if (rpcError) {
            console.error("BillingService: RPC update failed:", rpcError)
          } else {
            console.log("BillingService: RPC update completed")
          }
        } catch (rpcError) {
          console.error("BillingService: RPC error:", rpcError)
        }
        
        // Approach 3: Direct SQL execution
        console.log("BillingService: Approach 3 - Direct SQL execution...")
        try {
          const { error: sqlError } = await this.supabase
            .from('bills')
            .update({ 
              total_amount: totalAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', bill.id)
            .select()
          
          if (sqlError) {
            console.error("BillingService: Direct SQL failed:", sqlError)
          } else {
            console.log("BillingService: Direct SQL completed")
          }
        } catch (sqlError) {
          console.error("BillingService: Direct SQL error:", sqlError)
        }
        
        // Wait for database to process
        console.log("BillingService: Waiting for database to process...")
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Final verification
        console.log("BillingService: Final verification...")
        const { data: finalBill, error: finalError } = await this.supabase
          .from('bills')
          .select('total_amount')
          .eq('id', bill.id)
          .single()
        
        if (finalError) {
          console.error("BillingService: Final verification error:", finalError)
        } else {
          console.log("BillingService: Final bill total in database:", finalBill?.total_amount)
          
          if (finalBill?.total_amount === totalAmount) {
            console.log("BillingService: ✅ Total amount successfully updated!")
          } else {
            console.log(`BillingService: ❌ Total mismatch. Expected: ${totalAmount}, Got: ${finalBill?.total_amount}`)
            console.log("BillingService: This indicates a critical database issue")
          }
        }
    }

    // Return the complete bill with items
      return await this.getBillById(bill.id)
    } catch (error) {
      console.error("BillingService: Error in createBill:", error)
      throw error
    }
  }

  // Get bill by ID with related data
  async getBillById(billId: string): Promise<Bill> {
    const { data: bill, error: billError } = await this.supabase
      .from('bills')
      .select(`
        *,
        patient:patients(id, first_name, last_name, mrn, contact),
        created_by_user:users!bills_created_by_fkey(id, full_name, role),
        items:bill_items(*),
        payments:payment_history(
          *,
          paid_by_user:users!payment_history_paid_by_fkey(id, full_name, role)
        )
      `)
      .eq('id', billId)
      .single()

    if (billError) {
      console.error("BillingService: Error fetching bill:", billError)
      throw billError
    }
    
    if (!bill) {
      console.error("BillingService: No bill found with ID:", billId)
      throw new Error(`Bill with ID ${billId} not found`)
    }
    
    return bill
  }

  // Get bills with filters and pagination
  async getBills(
    filters: BillingFilters = {},
    page: number = 1,
    limit: number = 20,
    userRole: string,
    userId: string
  ): Promise<{ bills: Bill[], total: number }> {
    console.log("BillingService: Getting bills with params:", {
      filters,
      page,
      limit,
      userRole,
      userId
    })

    let query = this.supabase
      .from('bills')
      .select(`
        *,
        patient:patients(id, first_name, last_name, mrn, contact),
        created_by_user:users!bills_created_by_fkey(id, full_name, role),
        items:bill_items(*),
        payments:payment_history(
          *,
          paid_by_user:users!payment_history_paid_by_fkey(id, full_name, role)
        )
      `, { count: 'exact' })

    // Apply role-based filtering
    const permissions = getBillingPermissions(userRole)
    console.log("BillingService: User permissions:", permissions)
    
    if (userRole === 'patient') {
      // Patients can only see their own bills
      console.log("BillingService: Filtering for patient bills")
      query = query.eq('patient_id', userId)
    } else if (userRole === 'lab_technician') {
      // Lab technicians cannot see bills
      console.log("BillingService: Lab technicians cannot view bills")
      query = query.eq('id', '00000000-0000-0000-0000-000000000000') // Return no results
    }
    // Admins, receptionists, doctors, nurses, and accountants can see all bills (uniform access)

    // Apply filters
    if (filters.patient_id) {
      query = query.eq('patient_id', filters.patient_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.payment_method) {
      query = query.eq('payment_method', filters.payment_method)
    }
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    console.log("BillingService: Executing bills query...")
    const { data: bills, error, count } = await query

    console.log("BillingService: Bills query result:", {
      billsCount: bills?.length || 0,
      totalCount: count,
      error: error?.message || null,
      hasData: !!bills,
      hasError: !!error
    })
    
    // Debug patient data
    if (bills && bills.length > 0) {
      console.log("BillingService: Sample bill patient data:", {
        billId: bills[0].id,
        patientId: bills[0].patient_id,
        patient: bills[0].patient,
        patientMRN: bills[0].patient?.mrn,
        patientName: bills[0].patient ? `${bills[0].patient.first_name} ${bills[0].patient.last_name}` : 'No patient data'
      })
    }

    if (error) {
      console.error("BillingService: Error fetching bills:", error)
      console.error("BillingService: Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    const result = {
      bills: bills || [],
      total: count || 0
    }
    
    console.log("BillingService: Returning result:", result)
    return result
  }

  // Update bill
  async updateBill(billId: string, request: UpdateBillRequest, userRole: string): Promise<Bill> {
    const permissions = getBillingPermissions(userRole)
    
    if (!permissions.canEditBill) {
      throw new Error('Insufficient permissions to edit bill')
    }

    // Check if bill can be edited (not paid)
    const { data: bill, error: billError } = await this.supabase
      .from('bills')
      .select('status')
      .eq('id', billId)
      .single()

    if (billError) throw billError
    if (bill.status === 'paid') {
      throw new Error('Cannot edit paid bills')
    }

    // Update bill basic info
    const updateData: any = {}
    if (request.notes !== undefined) updateData.notes = request.notes
    if (request.status !== undefined) updateData.status = request.status

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await this.supabase
        .from('bills')
        .update(updateData)
        .eq('id', billId)

      if (updateError) throw updateError
    }

    // Update bill items if provided
    if (request.items) {
      // Delete existing items
      const { error: deleteError } = await this.supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId)

      if (deleteError) throw deleteError

      // Insert new items
      if (request.items.length > 0) {
        const items = request.items.map(item => ({
          ...item,
          bill_id: billId,
          total_price: item.quantity * item.unit_price
        }))

        const { error: itemsError } = await this.supabase
          .from('bill_items')
          .insert(items)

        if (itemsError) throw itemsError
      }
    }

    return this.getBillById(billId)
  }

  // Record payment
  async recordPayment(request: RecordPaymentRequest, userId: string, userRole: string): Promise<PaymentHistory> {
    const permissions = getBillingPermissions(userRole)
    
    if (!permissions.canRecordPayment) {
      throw new Error('Insufficient permissions to record payment')
    }

    console.log("BillingService: Recording payment for bill:", request.bill_id)

    // Check if a payment with the same amount and timestamp already exists (within 10 seconds)
    const recentTimestamp = new Date(Date.now() - 10000).toISOString()
    const { data: recentPayments, error: recentError } = await this.supabase
      .from('payment_history')
      .select('id, amount, paid_at, paid_by')
      .eq('bill_id', request.bill_id)
      .eq('amount', request.amount)
      .eq('paid_by', userId)
      .gte('paid_at', recentTimestamp)

    if (recentError) {
      console.error("BillingService: Error checking recent payments:", recentError)
    } else if (recentPayments && recentPayments.length > 0) {
      console.log("BillingService: Duplicate payment detected, skipping:", recentPayments)
      throw new Error("A payment with the same amount was recently recorded by you. Please wait a moment before trying again.")
    }

    // Get current bill status
    const { data: bill, error: billError } = await this.supabase
      .from('bills')
      .select('total_amount, paid_amount, status')
      .eq('id', request.bill_id)
      .single()

    if (billError) throw billError

    // Check if payment amount is valid
    const remainingAmount = bill.total_amount - bill.paid_amount
    if (request.amount > remainingAmount) {
      throw new Error('Payment amount exceeds remaining balance')
    }

    console.log("BillingService: Payment details:", {
      amount: request.amount,
      remaining: remainingAmount,
      currentStatus: bill.status
    })

    // Record payment
    const { data: payment, error: paymentError } = await this.supabase
      .from('payment_history')
      .insert({
        bill_id: request.bill_id,
        paid_by: userId,
        amount: request.amount,
        payment_method: request.payment_method,
        notes: request.notes
      })
      .select(`
        *,
        paid_by_user:users!payment_history_paid_by_fkey(id, full_name, role)
      `)
      .single()

    if (paymentError) {
      console.error("BillingService: Error recording payment:", paymentError)
      throw paymentError
    }

    console.log("BillingService: Payment recorded successfully:", payment.id)

    // Get current bill state before any updates
    const { data: currentBill, error: currentBillError } = await this.supabase
      .from('bills')
      .select('status, paid_amount, total_amount')
      .eq('id', request.bill_id)
      .single()

    if (currentBillError) {
      console.error("BillingService: Error getting current bill state:", currentBillError)
    } else {
      console.log("BillingService: Current bill state:", {
        status: currentBill?.status,
        paidAmount: currentBill?.paid_amount,
        totalAmount: currentBill?.total_amount
      })
    }

    // Let the database trigger handle the paid_amount and status calculation
    // The trigger will automatically update the bill based on payment_history
    console.log("BillingService: Payment recorded, database trigger will update bill status and paid amount")

    // Payment notification will be handled at the application level
    // Database trigger will automatically update bill status and paid amount

    return payment
  }


  // Get billing statistics
  async getBillingStats(userRole: string, userId: string): Promise<BillingStats> {
    console.log("BillingService: Getting billing stats for:", { userRole, userId })
    
    let query = this.supabase.from('bills').select('*')

    // Apply role-based filtering
    if (userRole === 'patient') {
      console.log("BillingService: Filtering stats for patient")
      query = query.eq('patient_id', userId)
    } else if (userRole === 'lab_technician') {
      // Lab technicians cannot see bills
      console.log("BillingService: Lab technicians cannot view stats")
      query = query.eq('id', '00000000-0000-0000-0000-000000000000') // Return no results
    }
    // Admins, receptionists, doctors, nurses, and accountants can see all bills (uniform access)

    // Get basic stats
    console.log("BillingService: Executing stats query...")
    const { data: bills, error } = await query
    
    console.log("BillingService: Stats query result:", {
      billsCount: bills?.length || 0,
      error: error?.message || null
    })
    
    if (error) {
      console.error("BillingService: Error fetching stats:", error)
      throw error
    }

    const totalBills = bills.length
    const totalRevenue = bills
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + Number(bill.total_amount), 0)
    
    const pendingAmount = bills
      .filter(bill => bill.status === 'pending')
      .reduce((sum, bill) => sum + Number(bill.total_amount), 0)
    
    const partialAmount = bills
      .filter(bill => bill.status === 'partial')
      .reduce((sum, bill) => sum + Number(bill.total_amount - bill.paid_amount), 0)
    
    const cancelledAmount = bills
      .filter(bill => bill.status === 'cancelled')
      .reduce((sum, bill) => sum + Number(bill.total_amount), 0)

    const averageBillAmount = totalBills > 0 ? totalRevenue / totalBills : 0

    // Bills by status
    const billsByStatus = {
      pending: bills.filter(bill => bill.status === 'pending').length,
      paid: bills.filter(bill => bill.status === 'paid').length,
      partial: bills.filter(bill => bill.status === 'partial').length,
      cancelled: bills.filter(bill => bill.status === 'cancelled').length,
    }

    // Revenue by month (last 12 months)
    const revenueByMonth = this.calculateRevenueByMonth(bills)

    return {
      totalBills,
      totalRevenue,
      pendingAmount,
      partialAmount,
      cancelledAmount,
      averageBillAmount,
      billsByStatus,
      revenueByMonth
    }
  }

  // Delete bill (admin only)
  async deleteBill(billId: string, userRole: string): Promise<void> {
    const permissions = getBillingPermissions(userRole)
    
    if (!permissions.canDeleteBill) {
      throw new Error('Insufficient permissions to delete bill')
    }

    const { error } = await this.supabase
      .from('bills')
      .delete()
      .eq('id', billId)

    if (error) throw error
  }

  // Test method to verify database state
  async testDatabaseState(billId: string): Promise<any> {
    console.log("BillingService: Testing database state for bill:", billId)
    
    try {
      // Get bill details
      const { data: bill, error: billError } = await this.supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single()

      if (billError) {
        console.error("BillingService: Error fetching bill:", billError)
        return { error: billError }
      }

      // Get payment history
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('bill_id', billId)

      if (paymentsError) {
        console.error("BillingService: Error fetching payments:", paymentsError)
        return { error: paymentsError }
      }

      const totalPayments = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0
      
      const result = {
        bill: {
          id: bill.id,
          status: bill.status,
          total_amount: bill.total_amount,
          paid_amount: bill.paid_amount
        },
        payments: payments || [],
        totalPayments,
        expectedStatus: totalPayments >= bill.total_amount ? 'paid' : 
                      totalPayments > 0 ? 'partial' : 'pending',
        statusMatches: bill.status === (totalPayments >= bill.total_amount ? 'paid' : 
                                      totalPayments > 0 ? 'partial' : 'pending')
      }

      console.log("BillingService: Database state test result:", result)
      return result
    } catch (error) {
      console.error("BillingService: Error in testDatabaseState:", error)
      return { error }
    }
  }

  // Helper method to calculate revenue by month
  private calculateRevenueByMonth(bills: any[]): Array<{ month: string, revenue: number, bills: number }> {
    const monthlyData: Record<string, { revenue: number, bills: number }> = {}
    
    bills.forEach(bill => {
      const date = new Date(bill.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, bills: 0 }
      }
      
      if (bill.status === 'paid') {
        monthlyData[monthKey].revenue += Number(bill.total_amount)
      }
      monthlyData[monthKey].bills += 1
    })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        bills: data.bills
      }))
  }
}

// Export singleton instance
export const billingService = new BillingService()
