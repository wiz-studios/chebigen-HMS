-- Cleanup Notification Triggers
-- This script removes any remaining notification-related triggers and functions

-- Drop notification trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_payment_notification ON payment_history;

-- Drop notification function if it exists
DROP FUNCTION IF EXISTS create_payment_notification();

-- Verify cleanup
SELECT 
    'Cleanup Complete' as status,
    'All notification triggers and functions removed' as message;
