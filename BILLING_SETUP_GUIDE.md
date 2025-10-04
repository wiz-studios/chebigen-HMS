# Enhanced Billing System Setup Guide

This guide explains how to set up the comprehensive billing system for the Hospital Management System (HMS) based on the detailed specification provided.

## Overview

The enhanced billing system includes:
- **Role-based permissions** for different user types
- **Detailed bill items** with multiple types (appointments, lab tests, procedures, medications)
- **Payment tracking** with history and partial payments
- **Comprehensive reporting** with analytics and charts
- **Automated calculations** for bill totals and status updates

## Database Setup

### 1. Run the Enhanced Billing System Script

Execute the following SQL script in your PostgreSQL database:

```sql
-- Run this in your PostgreSQL database
\i scripts/044_enhanced_billing_system.sql
```

Or if you prefer to run it directly:

```bash
psql -h localhost -U postgres -d hospital_management -f scripts/044_enhanced_billing_system.sql
```

### 2. Verify Installation

After running the script, verify that the following tables were created:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bills', 'bill_items', 'payment_history');
```

### 3. Test the System

You can test the system by creating a sample bill:

```sql
-- Example: Create a test bill (replace with actual patient and user IDs)
INSERT INTO bills (patient_id, created_by, total_amount, notes)
VALUES (
    'your-patient-id',
    'your-user-id',
    1000.00,
    'Test bill for system verification'
);
```

## Features Implemented

### 1. Database Tables

#### Bills Table
- `id`: Unique bill identifier
- `patient_id`: Link to patient
- `created_by`: User who created the bill
- `status`: pending/paid/partial/cancelled
- `total_amount`: Total bill amount
- `paid_amount`: Amount paid so far
- `payment_method`: cash/card/insurance
- `notes`: Optional notes

#### Bill Items Table
- `id`: Unique item identifier
- `bill_id`: Link to bill
- `item_type`: appointment/lab_test/procedure/medication
- `description`: Item description
- `quantity`: Number of units
- `unit_price`: Price per unit
- `total_price`: Calculated total

#### Payment History Table
- `id`: Unique payment identifier
- `bill_id`: Link to bill
- `paid_by`: User who recorded payment
- `amount`: Payment amount
- `payment_method`: cash/card/insurance
- `paid_at`: Payment timestamp

### 2. Role-Based Permissions

| Role | Create Bill | View Bill | Edit Bill | Record Payment | Generate Reports |
|------|-------------|-----------|-----------|----------------|------------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receptionist | ✅ | ✅ | ✅ (before payment) | ✅ | ❌ |
| Doctor | ✅ (appointments) | ✅ | ❌ | ❌ | ❌ |
| Nurse | ✅ (procedures) | ✅ | ❌ | ❌ | ❌ |
| Lab Technician | ❌ | ❌ | ❌ | ❌ | ❌ |
| Patient | ❌ | ✅ (own bills) | ❌ | ❌ | ❌ |

### 3. Automated Features

- **Automatic total calculation**: Bill totals are updated when items are added/modified
- **Status updates**: Bill status automatically updates based on payment amounts
- **Payment tracking**: All payments are recorded with timestamps and user information

## Frontend Components

### 1. Enhanced Billing Dashboard
- **Location**: `components/billing/enhanced-billing-dashboard.tsx`
- **Features**: 
  - Real-time statistics
  - Role-based access control
  - Quick actions for common tasks

### 2. Bill Management
- **Bill List**: `components/billing/bill-list.tsx`
- **Create Bill**: `components/billing/create-bill-dialog.tsx`
- **Payment Dialog**: `components/billing/payment-dialog.tsx`

### 3. Reporting & Analytics
- **Reports**: `components/billing/billing-reports.tsx`
- **Features**:
  - Revenue trends
  - Bill status distribution
  - Monthly analytics
  - Payment method breakdown

## API Functions

### 1. Billing Service
- **Location**: `lib/supabase/billing.ts`
- **Methods**:
  - `createBill()`: Create new bills
  - `getBills()`: Retrieve bills with filtering
  - `updateBill()`: Modify existing bills
  - `recordPayment()`: Record payments
  - `getBillingStats()`: Get analytics data

### 2. Type Definitions
- **Location**: `lib/types/billing.ts`
- **Includes**: All TypeScript interfaces and types for the billing system

## Usage Examples

### 1. Creating a Bill

```typescript
const billData = {
  patient_id: "patient-uuid",
  items: [
    {
      item_type: "appointment",
      description: "General consultation",
      quantity: 1,
      unit_price: 2000.00
    },
    {
      item_type: "lab_test",
      description: "Blood test",
      quantity: 1,
      unit_price: 500.00
    }
  ],
  notes: "Regular checkup"
}

await billingService.createBill(billData, userId)
```

### 2. Recording a Payment

```typescript
const paymentData = {
  bill_id: "bill-uuid",
  amount: 1000.00,
  payment_method: "cash",
  notes: "Partial payment"
}

await billingService.recordPayment(paymentData, userId, userRole)
```

### 3. Getting Billing Statistics

```typescript
const stats = await billingService.getBillingStats(userRole, userId)
console.log(`Total Revenue: ${stats.totalRevenue}`)
console.log(`Pending Amount: ${stats.pendingAmount}`)
```

## Security Features

### 1. Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce role-based access
- Users can only access data they're authorized to see

### 2. Data Validation
- Input validation on all forms
- Server-side validation in API functions
- Type safety with TypeScript

### 3. Audit Trail
- All payments are tracked with user information
- Bill modifications are logged
- Timestamps on all operations

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role and permissions
   - Verify RLS policies are working correctly

2. **Bill Total Not Updating**
   - Check if triggers are installed correctly
   - Verify `update_bill_total()` function exists

3. **Payment Recording Issues**
   - Ensure payment amount doesn't exceed remaining balance
   - Check if user has permission to record payments

### Verification Commands

```sql
-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE '%bill%';

-- Check RLS policies
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bills', 'bill_items', 'payment_history');

-- Test bill creation
SELECT * FROM bills LIMIT 5;
```

## Next Steps

1. **Run the database migration script**
2. **Test the system with sample data**
3. **Configure user roles and permissions**
4. **Train staff on the new billing system**
5. **Set up regular backups and monitoring**

## Support

If you encounter any issues:
1. Check the database logs for errors
2. Verify all scripts ran successfully
3. Test with sample data first
4. Check user permissions and roles

The enhanced billing system is now ready to handle comprehensive billing operations for your hospital management system!
