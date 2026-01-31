import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data for earnings - will be replaced with real API data
const MOCK_EARNINGS = {
  today: { amount: 145.50, trips: 6 },
  thisWeek: { amount: 892.75, trips: 34 },
  thisMonth: { amount: 3245.00, trips: 142 },
  pending: 245.00,
  lastPayout: { amount: 1850.00, date: '2024-12-20' },
};

const MOCK_RECENT_TRIPS = [
  { id: 1, date: '2024-12-27', pickup: '123 Main St', dropoff: 'Medical Center', amount: 28.50, status: 'completed', time: '9:30 AM' },
  { id: 2, date: '2024-12-27', pickup: '456 Oak Ave', dropoff: 'City Hospital', amount: 35.00, status: 'completed', time: '11:15 AM' },
  { id: 3, date: '2024-12-27', pickup: '789 Pine Rd', dropoff: 'Rehab Center', amount: 22.00, status: 'completed', time: '2:00 PM' },
  { id: 4, date: '2024-12-26', pickup: '321 Elm St', dropoff: 'Dialysis Clinic', amount: 45.00, status: 'completed', time: '8:00 AM' },
  { id: 5, date: '2024-12-26', pickup: '654 Maple Dr', dropoff: 'VA Hospital', amount: 32.50, status: 'completed', time: '10:30 AM' },
];

export default function EarningsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [earnings, setEarnings] = useState(MOCK_EARNINGS);
  const [recentTrips, setRecentTrips] = useState(MOCK_RECENT_TRIPS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }
      // TODO: Load real earnings data from API
    } catch (error) {
      console.log('Load earnings error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const getPeriodEarnings = () => {
    switch (selectedPeriod) {
      case 'today': return earnings.today;
      case 'week': return earnings.thisWeek;
      case 'month': return earnings.thisMonth;
      default: return earnings.thisWeek;
    }
  };

  const currentEarnings = getPeriodEarnings();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#059669', '#10b981']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Earnings</Text>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => {
              const earningsText = `Earnings Report\n\n${selectedPeriod === 'today' ? "Today's" : selectedPeriod === 'week' ? "This Week's" : "This Month's"} Earnings: ${formatCurrency(currentEarnings.amount)}\nTrips: ${currentEarnings.trips}\nPending: ${formatCurrency(earnings.pending)}\n\nRecent Trips:\n${recentTrips.slice(0, 5).map(trip => `${trip.date} - ${trip.pickup} to ${trip.dropoff}: ${formatCurrency(trip.amount)}`).join('\n')}`;
              Share.share({
                message: earningsText,
                title: 'Earnings Report',
              }).catch(err => Alert.alert('Error', 'Could not export earnings'));
            }}
          >
            <Ionicons name="download-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Earnings Display */}
        <View style={styles.mainEarnings}>
          <Text style={styles.earningsLabel}>
            {selectedPeriod === 'today' ? "Today's Earnings" : 
             selectedPeriod === 'week' ? "This Week" : "This Month"}
          </Text>
          <Text style={styles.earningsAmount}>{formatCurrency(currentEarnings.amount)}</Text>
          <Text style={styles.tripsCount}>{currentEarnings.trips} trips completed</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['today', 'week', 'month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
                {period === 'today' ? 'Today' : period === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.statIconText}>⏳</Text>
            </View>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{formatCurrency(earnings.pending)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statIconText}>💳</Text>
            </View>
            <Text style={styles.statLabel}>Last Payout</Text>
            <Text style={styles.statValue}>{formatCurrency(earnings.lastPayout.amount)}</Text>
          </View>
        </View>

        {/* Payout Info Card */}
        <View style={styles.payoutCard}>
          <View style={styles.payoutHeader}>
            <Text style={styles.payoutTitle}>Next Payout</Text>
            <View style={styles.payoutBadge}>
              <Text style={styles.payoutBadgeText}>Friday</Text>
            </View>
          </View>
          <Text style={styles.payoutAmount}>{formatCurrency(earnings.pending)}</Text>
          <Text style={styles.payoutSubtext}>Deposited to your bank account ending in ****4521</Text>
          <TouchableOpacity style={styles.payoutButton}>
            <Text style={styles.payoutButtonText}>View Payout Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Trips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Trips')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentTrips.slice(0, 5).map((trip) => (
            <View key={trip.id} style={styles.tripItem}>
              <View style={styles.tripLeft}>
                <Text style={styles.tripTime}>{trip.time}</Text>
                <Text style={styles.tripRoute} numberOfLines={1}>
                  {trip.pickup} → {trip.dropoff}
                </Text>
                <Text style={styles.tripDate}>{trip.date}</Text>
              </View>
              <View style={styles.tripRight}>
                <Text style={styles.tripAmount}>{formatCurrency(trip.amount)}</Text>
                <View style={styles.tripStatusBadge}>
                  <Text style={styles.tripStatusText}>Paid</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base Fare</Text>
              <Text style={styles.breakdownValue}>$2,450.00</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Mileage</Text>
              <Text style={styles.breakdownValue}>$645.00</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Wait Time</Text>
              <Text style={styles.breakdownValue}>$85.00</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tips</Text>
              <Text style={styles.breakdownValue}>$65.00</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>{formatCurrency(earnings.thisMonth.amount)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  exportButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  mainEarnings: {
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  tripsCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: '#fff',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  periodButtonTextActive: {
    color: '#059669',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  payoutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  payoutBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payoutBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  payoutAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  payoutSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  payoutButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  payoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tripLeft: {
    flex: 1,
    marginRight: 12,
  },
  tripTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tripRight: {
    alignItems: 'flex-end',
  },
  tripAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  tripStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tripStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
});
