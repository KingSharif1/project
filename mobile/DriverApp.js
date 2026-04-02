import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, Platform, ActivityIndicator, AppState, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './theme';

// Conditionally import StatusBar for native only
let StatusBar = () => null;
if (Platform.OS !== 'web') {
  StatusBar = require('expo-status-bar').StatusBar;
}

import { driverAPI, supabase } from './services/api';
import { locationService } from './services/locationService';
import { pushNotificationService } from './services/pushNotifications';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, showToast } from './components/CustomToast';
import DriverLoginScreen from './screens/driver/LoginScreen';
import DriverTripsScreen from './screens/driver/TripsScreen';
import DriverTripDetailScreen from './screens/driver/TripDetailScreen';
import DriverMessagesScreen from './screens/driver/MessagesScreen';
import DriverVehicleScreen from './screens/driver/VehicleScreen';
import DriverProfileScreen from './screens/driver/ProfileScreen';
import DriverSettingsScreen from './screens/driver/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DriverTabs({ onLogout }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const activeTabRef = useRef('Trips');

  // Register push notifications + fetch unread count + realtime subscriptions
  useEffect(() => {
    let userId = null;
    let driverId = null;

    // Register for push notifications (graceful fail)
    pushNotificationService.registerForPushNotifications().catch(() => {});

    // Setup notification tap handler
    const cleanupListeners = pushNotificationService.setupNotificationListeners(
      () => {},
      () => {}
    );

    // Get user ID and driver ID from stored profile
    AsyncStorage.getItem('userProfile').then(p => {
      if (p) {
        try {
          const profile = JSON.parse(p);
          userId = profile.userId || profile.user_id;
          driverId = profile.id;
        } catch {}
      }
    });

    const fetchUnread = () => {
      driverAPI.getUnreadCount().then(r => {
        if (r.success) setUnreadMessages(r.unreadCount || 0);
      }).catch(() => {});
    };
    fetchUnread();

    // Single channel for both messages and trips realtime
    const channel = supabase
      .channel('driver-realtime-global')
      // ── New message arrives ──
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          fetchUnread();
          const msg = payload.new;
          if (msg.receiver_id === userId) {
            // Show in-app toast if not on Messages tab
            if (activeTabRef.current !== 'Messages') {
              showToast('info', 'New Message', msg.content?.slice(0, 80) || 'You have a new message', 4000);
            }
            // Also show push notification (for when app is backgrounded or not on Messages)
            AsyncStorage.getItem('driverSettings').then(s => {
              const settings = s ? JSON.parse(s) : {};
              if (settings.notifMessages !== false && activeTabRef.current !== 'Messages') {
                pushNotificationService.showMessageNotification(
                  'New Message',
                  msg.content || 'You have a new message'
                );
              }
            }).catch(() => {});
          }
        }
      )
      // ── Message read/updated ──
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => { fetchUnread(); }
      )
      // ── Trip assigned or updated ──
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trips' },
        (payload) => {
          const trip = payload.new;
          if (trip.driver_id === driverId) {
            showToast('success', 'New Trip Assigned!', `Pickup: ${trip.pickup_address?.slice(0, 60) || 'New trip'}`, 5000);
            AsyncStorage.getItem('driverSettings').then(s => {
              const settings = s ? JSON.parse(s) : {};
              if (settings.notifTrips !== false) {
                pushNotificationService.scheduleLocalNotification(
                  '\uD83D\uDE97 New Trip Assigned!',
                  trip.pickup_address?.slice(0, 80) || 'You have a new trip',
                  { tripId: trip.id, type: 'trip_assigned' }
                );
              }
            }).catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips' },
        (payload) => {
          const trip = payload.new;
          const oldTrip = payload.old;
          if (trip.driver_id === driverId) {
            // Notify driver of trip updates (skip if driver themselves changed status)
            if (activeTabRef.current !== 'Trips') {
              showToast('info', 'Trip Updated', `Trip details have been updated. Pickup: ${trip.pickup_address?.slice(0, 50) || 'Check your trips'}`, 5000);
            }
            AsyncStorage.getItem('driverSettings').then(s => {
              const settings = s ? JSON.parse(s) : {};
              if (settings.notifTrips !== false && activeTabRef.current !== 'Trips') {
                pushNotificationService.scheduleLocalNotification(
                  '\uD83D\uDD04 Trip Updated',
                  `Trip details changed. Pickup: ${trip.pickup_address?.slice(0, 60) || 'Check your trips'}`,
                  { tripId: trip.id, type: 'trip_updated' }
                );
              }
            }).catch(() => {});
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Global] Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      cleanupListeners();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.seafoam,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          elevation: 8,
          shadowColor: COLORS.cardShadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused, size }) => {
          let iconName;
          if (route.name === 'Trips') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Vehicle') iconName = focused ? 'bus' : 'bus-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarBadge: route.name === 'Messages' && unreadMessages > 0 ? unreadMessages : undefined,
        tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, fontWeight: '700' },
      })}
      screenListeners={{
        state: (e) => {
          const route = e.data?.state?.routes?.[e.data?.state?.index];
          if (route?.name) activeTabRef.current = route.name;
        },
      }}
    >
      <Tab.Screen name="Trips" component={DriverTripsScreen} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} />
      <Tab.Screen name="Vehicle" component={DriverVehicleScreen} />
      <Tab.Screen name="Profile">
        {props => <DriverProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function DriverApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userType = await AsyncStorage.getItem('userType');
      setIsAuthenticated(!!token && userType === 'driver');
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (loginResponse) => {
    setIsAuthenticated(true);
    if (loginResponse?.mustChangePassword) {
      setMustChangePassword(true);
    }
  };

  const handleLogout = async () => {
    // Stop location tracking and set offline before logging out
    try { await locationService.stopTracking(); } catch (e) {}
    try { await driverAPI.updateStatus('off_duty'); } catch (e) {}
    setIsAuthenticated(false);
    setMustChangePassword(false);
  };

  // Handle session replaced by another device
  const handleSessionReplaced = useCallback((error) => {
    if (error?.code === 'SESSION_REPLACED') {
      Alert.alert(
        'Logged Out',
        'You have been logged in on another device. Only one device can be active at a time.',
        [{ text: 'OK', onPress: () => { setIsAuthenticated(false); setMustChangePassword(false); } }]
      );
      return true;
    }
    return false;
  }, []);

  // Auto-status + location tracking: start when app opens, stop when app closes
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated) return;

    // Start tracking + set available on app start
    const startUp = async () => {
      driverAPI.updateStatus('available').catch((e) => handleSessionReplaced(e));
      try {
        const profileData = await AsyncStorage.getItem('userProfile');
        if (profileData) {
          const parsed = JSON.parse(profileData);
          if (parsed.id && !locationService.isActive()) {
            const perms = await locationService.requestPermissions();
            if (perms.foreground) {
              await locationService.startTracking(parsed.id, { interval: 10000, distance: 10 });
              console.log('[DriverApp] Location tracking started for', parsed.id);
            }
          }
        }
      } catch (err) {
        console.log('[DriverApp] Location start error (non-fatal):', err.message);
      }
    };
    startUp();

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground — resume tracking
        driverAPI.updateStatus('available').catch((e) => handleSessionReplaced(e));
        try {
          const profileData = await AsyncStorage.getItem('userProfile');
          if (profileData) {
            const parsed = JSON.parse(profileData);
            if (parsed.id && !locationService.isActive()) {
              const perms = await locationService.requestPermissions();
              if (perms.foreground) {
                await locationService.startTracking(parsed.id, { interval: 10000, distance: 10 });
                console.log('[DriverApp] Location tracking resumed');
              }
            }
          }
        } catch (err) {
          console.log('[DriverApp] Resume tracking error:', err.message);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background — keep tracking but mark off_duty status
        driverAPI.updateStatus('off_duty').catch(() => {});
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, handleSessionReplaced]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.navy }}>
        <ActivityIndicator size="large" color={COLORS.seafoam} />
        <Text style={{ color: COLORS.textWhite, marginTop: 12, fontSize: 15, fontWeight: '500' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              <Stack.Screen name="Login">
                {props => <DriverLoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Main">
                  {props => (
                    <DriverTabs
                      {...props}
                      onLogout={handleLogout}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="TripDetail"
                  component={DriverTripDetailScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Settings">
                  {props => <DriverSettingsScreen {...props} onLogout={handleLogout} />}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ToastProvider>
    </ErrorBoundary>
  );
}
