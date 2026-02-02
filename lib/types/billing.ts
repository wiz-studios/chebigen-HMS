// Enhanced Billing System Types
// Based on comprehensive billing module specification

export type BillStatus = 'pending' | 'paid' | 'partial' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'insurance'
export type ItemType = 'appointment' | 'lab_test' | 'procedure' | 'medication'

export interface Bill {
  id: string
  patient_id: string
  created_by: string
  created_at: string
  status: BillStatus
  total_amount: number
  paid_amount: number
  payment_method?: PaymentMethod
  notes?: string
  updated_at: string
  // Related data
  patient?: {
    id: string
    first_name: string
    last_name: string
    mrn: string
    contact?: string
  }
  created_by_user?: {
    id: string
    full_name: string
    role: string
  }
  items?: BillItem[]
  payments?: PaymentHistory[]
}

export interface BillItem {
  id: string
  bill_id: string
  item_type: ItemType
  description: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface PaymentHistory {
  id: string
  bill_id: string
  paid_by: string
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  notes?: string
  // Related data
  paid_by_user?: {
    id: string
    full_name: string
    role: string
  }
}

export interface CreateBillRequest {
  patient_id: string
  items: Omit<BillItem, 'id' | 'bill_id' | 'created_at'>[]
  notes?: string
}

export interface UpdateBillRequest {
  items?: Omit<BillItem, 'id' | 'bill_id' | 'created_at'>[]
  notes?: string
  status?: BillStatus
}

export interface RecordPaymentRequest {
  bill_id: string
  amount: number
  payment_method: PaymentMethod
  notes?: string
}

export interface BillingStats {
  totalBills: number
  totalRevenue: number
  pendingAmount: number
  partialAmount: number
  cancelledAmount: number
  averageBillAmount: number
  billsByStatus: {
    pending: number
    paid: number
    partial: number
    cancelled: number
  }
  revenueByMonth: Array<{
    month: string
    revenue: number
    bills: number
  }>
}

export interface BillingFilters {
  patient_id?: string
  status?: BillStatus
  payment_method?: PaymentMethod
  date_from?: string
  date_to?: string
  created_by?: string
}

export interface BillingPermissions {
  canCreateBill: boolean
  canViewBill: boolean
  canEditBill: boolean
  canRecordPayment: boolean
  canGenerateReports: boolean
  canDeleteBill: boolean
}

// Role-based permissions mapping - Updated to match comprehensive billing specification
export const BILLING_PERMISSIONS: Record<string, BillingPermissions> = {
  admin: {
    canCreateBill: true,
    canViewBill: true,
    canEditBill: true,
    canRecordPayment: true,
    canGenerateReports: true,
    canDeleteBill: true,
  },
  superadmin: {
    canCreateBill: true,
    canViewBill: true,
    canEditBill: true,
    canRecordPayment: true,
    canGenerateReports: true,
    canDeleteBill: true,
  },
  receptionist: {
    canCreateBill: true, // ✅ Create basic bills, add registration/consultation fees
    canViewBill: true, // ✅ View payment history for assigned patients
    canEditBill: true, // ✅ Can edit bills before finalization
    canRecordPayment: false, // ❌ Cannot finalize bills or record payments
    canGenerateReports: false,
    canDeleteBill: false,
  },
  doctor: {
    canCreateBill: true, // 🔸 Auto-generates billing entries when completing consultation
    canViewBill: true, // 🔸 Can view bills for their patients
    canEditBill: false, // ❌ Cannot edit totals or finalize
    canRecordPayment: false, // ❌ Cannot record payments
    canGenerateReports: false,
    canDeleteBill: false,
  },
  nurse: {
    canCreateBill: true, // 🔸 Adds billed services automatically (injection, vitals check)
    canViewBill: true, // 🔸 Can view patient bills
    canEditBill: false, // ❌ Cannot finalize bills
    canRecordPayment: false, // ❌ Cannot record payments
    canGenerateReports: false,
    canDeleteBill: false,
  },
  lab_tech: {
    canCreateBill: true, // 🔸 Adds cost for lab tests performed
    canViewBill: true, // ✅ Can view patient bills to confirm test billing
    canEditBill: false, // ❌ Cannot edit or finalize
    canRecordPayment: false, // ❌ Cannot record payments
    canGenerateReports: false,
    canDeleteBill: false,
  },
  accountant: {
    canCreateBill: true, // ✅ Full billing access (create/edit/finalize)
    canViewBill: true, // ✅ Can see all bills for accounting
    canEditBill: true, // ✅ Can edit and finalize bills
    canRecordPayment: true, // ✅ Mark bills as paid, initiate M-PESA STK push
    canGenerateReports: true, // ✅ Manage discounts/taxes, generate reports
    canDeleteBill: false, // ❌ Cannot delete bills (audit trail)
  },
  patient: {
    canCreateBill: false,
    canViewBill: true, // ✅ Only their own bills
    canEditBill: false,
    canRecordPayment: false,
    canGenerateReports: false,
    canDeleteBill: false,
  },
}

export function getBillingPermissions(userRole: string): BillingPermissions {
  return BILLING_PERMISSIONS[userRole] || {
    canCreateBill: false,
    canViewBill: false,
    canEditBill: false,
    canRecordPayment: false,
    canGenerateReports: false,
    canDeleteBill: false,
  }
}
