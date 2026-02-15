import { supabase } from '../lib/supabase';
import * as api from '../services/api';

interface PendingNotification {
  id: string;
  notification_type: 'driver_sms' | 'clinic_email';
  recipient_contact: string;
  message_body: string;
  subject?: string;
  trip_id: string;
}

/**
 * Process pending email notifications
 */
async function processEmailNotifications(): Promise<{ processed: number; failed: number }> {
  const results = { processed: 0, failed: 0 };

  try {
    const pendingResult = await api.getPendingEmails();
    const emails = pendingResult.data || [];

    if (emails.length === 0) return results;

    //console.log(`Processing ${emails.length} pending emails...`);

    for (const email of emails) {
      try {
        const result = await api.sendEmailNotification(email.id);

        if (!result?.success) {
          results.failed++;
        } else {
          results.processed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
      }
    }
  } catch (error) {
    console.error('Error processing emails:', error);
  }

  return results;
}

/**
 * Process pending notifications by calling the edge function
 */
export async function processPendingNotifications(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Process pending notifications via backend API
    const pendingResult = await api.getPendingNotifications();
    const notifications = pendingResult.data || [];

    if (notifications.length === 0) {
      return results;
    }

    //console.log(`Processing ${notifications.length} pending notifications...`);

    // Process each notification via backend API
    for (const notification of notifications) {
      try {
        const result = await api.processAutomatedNotification(
          notification.notification_type,
          notification.id,
        );

        if (result?.success) {
          results.processed++;
        } else {
          results.failed++;
          results.errors.push(`${notification.id}: ${(result as any)?.error || 'Unknown error'}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Exception processing notification ${notification.id}:`, error);
        results.failed++;
        results.errors.push(`${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Also process email notifications
    const emailResults = await processEmailNotifications();
    results.processed += emailResults.processed;
    results.failed += emailResults.failed;

    //console.log('Notification processing complete:', results);
    return results;
  } catch (error) {
    console.error('Error in processPendingNotifications:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Start a background worker to process notifications every 30 seconds
 */
export function startNotificationProcessor(): () => void {
  //console.log('Starting notification processor...');

  // Process immediately
  processPendingNotifications();

  // Then process every 5 minutes
  const intervalId = setInterval(() => {
    processPendingNotifications();
  }, 300000); // 5 minutes

  // Return cleanup function
  return () => {
    //console.log('Stopping notification processor...');
    clearInterval(intervalId);
  };
}

/**
 * Subscribe to new notifications and process them immediately
 */
export function subscribeToNotifications(): () => void {
  //console.log('Subscribing to notification queue...');

  const subscription = supabase
    .channel('notification_queue')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'automated_notification_log',
        filter: 'status=eq.pending',
      },
      (payload) => {
        //console.log('New notification detected:', payload.new);

        // Process this notification immediately
        if (payload.new && payload.new.id) {
          api.processAutomatedNotification(
            payload.new.notification_type,
            payload.new.id,
          ).then((result) => {
            if (result?.success) {
              //console.log('Successfully processed new notification:', payload.new.id);
            } else {
              console.error('Failed to process new notification:', (result as any)?.error);
            }
          }).catch((error) => {
            console.error('Error processing new notification:', error);
          });
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    //console.log('Unsubscribing from notification queue...');
    subscription.unsubscribe();
  };
}
