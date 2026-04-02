import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI, supabase } from '../../services/api';
import { COLORS, SHADOWS } from '../../theme';

// ── Helpers ──

// All possible DB statuses that mean "finished" (not active)
const FINISHED_STATUSES = ['completed', 'cancelled', 'no_show'];

// All possible DB statuses that mean "active" (in progress right now)
const ACTIVE_STATUSES = ['en_route_pickup', 'arrived_pickup', 'patient_loaded', 'en_route_dropoff', 'arrived_dropoff'];

function getPickupTime(trip) {
  // Backend returns scheduled_pickup_time as the DB column name
  return trip.scheduled_pickup_time || trip.scheduledPickupTime || trip.scheduled_time;
}

function formatStatus(status) {
  const statusMap = {
    scheduled: 'Scheduled',
    assigned: 'Assigned',
    en_route_pickup: 'En Route to Pickup',
    arrived_pickup: 'At Pickup',
    patient_loaded: 'Patient Loaded',
    en_route_dropoff: 'En Route to Drop-off',
    arrived_dropoff: 'At Drop-off',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    // Frontend aliases
    pending: 'Pending',
    en_route: 'En Route',
    arrived: 'Arrived',
    in_progress: 'In Progress',
  };
  return statusMap[status] || (status || 'Unknown').replace(/_/g, ' ');
}

function getBadgeStyle(status) {
  switch (status) {
    case 'scheduled':
    case 'pending':
      return { backgroundColor: '#6366f1' };
    case 'assigned':
      return { backgroundColor: '#3b82f6' };
    case 'en_route_pickup':
    case 'en_route':
      return { backgroundColor: '#f59e0b' };
    case 'arrived_pickup':
    case 'arrived':
      return { backgroundColor: '#ea580c' };
    case 'patient_loaded':
    case 'in_progress':
      return { backgroundColor: '#8b5cf6' };
    case 'en_route_dropoff':
      return { backgroundColor: '#d97706' };
    case 'arrived_dropoff':
      return { backgroundColor: '#c2410c' };
    case 'completed':
      return { backgroundColor: '#10b981' };
    case 'cancelled':
      return { backgroundColor: '#ef4444' };
    case 'no_show':
      return { backgroundColor: '#6b7280' };
    default:
      return { backgroundColor: '#6b7280' };
  }
}

function getTimeUntil(scheduledTime) {
  if (!scheduledTime) return '';
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const diffMs = scheduled - now;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < -5) return 'Overdue';
  if (diffMins < 0) return 'Now';
  if (diffMins < 60) return `in ${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
}

// ── Component ──

export default function DriverTripsScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('today');
  const [showPast, setShowPast] = useState(false);
  const [pastFilter, setPastFilter] = useState('all');
  const [driverId, setDriverId] = useState(null);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    loadDriverId();
    loadTrips();
    return () => {
      // Cleanup real-time subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Set up real-time subscription once we have driverId
  useEffect(() => {
    if (!driverId) return;

    console.log('[Trips] Setting up real-time subscription for driver:', driverId);

    const channel = supabase
      .channel(`driver-trips-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          console.log('[Trips] Real-time update:', payload.eventType, payload.new?.id);
          // Reload all trips on any change
          loadTrips(true);
        }
      )
      .subscribe((status) => {
        console.log('[Trips] Subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const loadDriverId = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setDriverId(profile.id);
        console.log('[Trips] Driver ID loaded:', profile.id);
      }
    } catch (e) {
      console.log('[Trips] Could not load driver ID:', e);
    }
  };

  const loadTrips = async (silent = false) => {
    try {
      if (!silent) setError(null);
      console.log('[Trips] Fetching trips from API...');
      const response = await driverAPI.getTrips();
      console.log('[Trips] API response:', response.success, 'trips:', response.trips?.length);

      if (response.success) {
        const tripList = response.trips || [];
        setTrips(tripList);

        // Debug: log first trip's fields to verify column names
        if (tripList.length > 0) {
          const t = tripList[0];
          console.log('[Trips] Sample trip fields:', {
            id: t.id,
            status: t.status,
            scheduled_pickup_time: t.scheduled_pickup_time,
            pickup_address: t.pickup_address,
            patient_name: t.patient_name,
            rider: t.rider,
          });
        } else {
          console.log('[Trips] No trips returned from API');
        }
      } else {
        setError('Failed to load trips');
      }
    } catch (err) {
      console.error('[Trips] Load error:', err.message);
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, []);

  // ── Filtering ──

  const getDateBounds = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    return { todayStart, todayEnd };
  };

  const getTodayTrips = () => {
    const { todayStart, todayEnd } = getDateBounds();
    return trips.filter(trip => {
      if (FINISHED_STATUSES.includes(trip.status)) return false;
      const pickupTime = new Date(getPickupTime(trip));
      if (isNaN(pickupTime.getTime())) return false;
      return pickupTime >= todayStart && pickupTime < todayEnd;
    }).sort((a, b) => new Date(getPickupTime(a)) - new Date(getPickupTime(b)));
  };

  const getFutureTrips = () => {
    const { todayEnd } = getDateBounds();
    return trips.filter(trip => {
      const pickupTime = new Date(getPickupTime(trip));
      if (isNaN(pickupTime.getTime())) return false;
      return pickupTime >= todayEnd && !FINISHED_STATUSES.includes(trip.status);
    }).sort((a, b) => new Date(getPickupTime(a)) - new Date(getPickupTime(b)));
  };

  // A trip is "missed" if it's still 'assigned' (never started) but its pickup date has passed
  const isMissedTrip = (trip) => {
    const { todayStart } = getDateBounds();
    if (trip.status !== 'assigned') return false;
    const pickupTime = new Date(getPickupTime(trip));
    return !isNaN(pickupTime.getTime()) && pickupTime < todayStart;
  };

  const getPastTrips = () => {
    const { todayStart } = getDateBounds();
    // Only show past 30 days
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return trips.filter(trip => {
      const isFinished = FINISHED_STATUSES.includes(trip.status);
      const pickupTime = new Date(getPickupTime(trip));
      const isValid = !isNaN(pickupTime.getTime());
      const isPastDate = isValid && pickupTime < todayStart;
      const isWithin30Days = isValid && pickupTime >= thirtyDaysAgo;
      const isPast = (isFinished || isPastDate) && isWithin30Days;
      if (!isPast) return false;

      // Apply past filter
      if (pastFilter === 'completed') return trip.status === 'completed';
      if (pastFilter === 'missed') return isMissedTrip(trip);
      return true; // 'all'
    }).sort((a, b) => new Date(getPickupTime(b)) - new Date(getPickupTime(a)));
  };

  const getFilteredTrips = () => {
    if (tab === 'today') return getTodayTrips();
    if (tab === 'future') return getFutureTrips();
    if (tab === 'past') return getPastTrips();
    return [];
  };

  const todayCount = getTodayTrips().length;
  const futureCount = getFutureTrips().length;
  const pastCount = getPastTrips().length;

  // ── Render Trip Card ──

  const renderTrip = ({ item }) => {
    const pickupTime = getPickupTime(item);
    const isActive = ACTIVE_STATUSES.includes(item.status);
    const isFinished = FINISHED_STATUSES.includes(item.status);
    const isMissed = isMissedTrip(item);
    const patientName = item.patient_name || item.rider || 'Unknown Patient';

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          isActive && styles.tripCardActive,
          isFinished && styles.tripCardFinished,
          isMissed && styles.tripCardMissed,
        ]}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
        activeOpacity={0.7}
      >
        {/* Active trip indicator */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        )}

        {/* Missed trip indicator */}
        {isMissed && (
          <View style={styles.missedIndicator}>
            <Ionicons name="alert-circle" size={14} color="#ef4444" />
            <Text style={styles.missedText}>MISSED</Text>
          </View>
        )}

        <View style={styles.tripHeader}>
          <View style={styles.tripTimeContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.tripTime}>
              {pickupTime ? new Date(pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
            </Text>
            {tab === 'today' && !FINISHED_STATUSES.includes(item.status) && (
              <Text style={styles.timeUntil}>{getTimeUntil(pickupTime)}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, getBadgeStyle(item.status)]}>
            <Text style={styles.statusBadgeText}>{formatStatus(item.status)}</Text>
          </View>
        </View>

        {/* Trip number if available */}
        {item.trip_number && (
          <Text style={styles.tripNumber}>#{item.trip_number}</Text>
        )}

        <Text style={styles.patientName}>{patientName}</Text>

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={styles.routeDotGreen} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>
                {item.pickup_address || 'Address not set'}
              </Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={styles.routeDotRed} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>DROP-OFF</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>
                {item.dropoff_address || 'Address not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appointment time if set */}
        {item.appointment_time && (
          <View style={styles.appointmentRow}>
            <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
            <Text style={styles.appointmentText}>
              Appt: {new Date(item.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        <View style={styles.tripMeta}>
          {item.service_level && (
            <View style={styles.metaItem}>
              <Ionicons name="medical-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.service_level}</Text>
            </View>
          )}
          {(item.distance || item.distance_miles) ? (
            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.distance || item.distance_miles} mi</Text>
            </View>
          ) : null}
          {item.driver_payout ? (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={14} color={COLORS.success} />
              <Text style={styles.metaPayout}>${Number(item.driver_payout).toFixed(2)}</Text>
            </View>
          ) : null}
        </View>

        {/* Future trips: show date */}
        {tab === 'future' && pickupTime && (
          <View style={styles.futureDateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.seafoam} />
            <Text style={styles.futureDateText}>
              {new Date(pickupTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}

        {/* Past trips: always show date */}
        {tab === 'past' && pickupTime && (
          <View style={styles.pastDateRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.pastDateText}>
              {new Date(pickupTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Loading State ──

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.seafoam} />
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  const filteredTrips = getFilteredTrips();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Trips</Text>
          <Text style={styles.headerCount}>{trips.length} total</Text>
        </View>
      </View>

      {/* Tab Navigation — Today + Future always visible */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'today' && styles.tabActive]}
          onPress={() => { setTab('today'); setShowPast(false); }}
        >
          <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>Today</Text>
          <View style={[styles.tabBadge, tab === 'today' && styles.tabBadgeActive]}>
            <Text style={styles.tabBadgeText}>{todayCount}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'future' && styles.tabActive]}
          onPress={() => { setTab('future'); setShowPast(false); }}
        >
          <Text style={[styles.tabText, tab === 'future' && styles.tabTextActive]}>Upcoming</Text>
          <View style={[styles.tabBadge, tab === 'future' && styles.tabBadgeActive]}>
            <Text style={styles.tabBadgeText}>{futureCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Past Trip Filter Chips */}
      {tab === 'past' && (
        <View style={styles.filterChipsContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'missed', label: 'Missed' },
          ].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, pastFilter === filter.key && styles.filterChipActive]}
              onPress={() => setPastFilter(filter.key)}
            >
              <Text style={[styles.filterChipText, pastFilter === filter.key && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Error banner */}
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => { setError(null); loadTrips(); }}>
          <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Trip List */}
      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.seafoam]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={tab === 'today' ? 'calendar-outline' : tab === 'future' ? 'time-outline' : 'archive-outline'}
              size={56}
              color={COLORS.textLight}
            />
            <Text style={styles.emptyText}>
              {tab === 'today' ? 'No trips for today' :
               tab === 'future' ? 'No upcoming trips' :
               'No past trips'}
            </Text>
            <Text style={styles.emptySubtext}>
              {tab === 'today' ? 'Trips will appear here when assigned to you' :
               tab === 'future' ? 'Future trip assignments will show here' :
               'Your completed trips will appear here'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color={COLORS.seafoam} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          tab !== 'past' && pastCount > 0 ? (
            <TouchableOpacity
              style={styles.viewPastButton}
              onPress={() => setTab('past')}
            >
              <Ionicons name="archive-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.viewPastText}>View {pastCount} past trip{pastCount !== 1 ? 's' : ''}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : tab === 'past' ? (
            <TouchableOpacity
              style={styles.viewPastButton}
              onPress={() => setTab('today')}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.seafoam} />
              <Text style={[styles.viewPastText, { color: COLORS.seafoam }]}>Back to today</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGrey,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.softGrey,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.navy,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  headerCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: COLORS.seafoam,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.seafoam,
  },
  tabBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: COLORS.seafoam,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '500',
  },
  errorRetry: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  // ── Trip Card ──
  tripCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  tripCardActive: {
    borderColor: COLORS.seafoam,
    borderWidth: 2,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.seafoam,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.seafoam,
    letterSpacing: 0.5,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripTime: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeUntil: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.seafoam,
    marginLeft: 4,
  },
  tripNumber: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 12,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    marginTop: 5,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    marginTop: 5,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  appointmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaPayout: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  futureDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  futureDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.seafoam,
  },
  tripCardFinished: {
    opacity: 0.75,
    borderColor: COLORS.divider,
    borderWidth: 1,
  },
  tripCardMissed: {
    opacity: 0.85,
    borderColor: '#fca5a5',
    borderWidth: 1.5,
  },
  missedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  missedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.softGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.textWhite,
  },
  pastDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  pastDateText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  // ── Empty State ──
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.seafoam,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.seafoam,
  },
  // ── View Past Button ──
  viewPastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewPastText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
