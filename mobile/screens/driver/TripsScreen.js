import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverAPI } from '../../services/api';

export default function DriverTripsScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('today'); // 'today', 'future', 'past'

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      // Load all trips for the driver
      const response = await driverAPI.getTrips(null);
      if (response.success) {
        setTrips(response.trips || []);
      }
    } catch (error) {
      console.error('Load trips error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const getFilteredTrips = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let filtered = [];

    if (tab === 'today') {
      // Today's trips: scheduled for today, not completed/cancelled
      filtered = trips.filter(trip => {
        const scheduledTime = new Date(trip.scheduled_time);
        return (
          scheduledTime >= todayStart &&
          scheduledTime < todayEnd &&
          !['completed', 'cancelled', 'no_show'].includes(trip.status)
        );
      });
      // Sort by scheduled_time ascending (earliest first)
      filtered.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    } else if (tab === 'future') {
      // Future trips: scheduled after today, not completed/cancelled
      filtered = trips.filter(trip => {
        const scheduledTime = new Date(trip.scheduled_time);
        return (
          scheduledTime >= todayEnd &&
          !['completed', 'cancelled', 'no_show'].includes(trip.status)
        );
      });
      // Sort by scheduled_time ascending (earliest first)
      filtered.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    } else if (tab === 'past') {
      // Past trips: completed, cancelled, or no_show
      filtered = trips.filter(trip =>
        ['completed', 'cancelled', 'no_show'].includes(trip.status)
      );
      // Sort by scheduled_time descending (most recent first)
      filtered.sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
    }

    return filtered;
  };

  const getTabCount = (tabName) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    if (tabName === 'today') {
      return trips.filter(trip => {
        const scheduledTime = new Date(trip.scheduled_time);
        return (
          scheduledTime >= todayStart &&
          scheduledTime < todayEnd &&
          !['completed', 'cancelled', 'no_show'].includes(trip.status)
        );
      }).length;
    } else if (tabName === 'future') {
      return trips.filter(trip => {
        const scheduledTime = new Date(trip.scheduled_time);
        return (
          scheduledTime >= todayEnd &&
          !['completed', 'cancelled', 'no_show'].includes(trip.status)
        );
      }).length;
    } else if (tabName === 'past') {
      return trips.filter(trip =>
        ['completed', 'cancelled', 'no_show'].includes(trip.status)
      ).length;
    }
    return 0;
  };

  const renderTrip = ({ item }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetail', { trip: item })}
      activeOpacity={0.7}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripTimeContainer}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.tripTime}>
            {new Date(item.scheduled_time || item.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, getBadgeStyle(item.status)]}>
          <Text style={styles.statusBadgeText}>{formatStatus(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.patientName}>
        {item.customer_name || (item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Unknown Patient')}
      </Text>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={styles.routeDotGreen} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.pickup_location || item.pickup_address}
            </Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={styles.routeDotRed} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>DROP-OFF</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.dropoff_location || item.dropoff_address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tripMeta}>
        {(item.distance || item.distance_miles) && (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.distance || item.distance_miles} mi</Text>
          </View>
        )}
        {item.service_level && (
          <View style={styles.metaItem}>
            <Ionicons name="car-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.service_level}</Text>
          </View>
        )}
        {(item.driver_payout || item.base_fare) && (
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#10B981" />
            <Text style={styles.metaPayout}>${item.driver_payout || item.base_fare}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const filteredTrips = getFilteredTrips();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'today' && styles.tabActive]}
          onPress={() => setTab('today')}
        >
          <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>
            Today
          </Text>
          <View style={[styles.tabBadge, tab === 'today' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, tab === 'today' && styles.tabBadgeTextActive]}>
              {getTabCount('today')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'future' && styles.tabActive]}
          onPress={() => setTab('future')}
        >
          <Text style={[styles.tabText, tab === 'future' && styles.tabTextActive]}>
            Future
          </Text>
          <View style={[styles.tabBadge, tab === 'future' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, tab === 'future' && styles.tabBadgeTextActive]}>
              {getTabCount('future')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
          <View style={[styles.tabBadge, tab === 'past' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, tab === 'past' && styles.tabBadgeTextActive]}>
              {getTabCount('past')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {tab === 'today' ? '📅' : tab === 'future' ? '🔮' : '📚'}
            </Text>
            <Text style={styles.emptyText}>
              {tab === 'today' ? 'No trips scheduled for today' :
               tab === 'future' ? 'No upcoming trips' :
               'No past trips'}
            </Text>
            <Text style={styles.emptySubtext}>
              {tab === 'today' ? 'New trips will appear here when assigned' :
               tab === 'future' ? 'Future trips will show up here' :
               'Your completed trips will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatStatus(status) {
  const statusMap = {
    assigned: 'Assigned',
    en_route: 'En Route',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };
  return statusMap[status] || status;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${day} at ${time}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTripTypeStyle(isReturn) {
  return {
    backgroundColor: isReturn ? '#3b82f6' : '#10b981', // Blue for DO/return, Green for PU/outbound
  };
}

function getTimeUntil(scheduledTime) {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const diffMs = scheduled - now;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 0) return 'Now';
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

function getBadgeStyle(status) {
  switch (status) {
    case 'assigned':
      return { backgroundColor: '#3b82f6' };
    case 'en_route':
      return { backgroundColor: '#f59e0b' };
    case 'arrived':
      return { backgroundColor: '#ea580c' };
    case 'in_progress':
      return { backgroundColor: '#8b5cf6' };
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  },
  tabActive: {
    borderBottomColor: '#FF3B30',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 6,
  },
  tabTextActive: {
    color: '#FF3B30',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#00bcd4',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
    height: 16,
    backgroundColor: '#D1D5DB',
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaPayout: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  tripNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  addressSection: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  cityText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  tripBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  timeRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  expandButton: {
    padding: 4,
  },
  expandIcon: {
    fontSize: 20,
    color: '#6b7280',
  },
  completedBanner: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
