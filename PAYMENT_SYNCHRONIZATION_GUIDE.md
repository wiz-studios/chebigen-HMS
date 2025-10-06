# Payment Synchronization System

## Overview

The Payment Synchronization System ensures that when a payment is recorded by an accountant, the payment status is automatically updated across the entire Hospital Management System (HMS). This includes database updates, real-time frontend refreshes, and notifications to relevant users.

## System Architecture

### 1. Database Layer
- **Triggers**: Automatic database triggers update bill status when payments are recorded
- **Functions**: PostgreSQL functions handle status calculations and notifications
- **RLS Policies**: Row Level Security ensures proper access control

### 2. API Layer
- **BillingService**: Enhanced with notification creation and status verification
- **PaymentSyncService**: Dedicated service for real-time payment synchronization
- **Real-time Subscriptions**: Supabase real-time channels for instant updates

### 3. Frontend Layer
- **Enhanced Billing Dashboard**: Real-time payment updates
- **Staff Dashboard**: System-wide payment notifications
- **Notification Center**: User-specific payment alerts

## Key Components

### Database Triggers (`scripts/PAYMENT_STATUS_TRIGGERS.sql`)

```sql
-- Automatic bill status updates
CREATE TRIGGER trigger_update_bill_payment_status_insert
    AFTER INSERT ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

-- Payment notifications
CREATE TRIGGER trigger_create_payment_notification
    AFTER INSERT ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_notification();
```

### Payment Sync Service (`lib/supabase/payment-sync.ts`)

```typescript
// Subscribe to system-wide payment updates
const unsubscribe = paymentSyncService.subscribeToSystemPayments((event) => {
  switch (event.type) {
    case 'payment_recorded':
    case 'bill_status_changed':
      // Refresh dashboard data
      loadData()
      break
  }
})
```

### Enhanced Billing Service (`lib/supabase/billing.ts`)

```typescript
// Record payment with system-wide updates
async recordPayment(request: RecordPaymentRequest, userId: string, userRole: string) {
  // 1. Record payment in database
  const payment = await this.supabase.from('payment_history').insert(...)
  
  // 2. Update bill status and paid amount
  await this.supabase.from('bills').update({ status, paid_amount })
  
  // 3. Create notification for system-wide awareness
  await this.createPaymentNotification(payment, bill, newStatus, userId)
  
  // 4. Verify updates worked correctly
  await this.verifyBillUpdate(request.bill_id)
}
```

## Payment Flow

### 1. Payment Recording
```
Accountant clicks "Record Payment" 
    ↓
PaymentDialog validates and submits
    ↓
BillingService.recordPayment() executes
    ↓
Database triggers fire automatically
    ↓
Real-time subscriptions notify all dashboards
    ↓
Notifications created for relevant users
```

### 2. Status Updates
```
Payment recorded in payment_history
    ↓
Database trigger updates bills table
    ↓
Bill status: pending → partial → paid
    ↓
Real-time channels broadcast changes
    ↓
All dashboards refresh automatically
```

### 3. Notifications
```
Payment recorded
    ↓
createPaymentNotification() called
    ↓
Notification inserted for recording user
    ↓
Real-time subscription updates notification count
    ↓
Notification bell shows new alert
```

## Real-time Synchronization

### Dashboard Updates
- **Billing Dashboard**: Refreshes when payments are recorded
- **Staff Dashboard**: Updates stats and recent activities
- **All Dashboards**: Receive real-time payment notifications

### Subscription Channels
```typescript
// System-wide payment updates
paymentSyncService.subscribeToSystemPayments(callback)

// Bill-specific updates
paymentSyncService.subscribeToBillUpdates(billId, callback)

// User-specific payment updates
paymentSyncService.subscribeToUserPayments(userId, callback)
```

## Database Functions

### `update_bill_payment_status()`
- Automatically calculates total paid amount
- Updates bill status (pending/partial/paid)
- Updates paid_amount field
- Logs status changes

### `create_payment_notification()`
- Creates notification for payment recording user
- Includes payment details and patient information
- Links to bill and payment records

### `get_bill_payment_summary(bill_uuid)`
- Returns comprehensive payment summary
- Includes total amount, paid amount, remaining amount
- Shows payment count and last payment date

## Testing

### Manual Testing
1. **Record Payment**: Use accountant account to record a payment
2. **Check Status**: Verify bill status updates to 'partial' or 'paid'
3. **Dashboard Refresh**: Confirm all dashboards show updated information
4. **Notifications**: Verify notification appears in notification center

### Automated Testing
Run the test script: `scripts/TEST_PAYMENT_SYNCHRONIZATION.sql`

```sql
-- Test payment recording and status updates
INSERT INTO payment_history (bill_id, paid_by, amount, payment_method)
VALUES (bill_id, user_id, 500.00, 'cash');

-- Verify status update
SELECT status, paid_amount FROM bills WHERE id = bill_id;
```

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup
1. Run `scripts/PAYMENT_STATUS_TRIGGERS.sql` to create triggers
2. Run `scripts/TEST_PAYMENT_SYNCHRONIZATION.sql` to verify setup
3. Ensure RLS policies are enabled for security

## Troubleshooting

### Common Issues

#### 1. Payment Status Not Updating
- **Check**: Database triggers are installed
- **Solution**: Run `PAYMENT_STATUS_TRIGGERS.sql`
- **Verify**: `SELECT * FROM pg_trigger WHERE tgname LIKE '%payment%'`

#### 2. Real-time Updates Not Working
- **Check**: Supabase real-time is enabled
- **Solution**: Verify channel subscriptions in browser console
- **Debug**: Check for WebSocket connection errors

#### 3. Notifications Not Appearing
- **Check**: Notification table has proper RLS policies
- **Solution**: Verify user permissions and notification creation
- **Debug**: Check notification table for new entries

### Debug Commands

```sql
-- Check trigger status
SELECT * FROM pg_trigger WHERE tgname LIKE '%payment%';

-- Verify bill statuses
SELECT status, COUNT(*) FROM bills GROUP BY status;

-- Check recent payments
SELECT * FROM payment_history ORDER BY paid_at DESC LIMIT 10;

-- Check notifications
SELECT * FROM notifications WHERE type = 'payment' ORDER BY created_at DESC LIMIT 10;
```

## Performance Considerations

### Database Optimization
- Triggers are optimized for minimal performance impact
- Indexes on `bill_id` and `paid_by` columns
- Efficient status calculation functions

### Real-time Optimization
- Selective subscription filtering
- Debounced update calls
- Efficient payload structures

### Frontend Optimization
- Lazy loading of payment data
- Efficient re-rendering strategies
- Optimized subscription management

## Security

### Row Level Security (RLS)
- Users can only see their own notifications
- Payment history access based on user role
- Bill updates restricted to authorized users

### Data Validation
- Payment amount validation
- User permission checks
- Bill status consistency verification

## Monitoring

### Key Metrics
- Payment recording success rate
- Status update accuracy
- Real-time update latency
- Notification delivery rate

### Logging
- Payment recording events
- Status update triggers
- Real-time subscription events
- Error tracking and debugging

## Future Enhancements

### Planned Features
- Payment receipt generation
- Automated payment reminders
- Integration with external payment gateways
- Advanced payment analytics

### Scalability Improvements
- Payment batch processing
- Asynchronous notification delivery
- Cached payment summaries
- Optimized real-time subscriptions

## Support

For issues or questions about the payment synchronization system:

1. Check the troubleshooting section above
2. Review the test scripts for expected behavior
3. Examine browser console for real-time subscription errors
4. Verify database trigger installation and function execution

The system is designed to be robust and self-healing, with automatic status updates and real-time synchronization across all components of the HMS.
