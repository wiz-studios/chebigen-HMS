// Payment Synchronization Service
// Ensures payment status updates are reflected system-wide

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface PaymentSyncEvent {
  type: 'payment_recorded' | 'payment_updated' | 'payment_deleted' | 'bill_status_changed'
  billId: string
  paymentId?: string
  amount?: number
  status?: string
  timestamp: string
}

export class PaymentSyncService {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()

  // Subscribe to payment updates for a specific bill
  subscribeToBillUpdates(billId: string, callback: (event: PaymentSyncEvent) => void): () => void {
    const channelName = `bill-${billId}-updates`
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromBillUpdates(billId)
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_history',
          filter: `bill_id=eq.${billId}`
        },
        (payload) => {
          const event: PaymentSyncEvent = {
            type: payload.eventType === 'INSERT' ? 'payment_recorded' : 
                  payload.eventType === 'UPDATE' ? 'payment_updated' : 'payment_deleted',
            billId: payload.new?.bill_id || payload.old?.bill_id,
            paymentId: payload.new?.id || payload.old?.id,
            amount: payload.new?.amount || payload.old?.amount,
            timestamp: new Date().toISOString()
          }
          callback(event)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bills',
          filter: `id=eq.${billId}`
        },
        (payload) => {
          const event: PaymentSyncEvent = {
            type: 'bill_status_changed',
            billId: payload.new.id,
            status: payload.new.status,
            timestamp: new Date().toISOString()
          }
          callback(event)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromBillUpdates(billId)
  }

  // Subscribe to all payment updates for a user
  subscribeToUserPayments(userId: string, callback: (event: PaymentSyncEvent) => void): () => void {
    const channelName = `user-${userId}-payments`
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromUserPayments(userId)
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_history',
          filter: `paid_by=eq.${userId}`
        },
        (payload) => {
          const event: PaymentSyncEvent = {
            type: payload.eventType === 'INSERT' ? 'payment_recorded' : 
                  payload.eventType === 'UPDATE' ? 'payment_updated' : 'payment_deleted',
            billId: payload.new?.bill_id || payload.old?.bill_id,
            paymentId: payload.new?.id || payload.old?.id,
            amount: payload.new?.amount || payload.old?.amount,
            timestamp: new Date().toISOString()
          }
          callback(event)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromUserPayments(userId)
  }

  // Subscribe to system-wide payment updates
  subscribeToSystemPayments(callback: (event: PaymentSyncEvent) => void): () => void {
    const channelName = 'system-payments'
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromSystemPayments()
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_history'
        },
        (payload) => {
          const event: PaymentSyncEvent = {
            type: payload.eventType === 'INSERT' ? 'payment_recorded' : 
                  payload.eventType === 'UPDATE' ? 'payment_updated' : 'payment_deleted',
            billId: payload.new?.bill_id || payload.old?.bill_id,
            paymentId: payload.new?.id || payload.old?.id,
            amount: payload.new?.amount || payload.old?.amount,
            timestamp: new Date().toISOString()
          }
          callback(event)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bills'
        },
        (payload) => {
          // Only trigger if status or paid_amount changed
          if (payload.new.status !== payload.old.status || 
              payload.new.paid_amount !== payload.old.paid_amount) {
            const event: PaymentSyncEvent = {
              type: 'bill_status_changed',
              billId: payload.new.id,
              status: payload.new.status,
              timestamp: new Date().toISOString()
            }
            callback(event)
          }
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromSystemPayments()
  }

  // Unsubscribe from specific bill updates
  private unsubscribeFromBillUpdates(billId: string): void {
    const channelName = `bill-${billId}-updates`
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Unsubscribe from user payment updates
  private unsubscribeFromUserPayments(userId: string): void {
    const channelName = `user-${userId}-payments`
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Unsubscribe from system payment updates
  private unsubscribeFromSystemPayments(): void {
    const channelName = 'system-payments'
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // Get payment summary for a bill
  async getBillPaymentSummary(billId: string): Promise<{
    billId: string
    totalAmount: number
    paidAmount: number
    remainingAmount: number
    status: string
    paymentCount: number
    lastPaymentDate?: string
  }> {
    const { data, error } = await this.supabase.rpc('get_bill_payment_summary', {
      bill_uuid: billId
    })

    if (error) {
      console.error('PaymentSyncService: Error getting payment summary:', error)
      throw error
    }

    return data?.[0] || {
      billId,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      status: 'pending',
      paymentCount: 0
    }
  }

  // Force refresh all bill statuses
  async refreshAllBillStatuses(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('fix_all_bill_statuses')
      if (error) {
        console.error('PaymentSyncService: Error refreshing bill statuses:', error)
        throw error
      }
      console.log('PaymentSyncService: All bill statuses refreshed successfully')
    } catch (error) {
      console.error('PaymentSyncService: Error in refreshAllBillStatuses:', error)
      throw error
    }
  }
}

// Export singleton instance
export const paymentSyncService = new PaymentSyncService()
