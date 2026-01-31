import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Conditionally import StatusBar for native only
let StatusBar;
if (Platform.OS !== 'web') {
  StatusBar = require('expo-status-bar').StatusBar;
}

// Screens
import PatientLoginScreen from './screens/patient/LoginScreen';
import PatientHomeScreen from './screens/patient/HomeScreen';
import PatientTripsScreen from './screens/patient/TripsScreen';
import PatientBookTripScreen from './screens/patient/BookTripScreen';
import PatientTripDetailScreen from './screens/patient/TripDetailScreen';
import PatientProfileScreen from './screens/patient/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={PatientHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => '🏠',
        }}
      />
      <Tab.Screen
        name="Book"
        component={PatientBookTripScreen}
        options={{
          tabBarLabel: 'Book Trip',
          tabBarIcon: ({ color }) => '➕',
        }}
      />
      <Tab.Screen
        name="Trips"
        component={PatientTripsScreen}
        options={{
          tabBarLabel: 'My Trips',
          tabBarIcon: ({ color }) => '📋',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={PatientProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => '👤',
        }}
      />
    </Tab.Navigator>
  );
}

export default function PatientApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userType = await AsyncStorage.getItem('userType');
      setIsAuthenticated(!!token && userType === 'patient');
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login">
              {props => <PatientLoginScreen {...props} onLogin={() => setIsAuthenticated(true)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Main" component={PatientTabs} />
              <Stack.Screen
                name="TripDetail"
                component={PatientTripDetailScreen}
                options={{ headerShown: true, title: 'Trip Details' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
