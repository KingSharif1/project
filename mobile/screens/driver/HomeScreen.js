import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  StatusBar,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI, supabase } from '../../services/api';
import { locationService } from '../../services/locationService';
import { LinearGradient } from 'expo-linear-gradient';
import MapViewComponent from '../../components/MapViewComponent';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const BOTTOM_SHEET_MIN = 120;
const BOTTOM_SHEET_MAX = height * 0.55;

export default function DriverHomeScreen({ navigation }) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [todayTrips, setTodayTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 32.7555,
    longitude: -97.3308,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  
  const mapRef = useRef(null);
  const bottomSheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_MAX)).current;
  const panY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.current = sheetExpanded ? BOTTOM_SHEET_MAX : BOTTOM_SHEET_MIN;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = panY.current - gestureState.dy;
        if (newHeight >= BOTTOM_SHEET_MIN && newHeight <= BOTTOM_SHEET_MAX) {
          bottomSheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = panY.current - gestureState.dy;
        const threshold = (BOTTOM_SHEET_MAX + BOTTOM_SHEET_MIN) / 2;
        
        if (gestureState.dy > 50 || currentHeight < threshold) {
          // Swipe down or below threshold - minimize
          setSheetExpanded(false);
          Animated.spring(bottomSheetHeight, {
            toValue: BOTTOM_SHEET_MIN,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }).start();
        } else {
          // Swipe up or above threshold - maximize
          setSheetExpanded(true);
          Animated.spring(bottomSheetHeight, {
            toValue: BOTTOM_SHEET_MAX,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const toggleBottomSheet = () => {
    const toValue = sheetExpanded ? BOTTOM_SHEET_MIN : BOTTOM_SHEET_MAX;
    Animated.spring(bottomSheetHeight, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setSheetExpanded(!sheetExpanded);
  };

  useEffect(() => {
    loadData();
    requestLocationPermission();
    setupLocationTracking();
    subscribeToTripUpdates();

    return () => {
      if (tripsSubscription) {
        tripsSubscription.unsubscribe();
      }
    };
  }, []);

  let tripsSubscription = null;

  const subscribeToTripUpdates = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (!profileData) return;

      const parsed = JSON.parse(profileData);
      if (!parsed || !parsed.id) return;

      tripsSubscription = supabase
        .channel('driver-trips')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips',
            filter: `driver_id=eq.${parsed.id}`,
          },
        (payload) => {
          console.log('Trip update received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadData();
            if (payload.eventType === 'INSERT') {
              Alert.alert(
                'New Trip Assigned!',
                `You have been assigned a new trip: ${payload.new.trip_number}`,
                [
                  { text: 'View Now', onPress: () => navigation.navigate('TripDetail', { trip: payload.new }) },
                  { text: 'Later', style: 'cancel' }
                ]
              );
            }
          }
        }
        )
        .subscribe();
    } catch (error) {
      console.log('Subscribe to trip updates error:', error);
    }
  };

  const setupLocationTracking = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        if (parsed.id && isCheckedIn) {
          const permissions = await locationService.requestPermissions();
          if (permissions.foreground) {
            await locationService.startTracking(parsed.id, {
              interval: 30000,
              distance: 50,
            });
          }
        }
      }
    } catch (error) {
      console.error('Setup location tracking error:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'web') {
      console.log('Location permission not needed on web');
      return;
    }

    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setMapRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01 * ASPECT_RATIO,
      }, 500);
    }
  };

  const getNextTrip = () => {
    if (todayTrips.length === 0) return null;
    const activeTrip = todayTrips.find(t => ['en_route', 'arrived', 'in_progress'].includes(t.status));
    if (activeTrip) return activeTrip;
    return todayTrips.find(t => t.status === 'assigned') || todayTrips[0];
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstimatedDuration = (trip) => {
    return trip.estimated_duration || '25 min';
  };

  const getEstimatedDistance = (trip) => {
    return trip.estimated_distance || '8.2 mi';
  };

  const loadData = async () => {
    try {
      // Try to get profile from storage first
      let profileData = await AsyncStorage.getItem('userProfile');
      let parsed = profileData ? JSON.parse(profileData) : null;
      
      // If no profile in storage, try to fetch from API
      if (!parsed) {
        console.log('No profile in storage, fetching from API...');
        try {
          const profileResponse = await driverAPI.getProfile();
          if (profileResponse.success && profileResponse.profile) {
            parsed = profileResponse.profile;
            await AsyncStorage.setItem('userProfile', JSON.stringify(parsed));
            console.log('Profile fetched and saved:', parsed);
          }
        } catch (profileError) {
          console.log('Could not fetch profile from API:', profileError.message);
        }
      }
      
      if (parsed) {
        setProfile(parsed);
        setIsCheckedIn(parsed?.availability_status === 'available' || parsed?.availability_status === 'on_trip' || parsed?.status === 'available');
      }

      // Load trips
      try {
        const tripsResponse = await driverAPI.getTrips('today');
        if (tripsResponse.success) {
          const trips = tripsResponse.trips || [];
          const assignedTrips = trips.filter(trip =>
            ['assigned', 'en_route', 'arrived', 'in_progress'].includes(trip.status)
          );
          setTodayTrips(assignedTrips);
        }
      } catch (tripError) {
        console.log('Could not load trips:', tripError.message);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckInOut = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable GPS.');
      return;
    }

    try {
      const action = isCheckedIn ? 'out' : 'in';
      const response = await driverAPI.checkIn(
        action,
        location.latitude,
        location.longitude
      );

      if (response.success) {
        const newStatus = !isCheckedIn;
        setIsCheckedIn(newStatus);

        const profileData = await AsyncStorage.getItem('userProfile');
        if (profileData) {
          const parsed = JSON.parse(profileData);
          if (newStatus && parsed.id) {
            const permissions = await locationService.requestPermissions();
            if (permissions.foreground) {
              await locationService.startTracking(parsed.id);
              Alert.alert('Success', response.message + ' GPS tracking enabled.');
            } else {
              Alert.alert('Success', response.message + ' Enable GPS for tracking.');
            }
          } else {
            await locationService.stopTracking();
            Alert.alert('Success', response.message);
          }
        }

        await loadData();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const nextTrip = getNextTrip();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Fullscreen Map View */}
      <MapViewComponent
        mapRef={mapRef}
        style={styles.fullscreenMap}
        mapRegion={mapRegion}
        location={location}
      />

      {/* Top Header Overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hi, {profile?.name?.split(' ')[0] || 'Driver'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, isCheckedIn ? styles.statusOnline : styles.statusOffline]} />
                <Text style={styles.statusText}>{isCheckedIn ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.statusToggle, isCheckedIn && styles.statusToggleActive]}
              onPress={handleCheckInOut}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isCheckedIn ? "pause-circle" : "play-circle"} 
                size={28} 
                color={isCheckedIn ? "#fff" : "#FF3B30"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Map Controls */}
      <View style={[styles.mapControls, { bottom: sheetExpanded ? BOTTOM_SHEET_MAX + 16 : BOTTOM_SHEET_MIN + 16 }]}>
        <TouchableOpacity style={styles.mapControlBtn} onPress={centerOnLocation}>
          <Ionicons name="locate" size={20} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlBtn} onPress={() => {
          if (mapRef.current && mapRegion) {
            const newDelta = Math.max(mapRegion.latitudeDelta / 3, 0.002);
            mapRef.current.animateToRegion({
              ...mapRegion,
              latitudeDelta: newDelta,
              longitudeDelta: newDelta * ASPECT_RATIO,
            }, 300);
            setMapRegion(prev => ({ ...prev, latitudeDelta: newDelta, longitudeDelta: newDelta * ASPECT_RATIO }));
          }
        }}>
          <Ionicons name="add" size={22} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlBtn} onPress={() => {
          if (mapRef.current && mapRegion) {
            const newDelta = Math.min(mapRegion.latitudeDelta * 3, 5);
            mapRef.current.animateToRegion({
              ...mapRegion,
              latitudeDelta: newDelta,
              longitudeDelta: newDelta * ASPECT_RATIO,
            }, 300);
            setMapRegion(prev => ({ ...prev, latitudeDelta: newDelta, longitudeDelta: newDelta * ASPECT_RATIO }));
          }
        }}>
          <Ionicons name="remove" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Animated Bottom Sheet - Trips Panel */}
      <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
        <View style={styles.bottomSheetHandleArea} {...panResponder.panHandlers}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.sheetToggleHint}>Swipe to {sheetExpanded ? 'minimize' : 'expand'}</Text>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.statNumber}>{todayTrips.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>
              {todayTrips.filter(t => t.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>
              {todayTrips.filter(t => ['assigned', 'en_route', 'arrived', 'in_progress'].includes(t.status)).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Next Trip Card or Empty State */}
        {nextTrip ? (
          <TouchableOpacity 
            style={styles.nextTripCard}
            onPress={() => navigation.navigate('TripDetail', { trip: nextTrip })}
            activeOpacity={0.9}
          >
            <View style={styles.nextTripHeader}>
              <View style={styles.nextTripBadge}>
                <Text style={styles.nextTripBadgeText}>
                  {['en_route', 'arrived', 'in_progress'].includes(nextTrip.status) ? 'ACTIVE TRIP' : 'NEXT UP'}
                </Text>
              </View>
              <Text style={styles.nextTripTime}>
                {formatTime(nextTrip.scheduled_pickup_time || nextTrip.scheduled_time)}
              </Text>
            </View>

            <Text style={styles.nextTripCustomer}>{nextTrip.customer_name || 'Passenger'}</Text>
            
            <View style={styles.tripRoute}>
              <View style={styles.routePoint}>
                <View style={styles.routeDotGreen} />
                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>{nextTrip.pickup_location}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={styles.routeDotRed} />
                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>DROP-OFF</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>{nextTrip.dropoff_location}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripMeta}>
              <View style={styles.tripMetaItem}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.tripMetaText}>{nextTrip.distance_miles ? `${nextTrip.distance_miles} mi` : '8.2 mi'}</Text>
              </View>
              <View style={styles.tripMetaItem}>
                <Ionicons name="cash-outline" size={16} color="#10B981" />
                <Text style={styles.tripMetaPayout}>${nextTrip.driver_payout || nextTrip.base_fare || '25.00'}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TripDetail', { trip: nextTrip })}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>
                {nextTrip.status === 'assigned' ? 'Start Trip' : 'View Details'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="car-sport-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Active Trips</Text>
            <Text style={styles.emptySubtext}>
              {isCheckedIn
                ? 'New trips will appear here when assigned'
                : 'Go online to start receiving trips'}
            </Text>
          </View>
        )}

        {/* View All Trips Button */}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Trips')}
        >
          <Text style={styles.viewAllButtonText}>View All Trips</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
  },
  fullscreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  statusToggleActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    gap: 8,
  },
  mapControlBtn: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  bottomSheetHandleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  sheetToggleHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextTripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nextTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextTripBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  nextTripBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  nextTripTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  nextTripCustomer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tripRoute: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 5,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginTop: 5,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
    marginVertical: 4,
  },
  routeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 16,
  },
  tripMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripMetaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  tripMetaPayout: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyState: {
    backgroundColor: '#f8fafc',
    padding: 32,
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  viewAllButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginRight: 6,
  },
  viewAllArrow: {
    fontSize: 16,
    color: '#374151',
  },
});
