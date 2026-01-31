import { supabase } from '../lib/supabase';

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
    const { data: emails, error } = await supabase
      .from('email_notification_log')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !emails || emails.length === 0) return results;

    //console.log(`Processing ${emails.length} pending emails...`);

    for (const email of emails) {
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'send-email-notification',
          { body: { log_id: email.id } }
        );

        if (functionError || !data?.success) {
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
    // Process SMS notifications
    const { data: notifications, error } = await supabase
      .from('automated_notification_log')
      .select('id, notification_type, recipient_contact, message_body, subject, trip_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching pending notifications:', error);
      results.errors.push(`Failed to fetch notifications: ${error.message}`);
      return results;
    }

    if (!notifications || notifications.length === 0) {
      // console.log('No pending notifications to process');
      return results;
    }

    //console.log(`Processing ${notifications.length} pending notifications...`);

    // Process each notification
    for (const notification of notifications) {
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'automated-notifications',
          {
            body: {
              type: notification.notification_type,
              log_id: notification.id,
            },
          }
        );

        if (functionError) {
          console.error(`Error processing notification ${notification.id}:`, functionError);
          results.failed++;
          results.errors.push(`${notification.id}: ${functionError.message}`);
        } else if (data?.success) {
          //console.log(`Successfully processed notification ${notification.id}`);
          results.processed++;
        } else {
          console.error(`Failed to process notification ${notification.id}:`, data?.error);
          results.failed++;
          results.errors.push(`${notification.id}: ${data?.error || 'Unknown error'}`);
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

  // Then process every 30 seconds
  const intervalId = setInterval(() => {
    processPendingNotifications();
  }, 30000); // 30 seconds

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
          supabase.functions.invoke('automated-notifications', {
            body: {
              type: payload.new.notification_type,
              log_id: payload.new.id,
            },
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error processing new notification:', error);
            } else if (data?.success) {
              //console.log('Successfully processed new notification:', payload.new.id);
            } else {
              console.error('Failed to process new notification:', data?.error);
            }
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
