import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { patientAPI } from '../../services/api';

export default function PatientTripsScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const response = await patientAPI.getTrips();
      if (response.success) {
        setTrips(response.trips || []);
      }
    } catch (error) {
      console.error('Load trips error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
      </View>
      <FlatList
        data={trips}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tripCard} onPress={() => navigation.navigate('TripDetail', { trip: item })}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripNumber}>{item.trip_number}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.tripDate}>{new Date(item.scheduled_time).toLocaleString()}</Text>
            <Text style={styles.tripLocation}>📍 {item.pickup_location}</Text>
            <Text style={styles.tripLocation}>🏥 {item.dropoff_location}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTrips} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { backgroundColor: '#10b981', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  list: { padding: 16 },
  tripCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tripNumber: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  badge: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  tripDate: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tripLocation: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
});
