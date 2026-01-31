import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { patientAPI } from '../../services/api';

export default function PatientBookTripScreen({ navigation }) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBookTrip = async () => {
    if (!pickup || !dropoff || !date || !time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const scheduledTime = new Date(`${date}T${time}`).toISOString();
      const response = await patientAPI.requestTrip({
        pickup_location: pickup,
        dropoff_location: dropoff,
        scheduled_time: scheduledTime,
        service_level: 'ambulatory',
        journey_type: 'one-way',
        notes
      });

      if (response.success) {
        Alert.alert('Success', 'Trip requested successfully!');
        navigation.navigate('Trips');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book New Trip</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Pickup Location *</Text>
        <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Enter pickup address" />

        <Text style={styles.label}>Dropoff Location *</Text>
        <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} placeholder="Enter dropoff address" />

        <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2024-01-15" />

        <Text style={styles.label}>Time * (HH:MM)</Text>
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="14:30" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Any special requirements" multiline numberOfLines={4} />

        <TouchableOpacity style={styles.button} onPress={handleBookTrip} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Booking...' : 'Book Trip'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { backgroundColor: '#10b981', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
