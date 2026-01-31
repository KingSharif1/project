import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientAPI } from '../../services/api';

export default function PatientHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }
      const response = await patientAPI.getTrips(true);
      if (response.success) {
        setUpcomingTrips(response.trips?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{profile?.first_name || 'Patient'}</Text>
      </View>

      <TouchableOpacity style={styles.bookButton} onPress={() => navigation.navigate('Book')}>
        <Text style={styles.bookButtonText}>➕ Book New Trip</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Trips</Text>
        {upcomingTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming trips</Text>
          </View>
        ) : (
          upcomingTrips.map((trip) => (
            <TouchableOpacity key={trip.id} style={styles.tripCard} onPress={() => navigation.navigate('TripDetail', { trip })}>
              <Text style={styles.tripDate}>{new Date(trip.scheduled_time).toLocaleDateString()}</Text>
              <Text style={styles.tripLocation}>📍 {trip.pickup_location}</Text>
              <Text style={styles.tripLocation}>🏥 {trip.dropoff_location}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#10b981' },
  greeting: { fontSize: 16, color: '#d1fae5' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  bookButton: { margin: 16, padding: 20, backgroundColor: '#10b981', borderRadius: 12, alignItems: 'center' },
  bookButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  tripCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  tripDate: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tripLocation: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
