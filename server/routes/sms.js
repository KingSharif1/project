import express from 'express';
import { supabase } from '../lib/supabase.js';
import { requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Twilio will be initialized per-clinic with their credentials
import Twilio from 'twilio';

const getTwilioClient = (accountSid, authToken) => {
  return new Twilio(accountSid, authToken);
};

// Simple encryption/decryption for auth tokens (use proper key management in production)
const ENCRYPTION_KEY = process.env.SMS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// ============================================================================
// GET SMS PROVIDER SETTINGS
// ============================================================================

router.get('/settings', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { clinic_id } = req.user;

    const { data: settings, error } = await supabase
      .from('sms_provider_settings')
      .select('id, clinic_id, provider, enabled, phone_number, messages_sent_this_month, last_message_sent_at, created_at, updated_at')
      .eq('clinic_id', clinic_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ success: true, settings: settings || null });
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SAVE SMS PROVIDER SETTINGS
// ============================================================================

router.post('/settings', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { provider, enabled, account_sid, auth_token, phone_number } = req.body;

    // Validate required fields if enabled
    if (enabled && (!account_sid || !auth_token || !phone_number)) {
      return res.status(400).json({ 
        success: false, 
        error: 'account_sid, auth_token, and phone_number are required when SMS is enabled' 
      });
    }

    // Test Twilio credentials if provided
    if (enabled && provider === 'twilio') {
      try {
        const twilioClient = getTwilioClient(account_sid, auth_token);
        // Verify credentials by fetching account info
        await twilioClient.api.accounts(account_sid).fetch();
      } catch (twilioError) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Twilio credentials: ' + twilioError.message 
        });
      }
    }

    // Encrypt auth token
    const encryptedToken = enabled ? encrypt(auth_token) : null;

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('sms_provider_settings')
      .upsert({
        clinic_id,
        provider: provider || 'twilio',
        enabled,
        account_sid: enabled ? account_sid : null,
        auth_token_encrypted: encryptedToken,
        phone_number: enabled ? phone_number : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'clinic_id' })
      .select('id, clinic_id, provider, enabled, phone_number, messages_sent_this_month, last_message_sent_at')
      .single();

    if (error) throw error;

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving SMS settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SEND SMS REMINDER
// ============================================================================

router.post('/send-reminder', requireRole('admin', 'superadmin', 'dispatcher'), async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { trip_id, message_type = 'custom', custom_message } = req.body;

    if (!trip_id) {
      return res.status(400).json({ success: false, error: 'trip_id is required' });
    }

    // Check if SMS is enabled for this clinic
    const { data: features } = await supabase
      .from('feature_flags')
      .select('sms_reminders_enabled')
      .eq('clinic_id', clinic_id)
      .single();

    if (!features?.sms_reminders_enabled) {
      return res.status(403).json({ 
        success: false, 
        error: 'SMS reminders are not enabled for your subscription tier' 
      });
    }

    // Get SMS settings
    const { data: smsSettings, error: settingsError } = await supabase
      .from('sms_provider_settings')
      .select('*')
      .eq('clinic_id', clinic_id)
      .single();

    if (settingsError || !smsSettings?.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'SMS provider not configured or not enabled' 
      });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        patient:patients(first_name, last_name, phone),
        driver:drivers(first_name, last_name, phone)
      `)
      .eq('id', trip_id)
      .single();

    if (tripError) throw tripError;

    if (!trip.patient?.phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient phone number not available' 
      });
    }

    // Build message based on type
    let messageBody;
    if (message_type === 'custom' && custom_message) {
      messageBody = custom_message;
    } else {
      const scheduledTime = new Date(trip.scheduled_time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const templates = {
        '24hr': `Reminder: You have a transportation appointment tomorrow at ${scheduledTime}. Pickup location: ${trip.pickup_address}. Reply STOP to opt out.`,
        '2hr': `Your ride is scheduled in 2 hours at ${scheduledTime}. Pickup: ${trip.pickup_address}. Your driver will contact you shortly. Reply STOP to opt out.`,
        'assigned': `Your driver ${trip.driver?.first_name || 'has been'} assigned for your ${scheduledTime} appointment. Pickup: ${trip.pickup_address}. Reply STOP to opt out.`,
        'onway': `Your driver is on the way! ETA: 10-15 minutes. Pickup: ${trip.pickup_address}. Reply STOP to opt out.`
      };

      messageBody = templates[message_type] || templates['24hr'];
    }

    // Decrypt auth token and send SMS
    const authToken = decrypt(smsSettings.auth_token_encrypted);
    const twilioClient = getTwilioClient(smsSettings.account_sid, authToken);

    const message = await twilioClient.messages.create({
      body: messageBody,
      from: smsSettings.phone_number,
      to: trip.patient.phone
    });

    // Update usage tracking
    await supabase
      .from('sms_provider_settings')
      .update({
        messages_sent_this_month: (smsSettings.messages_sent_this_month || 0) + 1,
        last_message_sent_at: new Date().toISOString()
      })
      .eq('clinic_id', clinic_id);

    // Log the reminder
    await supabase
      .from('trip_reminders')
      .insert({
        trip_id,
        reminder_type: message_type,
        sent_at: new Date().toISOString(),
        status: 'sent',
        message_sid: message.sid
      });

    res.json({ 
      success: true, 
      message: 'SMS reminder sent successfully',
      sid: message.sid 
    });
  } catch (error) {
    console.error('Error sending SMS reminder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SEND BULK REMINDERS (for scheduled job)
// ============================================================================

router.post('/send-bulk-reminders', requireRole('superadmin'), async (req, res) => {
  try {
    const { reminder_type = '24hr' } = req.body;

    // Calculate time window based on reminder type
    const now = new Date();
    let startTime, endTime;

    if (reminder_type === '24hr') {
      startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    } else if (reminder_type === '2hr') {
      startTime = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
      endTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid reminder_type' });
    }

    // Get trips that need reminders
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        *,
        patient:patients(first_name, last_name, phone),
        clinic:clinics(id, name)
      `)
      .gte('scheduled_time', startTime.toISOString())
      .lte('scheduled_time', endTime.toISOString())
      .in('status', ['scheduled', 'assigned'])
      .not('patient.phone', 'is', null);

    if (tripsError) throw tripsError;

    const results = {
      total: trips.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Process each trip
    for (const trip of trips) {
      try {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('trip_reminders')
          .select('id')
          .eq('trip_id', trip.id)
          .eq('reminder_type', reminder_type)
          .single();

        if (existingReminder) {
          results.skipped++;
          continue;
        }

        // Get clinic SMS settings
        const { data: smsSettings } = await supabase
          .from('sms_provider_settings')
          .select('*')
          .eq('clinic_id', trip.clinic_id)
          .single();

        if (!smsSettings?.enabled) {
          results.skipped++;
          continue;
        }

        // Check feature flag
        const { data: features } = await supabase
          .from('feature_flags')
          .select('sms_reminders_enabled')
          .eq('clinic_id', trip.clinic_id)
          .single();

        if (!features?.sms_reminders_enabled) {
          results.skipped++;
          continue;
        }

        // Send SMS
        const authToken = decrypt(smsSettings.auth_token_encrypted);
        const twilioClient = getTwilioClient(smsSettings.account_sid, authToken);

        const scheduledTime = new Date(trip.scheduled_time).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const messageBody = reminder_type === '24hr'
          ? `Reminder: You have a transportation appointment tomorrow at ${scheduledTime}. Pickup: ${trip.pickup_address}. Reply STOP to opt out.`
          : `Your ride is scheduled in 2 hours at ${scheduledTime}. Pickup: ${trip.pickup_address}. Reply STOP to opt out.`;

        const message = await twilioClient.messages.create({
          body: messageBody,
          from: smsSettings.phone_number,
          to: trip.patient.phone
        });

        // Log reminder
        await supabase
          .from('trip_reminders')
          .insert({
            trip_id: trip.id,
            reminder_type,
            sent_at: new Date().toISOString(),
            status: 'sent',
            message_sid: message.sid
          });

        // Update usage
        await supabase
          .from('sms_provider_settings')
          .update({
            messages_sent_this_month: (smsSettings.messages_sent_this_month || 0) + 1,
            last_message_sent_at: new Date().toISOString()
          })
          .eq('clinic_id', trip.clinic_id);

        results.sent++;
      } catch (error) {
        console.error(`Error sending reminder for trip ${trip.id}:`, error);
        results.failed++;
        results.errors.push({ trip_id: trip.id, error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET SMS USAGE STATS
// ============================================================================

router.get('/usage', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { clinic_id } = req.user;

    const { data: settings } = await supabase
      .from('sms_provider_settings')
      .select('messages_sent_this_month, last_message_sent_at')
      .eq('clinic_id', clinic_id)
      .single();

    const { data: reminders, error } = await supabase
      .from('trip_reminders')
      .select('id, reminder_type, sent_at, status')
      .eq('trip_id', 'in', `(SELECT id FROM trips WHERE clinic_id = '${clinic_id}')`)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ 
      success: true, 
      usage: {
        messages_sent_this_month: settings?.messages_sent_this_month || 0,
        last_message_sent_at: settings?.last_message_sent_at,
        recent_reminders: reminders || []
      }
    });
  } catch (error) {
    console.error('Error fetching SMS usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
