import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications, Device, Constants;

// Only import native modules on native platforms
if (Platform.OS !== 'web') {
  try { Notifications = require('expo-notifications'); } catch {}
  try { Device = require('expo-device'); } catch {}
  try { Constants = require('expo-constants').default; } catch {}

  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
}

export const pushNotificationService = {
  async registerForPushNotifications() {
    if (Platform.OS === 'web' || !Notifications) {
      return null;
    }

    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (!Device || Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants?.expoConfig?.extra?.eas?.projectId,
          })
        ).data;
        await AsyncStorage.setItem('pushToken', token);
      } catch (e) {
        console.log('Push token registration failed:', e.message);
      }
    }

    return token;
  },

  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    if (Platform.OS === 'web' || !Notifications) {
      return () => {};
    }

    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

    return () => {
      if (notificationListener?.remove) notificationListener.remove();
      else if (Notifications.removeNotificationSubscription) Notifications.removeNotificationSubscription(notificationListener);
      if (responseListener?.remove) responseListener.remove();
      else if (Notifications.removeNotificationSubscription) Notifications.removeNotificationSubscription(responseListener);
    };
  },

  async scheduleLocalNotification(title, body, data = {}, delaySeconds = 0) {
    if (Platform.OS === 'web' || !Notifications) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });
  },

  async showTripAssignedNotification(trip) {
    await this.scheduleLocalNotification(
      '🚗 New Trip Assigned!',
      `${trip.customer_name} - Pickup at ${new Date(trip.scheduled_time).toLocaleTimeString()}`,
      { tripId: trip.id, type: 'trip_assigned' }
    );
  },

  async showMessageNotification(senderName, content) {
    await this.scheduleLocalNotification(
      `💬 ${senderName}`,
      content.length > 100 ? content.slice(0, 100) + '...' : content,
      { type: 'new_message' }
    );
  },

  async showTripReminderNotification(trip, minutesBefore) {
    await this.scheduleLocalNotification(
      `⏰ Trip in ${minutesBefore} minutes`,
      `Pickup: ${trip.pickup_location}`,
      { tripId: trip.id, type: 'trip_reminder' }
    );
  },

  async cancelNotification(notificationId) {
    if (Notifications) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  },

  async cancelAllNotifications() {
    if (Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  },

  async getBadgeCount() {
    if (!Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  },

  async setBadgeCount(count) {
    if (Notifications) {
      await Notifications.setBadgeCountAsync(count);
    }
  },

  async clearBadge() {
    if (Notifications) {
      await Notifications.setBadgeCountAsync(0);
    }
  },
};

export default pushNotificationService;
