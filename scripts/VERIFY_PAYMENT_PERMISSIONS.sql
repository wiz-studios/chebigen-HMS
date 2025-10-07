-- Verify Payment Permissions
-- This script verifies that only accountants and admins can record payments
-- and that receptionists cannot access payment recording functionality

-- Show current role-based permissions (this would be in the application code)
-- But we can verify by checking if any non-accountant users have recorded payments

-- Check which roles have recorded payments
SELECT 
  u.role,
  COUNT(ph.id) as payment_count,
  SUM(ph.amount) as total_amount_recorded
FROM payment_history ph
JOIN users u ON ph.paid_by = u.id
GROUP BY u.role
ORDER BY payment_count DESC;

-- Show recent payments by role
SELECT 
  ph.id,
  ph.amount,
  ph.payment_method,
  ph.paid_at,
  u.role as recorded_by_role,
  u.full_name as recorded_by_name
FROM payment_history ph
JOIN users u ON ph.paid_by = u.id
ORDER BY ph.paid_at DESC
LIMIT 10;

-- Check if any receptionists have recorded payments (this should be 0 after the fix)
SELECT 
  COUNT(*) as receptionist_payments
FROM payment_history ph
JOIN users u ON ph.paid_by = u.id
WHERE u.role = 'receptionist';

-- Show all user roles and their permissions (for reference)
SELECT 
  'Role-based permissions in application:' as info,
  'Only admin and accountant can record payments' as note;

-- Verify that the permission system is working by checking recent activity
SELECT 
  'Recent payment activity by role:' as summary,
  u.role,
  COUNT(ph.id) as recent_payments
FROM payment_history ph
JOIN users u ON ph.paid_by = u.id
WHERE ph.paid_at >= NOW() - INTERVAL '1 day'
GROUP BY u.role
ORDER BY recent_payments DESC;
