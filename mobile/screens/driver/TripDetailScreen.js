import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { driverAPI, supabase } from '../../services/api';
import { locationService } from '../../services/locationService';
import SignatureCapture from '../../components/SignatureCapture';

export default function DriverTripDetailScreen({ route, navigation }) {
  const [trip, setTrip] = useState(route.params?.trip);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureType, setSignatureType] = useState('pickup');
  const [pendingStatus, setPendingStatus] = useState(null);

  useEffect(() => {
    getCurrentLocation();
    subscribeToTripUpdates();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  let subscription = null;

  const subscribeToTripUpdates = () => {
    subscription = supabase
      .channel(`trip:${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${trip.id}`,
        },
        (payload) => {
          console.log('Trip updated:', payload.new);
          setTrip(payload.new);
        }
      )
      .subscribe();
  };

  const getCurrentLocation = async () => {
    if (Platform.OS === 'web') {
      console.log('Location not available on web');
      return;
    }

    try {
      const Location = require('expo-location');
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleRequestSignature = (status, sigType) => {
    setPendingStatus(status);
    setSignatureType(sigType);
    setShowSignatureModal(true);
  };

  const handleSignatureSaved = async (signatureData) => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable GPS.');
      return;
    }

    setLoading(true);
    try {
      const response = await driverAPI.saveSignature(trip.id, {
        ...signatureData,
        location_lat: location.latitude,
        location_lng: location.longitude,
      });

      if (response.success) {
        await handleUpdateStatus(pendingStatus, '', true);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save signature');
    } finally {
      setLoading(false);
      setPendingStatus(null);
    }
  };

  const handleUpdateStatus = async (newStatus, notes = '', skipConfirm = false) => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable GPS.');
      return;
    }

    if (newStatus === 'in_progress' && !skipConfirm) {
      handleRequestSignature(newStatus, 'pickup');
      return;
    }

    const statusMessages = {
      'en_route': 'En Route to Pickup',
      'arrived': 'Arrived at Pickup',
      'in_progress': 'Picked Up Patient',
      'dropped_off': 'Dropped Off Patient',
      'completed': 'Complete Trip',
      'no-show': 'Mark as No-Show'
    };

    const confirmUpdate = async () => {
      setLoading(true);
      try {
        const response = await driverAPI.updateTripStatus(
          trip.id,
          newStatus,
          location.latitude,
          location.longitude,
          notes
        );

        if (response.success) {
          setTrip(response.trip);

          if (newStatus === 'in_progress' && !isTrackingLocation) {
            setIsTrackingLocation(true);
            Alert.alert(
              'Success',
              'Patient picked up! Signature captured. Real-time tracking is now active.',
              [{ text: 'OK' }]
            );
          } else if (newStatus === 'completed' || newStatus === 'no-show') {
            setIsTrackingLocation(false);
            Alert.alert(
              'Success',
              `Trip ${newStatus === 'completed' ? 'completed' : 'marked as no-show'} successfully!`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          } else {
            Alert.alert('Success', `Status updated to: ${statusMessages[newStatus]}`);
          }
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to update status');
      } finally {
        setLoading(false);
      }
    };

    if (skipConfirm) {
      await confirmUpdate();
    } else {
      Alert.alert(
        'Confirm Status Update',
        `Mark trip as: ${statusMessages[newStatus] || newStatus}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: confirmUpdate },
        ]
      );
    }
  };

  const openNavigation = () => {
    const destination = trip.pickup_location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destination
    )}`;
    Linking.openURL(url);
  };

  const callCustomer = () => {
    Linking.openURL(`tel:${trip.customer_phone}`);
  };

  const getTripProgress = () => {
    const steps = [
      { key: 'assigned', label: 'Assigned', icon: '📋' },
      { key: 'en_route', label: 'En Route', icon: '🚗' },
      { key: 'arrived', label: 'Arrived', icon: '📍' },
      { key: 'in_progress', label: 'Picked Up', icon: '👤' },
      { key: 'dropped_off', label: 'Dropped Off', icon: '🏥' },
      { key: 'completed', label: 'Completed', icon: '✅' }
    ];

    const currentIndex = steps.findIndex(s => s.key === trip.status);
    return { steps, currentIndex };
  };

  const { steps, currentIndex } = getTripProgress();

  return (
    <>
      <SignatureCapture
        visible={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setPendingStatus(null);
        }}
        onSave={handleSignatureSaved}
        title={signatureType === 'pickup' ? 'Pickup Signature' : 'Dropoff Signature'}
        signerName={trip.customer_name || 'Passenger'}
        signatureType={signatureType}
      />
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tripNumber}>{trip.trip_number}</Text>
        <View style={[styles.badge, getBadgeStyle(trip.status)]}>
          <Text style={styles.badgeText}>{trip.status}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Trip Progress</Text>
        <View style={styles.progressBar}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  index <= currentIndex && styles.progressDotActive,
                  index === currentIndex && styles.progressDotCurrent
                ]}
              >
                <Text style={styles.progressIcon}>{step.icon}</Text>
              </View>
              <Text style={[
                styles.progressLabel,
                index <= currentIndex && styles.progressLabelActive
              ]}>
                {step.label}
              </Text>
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  index < currentIndex && styles.progressLineActive
                ]} />
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.customerName}>{trip.customer_name}</Text>
          <TouchableOpacity onPress={callCustomer}>
            <Text style={styles.phoneLink}>📱 {trip.customer_phone}</Text>
          </TouchableOpacity>
          {trip.patients?.special_needs && (
            <View style={styles.alert}>
              <Text style={styles.alertText}>
                ⚠️ {trip.patients.special_needs}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service Level:</Text>
            <Text style={styles.value}>{trip.service_level || 'ambulatory'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Journey Type:</Text>
            <Text style={styles.value}>{trip.journey_type || 'one-way'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.value}>{trip.distance || '0'} miles</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Scheduled:</Text>
            <Text style={styles.value}>
              {new Date(trip.scheduled_time).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Your Payout:</Text>
            <Text style={styles.payoutValue}>${trip.driver_payout || '0.00'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Locations</Text>
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>📍 Pickup Location</Text>
          <Text style={styles.locationAddress}>{trip.pickup_location}</Text>
        </View>
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>🏥 Dropoff Location</Text>
          <Text style={styles.locationAddress}>{trip.dropoff_location}</Text>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
          <Text style={styles.navButtonText}>🗺️ Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {trip.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        {trip.status === 'assigned' && (
          <>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.enrouteButton]}
              onPress={() => handleUpdateStatus('en_route')}
              disabled={loading}
            >
              <Text style={styles.quickActionIcon}>🚗</Text>
              <Text style={styles.quickActionText}>En Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.arrivedButton]}
              onPress={() => handleUpdateStatus('arrived')}
              disabled={loading}
            >
              <Text style={styles.quickActionIcon}>📍</Text>
              <Text style={styles.quickActionText}>Arrived</Text>
            </TouchableOpacity>
          </>
        )}

        {(trip.status === 'arrived' || trip.status === 'en_route') && (
          <TouchableOpacity
            style={[styles.quickActionButton, styles.pickedUpButton]}
            onPress={() => handleUpdateStatus('in_progress')}
            disabled={loading}
          >
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Picked Up</Text>
          </TouchableOpacity>
        )}

        {trip.status === 'in_progress' && (
          <>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.droppedOffButton]}
              onPress={() => handleUpdateStatus('dropped_off')}
              disabled={loading}
            >
              <Text style={styles.quickActionIcon}>🏥</Text>
              <Text style={styles.quickActionText}>Dropped Off</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.completeButton]}
              onPress={() => handleUpdateStatus('completed', 'Trip completed successfully')}
              disabled={loading}
            >
              <Text style={styles.quickActionIcon}>✅</Text>
              <Text style={styles.quickActionText}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.noShowButton]}
              onPress={() => handleUpdateStatus('no-show', 'Patient did not show up')}
              disabled={loading}
            >
              <Text style={styles.quickActionIcon}>❌</Text>
              <Text style={styles.quickActionText}>No-Show</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
    </>
  );
}

function getBadgeStyle(status) {
  switch (status) {
    case 'assigned':
      return { backgroundColor: '#dbeafe' };
    case 'in_progress':
      return { backgroundColor: '#fef3c7' };
    case 'completed':
      return { backgroundColor: '#d1fae5' };
    default:
      return { backgroundColor: '#f3f4f6' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2c4f5e',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  phoneLink: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  alert: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertText: {
    fontSize: 14,
    color: '#92400e',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  locationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  locationAddress: {
    fontSize: 16,
    color: '#1f2937',
  },
  navButton: {
    backgroundColor: '#00bcd4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  actionsSection: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  enrouteButton: {
    backgroundColor: '#3b82f6',
  },
  arrivedButton: {
    backgroundColor: '#8b5cf6',
  },
  pickedUpButton: {
    backgroundColor: '#10b981',
    width: '100%',
  },
  droppedOffButton: {
    backgroundColor: '#f59e0b',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  noShowButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#b2ebf2',
  },
  progressDotCurrent: {
    backgroundColor: '#00bcd4',
    transform: [{ scale: 1.1 }],
  },
  progressIcon: {
    fontSize: 20,
  },
  progressLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  progressLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#e5e7eb',
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: '#00bcd4',
  },
});
