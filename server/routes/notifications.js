import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/notifications/sms
 * Send an SMS notification via edge function
 */
router.post('/sms', async (req, res) => {
  try {
    const { to, message, tripId } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const { data, error } = await supabase.functions.invoke('sms-notifications', {
      body: { to, message, tripId },
    });

    if (error) {
      console.error('Error sending SMS:', error);
      return res.status(500).json({ error: 'Failed to send SMS: ' + error.message });
    }

    res.json({ success: true, data, message: 'SMS sent successfully' });
  } catch (error) {
    console.error('Error in POST /notifications/sms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/email
 * Send an email notification via edge function
 */
router.post('/email', async (req, res) => {
  try {
    const { logId } = req.body;

    if (!logId) {
      return res.status(400).json({ error: 'Log ID is required' });
    }

    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: { log_id: logId },
    });

    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email: ' + error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /notifications/email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/automated
 * Process automated notifications via edge function
 */
router.post('/automated', async (req, res) => {
  try {
    const { type, logId, tripId } = req.body;

    const { data, error } = await supabase.functions.invoke('automated-notifications', {
      body: { type, log_id: logId, trip_id: tripId },
    });

    if (error) {
      console.error('Error processing automated notification:', error);
      return res.status(500).json({ error: 'Failed to process notification: ' + error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /notifications/automated:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/log
 * Log an SMS notification record
 */
router.post('/log', async (req, res) => {
  try {
    const { tripId, phoneNumber, message, status, type } = req.body;

    const { data, error } = await supabase
      .from('automated_notification_log')
      .insert({
        trip_id: tripId || null,
        recipient_contact: phoneNumber,
        message_body: message,
        notification_type: type || 'sms',
        status: status || 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging notification:', error);
      return res.status(500).json({ error: 'Failed to log notification' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /notifications/log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/bulk-insert
 * Insert multiple notification records at once
 */
router.post('/bulk-insert', async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return res.json({ success: true, data: [], message: 'No notifications to insert' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error inserting notifications:', error);
      return res.status(500).json({ error: 'Failed to insert notifications' });
    }

    res.json({ success: true, data, message: `${notifications.length} notifications inserted` });
  } catch (error) {
    console.error('Error in POST /notifications/bulk-insert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/pending-emails
 * Get pending email notifications to process
 */
router.get('/pending-emails', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('automated_notification_log')
      .select('*')
      .eq('notification_type', 'email')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching pending emails:', error);
      return res.status(500).json({ error: 'Failed to fetch pending emails' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/pending-emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/pending
 * Get pending automated notifications to process
 */
router.get('/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('automated_notification_log')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch pending notifications' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/pending:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/sms-history
 * Get SMS notification history with date filtering
 */
router.get('/sms-history', async (req, res) => {
  try {
    const { startDate, endDate, limit: queryLimit } = req.query;

    let query = supabase
      .from('sms_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.limit(parseInt(String(queryLimit)) || 100);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching SMS history:', error);
      return res.status(500).json({ error: 'Failed to fetch SMS history' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/sms-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/trip-reminders
 * Log a trip reminder record
 */
router.post('/trip-reminders', async (req, res) => {
  try {
    const { tripId, reminderType, scheduledFor, sentAt, status, smsSent, emailSent } = req.body;

    const { data, error } = await supabase
      .from('trip_reminders')
      .insert({
        trip_id: tripId,
        reminder_type: reminderType || 'manual',
        scheduled_for: scheduledFor || new Date().toISOString(),
        sent_at: sentAt || new Date().toISOString(),
        status: status || 'sent',
        sms_sent: smsSent || false,
        email_sent: emailSent || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging trip reminder:', error);
      return res.status(500).json({ error: 'Failed to log trip reminder' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /notifications/trip-reminders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/sms-log
 * Log an SMS notification record to sms_notifications table
 */
router.post('/sms-log', async (req, res) => {
  try {
    const { tripId, phoneNumber, message, messageType, patientName, status } = req.body;

    const { data, error } = await supabase
      .from('sms_notifications')
      .insert({
        trip_id: tripId,
        phone_number: phoneNumber,
        message,
        message_type: messageType,
        patient_name: patientName,
        status: status || 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging SMS notification:', error);
      return res.status(500).json({ error: 'Failed to log SMS notification' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /notifications/sms-log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/trip-reminders/:tripId
 * Get reminders for a specific trip
 */
router.get('/trip-reminders/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('trip_reminders')
      .select('*')
      .eq('trip_id', tripId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching trip reminders:', error);
      return res.status(500).json({ error: 'Failed to fetch reminders' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/trip-reminders/:tripId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/trip-reminders/:id
 * Update a reminder's status
 */
router.put('/trip-reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('trip_reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      return res.status(500).json({ error: 'Failed to update reminder' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /notifications/trip-reminders/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/trip-reminders/cancel/:tripId
 * Cancel all pending reminders for a trip
 */
router.put('/trip-reminders/cancel/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const { error } = await supabase
      .from('trip_reminders')
      .update({ status: 'cancelled' })
      .eq('trip_id', tripId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling reminders:', error);
      return res.status(500).json({ error: 'Failed to cancel reminders' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /notifications/trip-reminders/cancel/:tripId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/pending-reminders
 * Get pending reminders that are due (with trip/patient/driver joins)
 */
router.get('/pending-reminders', async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('trip_reminders')
      .select(`
        *,
        trips:trip_id (
          *,
          patients:patient_id (*),
          drivers:driver_id (*),
          contractors:facility_id (*)
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50);

    if (error) {
      console.error('Error fetching pending reminders:', error);
      return res.status(500).json({ error: 'Failed to fetch pending reminders' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/pending-reminders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/user
 * Get notifications for the current user
 */
router.get('/user', async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /notifications/user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/read/:id
 * Mark a notification as read
 */
router.put('/read/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /notifications/read/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark multiple notifications as read
 */
router.put('/read-all', async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
      if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /notifications/read-all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/user/:id
 * Delete a notification
 */
router.delete('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /notifications/user/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/user-all
 * Clear all notifications for the current user
 */
router.delete('/user-all', async (req, res) => {
  try {
    const { userId } = req.user;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /notifications/user-all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the current user
 */
router.get('/preferences', async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error in GET /notifications/preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Upsert notification preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const { userId } = req.user;
    const prefs = { ...req.body, user_id: userId, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(prefs);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /notifications/preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/reminder-stats
 * Get reminder statistics
 */
router.get('/reminder-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('trip_reminders')
      .select('status, scheduled_for');

    if (startDate) query = query.gte('scheduled_for', startDate);
    if (endDate) query = query.lte('scheduled_for', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminder stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.status === 'pending').length || 0,
      sent: data?.filter(r => r.status === 'sent').length || 0,
      failed: data?.filter(r => r.status === 'failed').length || 0,
      cancelled: data?.filter(r => r.status === 'cancelled').length || 0,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in GET /notifications/reminder-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
