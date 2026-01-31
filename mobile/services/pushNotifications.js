import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications, Device, Constants;

// Only import native modules on native platforms
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const pushNotificationService = {
  async registerForPushNotifications() {
    // Web doesn't support push notifications
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
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

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      await AsyncStorage.setItem('pushToken', token);
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token;
  },

  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    if (Platform.OS === 'web') {
      return () => {}; // No-op for web
    }

    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  },

  async scheduleLocalNotification(title, body, data = {}, delaySeconds = 0) {
    if (Platform.OS === 'web') {
      console.log(`[Web Notification] ${title}: ${body}`);
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

  async showTripReminderNotification(trip, minutesBefore) {
    await this.scheduleLocalNotification(
      `⏰ Trip in ${minutesBefore} minutes`,
      `Pickup: ${trip.pickup_location}`,
      { tripId: trip.id, type: 'trip_reminder' }
    );
  },

  async cancelNotification(notificationId) {
    if (Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  },

  async cancelAllNotifications() {
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  },

  async getBadgeCount() {
    if (Platform.OS === 'web') return 0;
    return await Notifications.getBadgeCountAsync();
  },

  async setBadgeCount(count) {
    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(count);
    }
  },

  async clearBadge() {
    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(0);
    }
  },
};

export default pushNotificationService;
