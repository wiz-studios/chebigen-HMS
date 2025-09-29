-- Enhanced notification triggers and functions

-- Function to send appointment reminders
CREATE OR REPLACE FUNCTION send_appointment_reminders()
RETURNS INTEGER AS $$
DECLARE
    reminder_count INTEGER := 0;
    appointment_record RECORD;
BEGIN
    -- Send 24-hour reminders
    FOR appointment_record IN
        SELECT a.*, p.user_id as patient_user_id, u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.provider_id = u.id
        WHERE a.scheduled_time BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
        AND a.status = 'scheduled'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.metadata->>'appointment_id' = a.id::text 
            AND n.type = 'appointment' 
            AND n.title LIKE '%24-hour%'
        )
    LOOP
        -- Check if patient has appointment reminders enabled
        IF EXISTS (
            SELECT 1 FROM notification_preferences np 
            WHERE np.user_id = appointment_record.patient_user_id 
            AND np.appointment_reminders = TRUE
        ) THEN
            PERFORM create_notification(
                appointment_record.patient_user_id,
                '24-Hour Appointment Reminder',
                'You have an appointment tomorrow at ' || 
                TO_CHAR(appointment_record.scheduled_time, 'HH12:MI AM') || 
                ' with Dr. ' || appointment_record.doctor_first_name || ' ' || appointment_record.doctor_last_name,
                'appointment',
                'normal',
                '/patient/appointments',
                'View Appointment',
                jsonb_build_object(
                    'appointment_id', appointment_record.id,
                    'reminder_type', '24_hour'
                )
            );
            reminder_count := reminder_count + 1;
        END IF;
    END LOOP;

    -- Send 2-hour reminders
    FOR appointment_record IN
        SELECT a.*, p.user_id as patient_user_id, u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.provider_id = u.id
        WHERE a.scheduled_time BETWEEN NOW() + INTERVAL '1 hour 30 minutes' AND NOW() + INTERVAL '2 hours 30 minutes'
        AND a.status = 'scheduled'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.metadata->>'appointment_id' = a.id::text 
            AND n.type = 'appointment' 
            AND n.title LIKE '%2-hour%'
        )
    LOOP
        -- Check if patient has appointment reminders enabled
        IF EXISTS (
            SELECT 1 FROM notification_preferences np 
            WHERE np.user_id = appointment_record.patient_user_id 
            AND np.appointment_reminders = TRUE
        ) THEN
            PERFORM create_notification(
                appointment_record.patient_user_id,
                '2-Hour Appointment Reminder',
                'Your appointment with Dr. ' || appointment_record.doctor_first_name || ' ' || appointment_record.doctor_last_name || 
                ' is in 2 hours at ' || TO_CHAR(appointment_record.scheduled_time, 'HH12:MI AM'),
                'appointment',
                'normal',
                '/patient/appointments',
                'View Appointment',
                jsonb_build_object(
                    'appointment_id', appointment_record.id,
                    'reminder_type', '2_hour'
                )
            );
            reminder_count := reminder_count + 1;
        END IF;
    END LOOP;

    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for critical lab values
CREATE OR REPLACE FUNCTION check_critical_lab_values()
RETURNS TRIGGER AS $$
DECLARE
    patient_name TEXT;
    doctor_name TEXT;
    patient_user_id UUID;
    ordering_doctor_id UUID;
    is_critical BOOLEAN := FALSE;
    test_name TEXT;
    result_value TEXT;
BEGIN
    -- Extract test information from result_data JSONB
    test_name := COALESCE(NEW.result_data->>'test_name', 'Unknown Test');
    result_value := COALESCE(NEW.result_data->>'value', '0');
    
    -- Define critical value logic (this would be customized based on test types)
    IF test_name ILIKE '%glucose%' AND (result_value::numeric > 400 OR result_value::numeric < 50) THEN
        is_critical := TRUE;
    ELSIF test_name ILIKE '%hemoglobin%' AND result_value::numeric < 7 THEN
        is_critical := TRUE;
    ELSIF test_name ILIKE '%potassium%' AND (result_value::numeric > 6 OR result_value::numeric < 2.5) THEN
        is_critical := TRUE;
    END IF;

    IF is_critical AND NEW.status = 'released' THEN
        -- Get patient and doctor names through orders table
        SELECT CONCAT(p.first_name, ' ', p.last_name), p.user_id, o.provider_id
        INTO patient_name, patient_user_id, ordering_doctor_id
        FROM patients p 
        JOIN orders o ON p.id = o.patient_id 
        WHERE o.id = NEW.order_id;
        
        SELECT CONCAT(full_name) INTO doctor_name
        FROM users WHERE id = ordering_doctor_id;
        
        -- Notify ordering doctor with urgent priority
        PERFORM create_notification(
            ordering_doctor_id,
            'CRITICAL: Lab Results Require Immediate Attention',
            'Critical ' || test_name || ' value (' || result_value || ') for ' || patient_name || '. Immediate review required.',
            'lab_result',
            'urgent',
            '/dashboard',
            'Review Results',
            jsonb_build_object(
                'lab_result_id', NEW.id,
                'order_id', NEW.order_id,
                'critical_value', true,
                'test_name', test_name,
                'result_value', result_value
            )
        );

        -- Also notify department head or on-call physician
        -- This would require additional logic to determine who to notify
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing lab result trigger with the enhanced version
DROP TRIGGER IF EXISTS trigger_lab_result_ready ON lab_results;
CREATE TRIGGER trigger_critical_lab_values
    AFTER UPDATE ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION check_critical_lab_values();

-- Function to check inventory levels and send alerts
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS INTEGER AS $$
DECLARE
    alert_count INTEGER := 0;
    item_record RECORD;
    manager_users UUID[];
BEGIN
    -- Get inventory managers and pharmacists
    SELECT ARRAY_AGG(id) INTO manager_users
    FROM users 
    WHERE role IN ('admin', 'pharmacist', 'superadmin') 
    AND status = 'active';

    -- Check for low stock items
    FOR item_record IN
        SELECT ii.*, ic.name as category_name, s.name as supplier_name,
               COALESCE(SUM(ist.quantity_available), 0) as current_stock
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        LEFT JOIN suppliers s ON ii.supplier_id = s.id
        LEFT JOIN inventory_stock ist ON ii.id = ist.item_id
        WHERE ii.deleted_at IS NULL
        GROUP BY ii.id, ic.name, s.name
        HAVING COALESCE(SUM(ist.quantity_available), 0) <= ii.reorder_level
        AND COALESCE(SUM(ist.quantity_available), 0) > 0
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.metadata->>'inventory_item_id' = ii.id::text 
            AND n.type = 'warning'
            AND n.created_at > NOW() - INTERVAL '24 hours'
        )
    LOOP
        -- Send notification to all managers
        FOR i IN 1..array_length(manager_users, 1) LOOP
            PERFORM create_notification(
                manager_users[i],
                'Low Stock Alert',
                item_record.name || ' is running low. Current stock: ' || 
                item_record.current_stock || ', Reorder point: ' || item_record.reorder_level,
                'warning',
                'normal',
                '/inventory',
                'Manage Inventory',
                jsonb_build_object(
                    'inventory_item_id', item_record.id,
                    'current_stock', item_record.current_stock,
                    'reorder_point', item_record.reorder_level
                )
            );
        END LOOP;
        alert_count := alert_count + 1;
    END LOOP;

    -- Check for expired items
    FOR item_record IN
        SELECT ii.*, ic.name as category_name, ist.expiry_date,
               COALESCE(SUM(ist.quantity_available), 0) as current_stock
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        LEFT JOIN inventory_stock ist ON ii.id = ist.item_id
        WHERE ii.deleted_at IS NULL
        AND ist.expiry_date <= NOW() + INTERVAL '7 days'
        GROUP BY ii.id, ic.name, ist.expiry_date
        HAVING COALESCE(SUM(ist.quantity_available), 0) > 0
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.metadata->>'inventory_item_id' = ii.id::text 
            AND n.type = 'warning'
            AND n.title LIKE '%Expiry%'
            AND n.created_at > NOW() - INTERVAL '24 hours'
        )
    LOOP
        -- Send expiry notification to all managers
        FOR i IN 1..array_length(manager_users, 1) LOOP
            PERFORM create_notification(
                manager_users[i],
                'Item Expiry Alert',
                item_record.name || ' expires on ' || 
                TO_CHAR(item_record.expiry_date, 'Mon DD, YYYY') || 
                '. Current stock: ' || item_record.current_stock,
                'warning',
                'high',
                '/inventory',
                'Manage Inventory',
                jsonb_build_object(
                    'inventory_item_id', item_record.id,
                    'expiry_date', item_record.expiry_date,
                    'current_stock', item_record.current_stock
                )
            );
        END LOOP;
        alert_count := alert_count + 1;
    END LOOP;

    RETURN alert_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send shift handoff notifications
CREATE OR REPLACE FUNCTION send_shift_handoff_notifications()
RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER := 0;
    shift_staff UUID[];
    patient_count INTEGER;
    critical_count INTEGER;
BEGIN
    -- Get current shift staff (nurses, doctors)
    SELECT ARRAY_AGG(id) INTO shift_staff
    FROM users 
    WHERE role IN ('nurse', 'doctor') 
    AND status = 'active';

    -- Get patient counts
    SELECT COUNT(*) INTO patient_count
    FROM encounters 
    WHERE encounter_date::date = CURRENT_DATE;

    SELECT COUNT(*) INTO critical_count
    FROM encounters e
    JOIN patients p ON e.patient_id = p.id
    WHERE e.encounter_date::date = CURRENT_DATE
    AND (e.notes ILIKE '%critical%' OR e.notes ILIKE '%urgent%');

    -- Send handoff notifications
    FOR i IN 1..array_length(shift_staff, 1) LOOP
        PERFORM create_notification(
            shift_staff[i],
            'Shift Handoff - Important Updates',
            'Shift handoff summary: ' || patient_count || ' active patients, ' || 
            critical_count || ' critical cases requiring attention.',
            'info',
            'normal',
            '/dashboard',
            'View Patients',
            jsonb_build_object(
                'patient_count', patient_count,
                'critical_count', critical_count,
                'shift_date', CURRENT_DATE
            )
        );
    END LOOP;

    notification_count := array_length(shift_staff, 1);
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_appointment_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION check_inventory_levels TO authenticated;
GRANT EXECUTE ON FUNCTION send_shift_handoff_notifications TO authenticated;
