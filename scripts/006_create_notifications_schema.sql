-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, success, warning, error, appointment, lab_result, prescription
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500), -- Optional URL for action button
    action_text VARCHAR(100), -- Text for action button
    metadata JSONB DEFAULT '{}', -- Additional data (patient_id, appointment_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration date
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    lab_result_alerts BOOLEAN DEFAULT TRUE,
    prescription_alerts BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_action_url VARCHAR(500) DEFAULT NULL,
    p_action_text VARCHAR(100) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, priority, action_url, action_text, metadata
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_priority, p_action_url, p_action_text, p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = NOW()
    WHERE id = notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Trigger functions for automatic notifications
CREATE OR REPLACE FUNCTION notify_appointment_scheduled()
RETURNS TRIGGER AS $$
DECLARE
    patient_name TEXT;
    doctor_name TEXT;
BEGIN
    -- Get patient and doctor names
    SELECT CONCAT(first_name, ' ', last_name) INTO patient_name
    FROM patients WHERE id = NEW.patient_id;
    
    SELECT CONCAT(full_name) INTO doctor_name
    FROM users WHERE id = NEW.provider_id;
    
    -- Notify patient
    PERFORM create_notification(
        (SELECT user_id FROM patients WHERE id = NEW.patient_id),
        'Appointment Scheduled',
        'Your appointment with Dr. ' || doctor_name || ' has been scheduled for ' || 
        TO_CHAR(NEW.scheduled_time, 'Mon DD, YYYY at HH12:MI AM'),
        'appointment',
        'normal',
        '/patient/appointments',
        'View Appointment',
        jsonb_build_object('appointment_id', NEW.id, 'patient_id', NEW.patient_id)
    );
    
    -- Notify doctor
    PERFORM create_notification(
        NEW.provider_id,
        'New Appointment Scheduled',
        'Appointment with ' || patient_name || ' scheduled for ' || 
        TO_CHAR(NEW.scheduled_time, 'Mon DD, YYYY at HH12:MI AM'),
        'appointment',
        'normal',
        '/dashboard',
        'View Schedule',
        jsonb_build_object('appointment_id', NEW.id, 'patient_id', NEW.patient_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_appointment_scheduled
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_scheduled();

-- Trigger for lab result notifications
CREATE OR REPLACE FUNCTION notify_lab_result_ready()
RETURNS TRIGGER AS $$
DECLARE
    patient_name TEXT;
    doctor_name TEXT;
    patient_user_id UUID;
    ordering_doctor_id UUID;
BEGIN
    IF NEW.status = 'released' AND OLD.status != 'released' THEN
        -- Get patient and doctor names through orders table
        SELECT CONCAT(p.first_name, ' ', p.last_name), p.user_id, o.provider_id
        INTO patient_name, patient_user_id, ordering_doctor_id
        FROM patients p 
        JOIN orders o ON p.id = o.patient_id 
        WHERE o.id = NEW.order_id;
        
        SELECT CONCAT(full_name) INTO doctor_name
        FROM users WHERE id = ordering_doctor_id;
        
        -- Notify patient
        PERFORM create_notification(
            patient_user_id,
            'Lab Results Available',
            'Your lab results are now available.',
            'lab_result',
            'normal',
            '/patient/lab-results',
            'View Results',
            jsonb_build_object('lab_result_id', NEW.id, 'order_id', NEW.order_id)
        );
        
        -- Notify ordering doctor
        PERFORM create_notification(
            ordering_doctor_id,
            'Lab Results Ready',
            'Lab results for ' || patient_name || ' are ready for review.',
            'lab_result',
            'normal',
            '/dashboard',
            'Review Results',
            jsonb_build_object('lab_result_id', NEW.id, 'order_id', NEW.order_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_lab_result_ready
    AFTER UPDATE ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION notify_lab_result_ready();
