import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { patientAPI } from '../../services/api';

export default function PatientTripDetailScreen({ route, navigation }) {
  const [trip, setTrip] = useState(route.params?.trip);

  const handleCancel = () => {
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await patientAPI.cancelTrip(trip.id, 'Cancelled by patient');
            Alert.alert('Success', 'Trip cancelled');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tripNumber}>{trip.trip_number}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{trip.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <Text style={styles.label}>Scheduled Time:</Text>
        <Text style={styles.value}>{new Date(trip.scheduled_time).toLocaleString()}</Text>

        <Text style={styles.label}>Pickup Location:</Text>
        <Text style={styles.value}>📍 {trip.pickup_location}</Text>

        <Text style={styles.label}>Dropoff Location:</Text>
        <Text style={styles.value}>🏥 {trip.dropoff_location}</Text>

        {trip.drivers && (
          <>
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{trip.drivers.name}</Text>
            <Text style={styles.value}>📱 {trip.drivers.phone}</Text>
          </>
        )}
      </View>

      {(trip.status === 'pending' || trip.status === 'assigned') && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Trip</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { backgroundColor: '#10b981', padding: 24, flexDirection: 'row', justifyContent: 'space-between' },
  tripNumber: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  badge: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  value: { fontSize: 16, color: '#1f2937', marginTop: 4 },
  cancelButton: { margin: 16, padding: 16, backgroundColor: '#ef4444', borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
