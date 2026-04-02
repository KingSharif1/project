import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverAPI, supabase } from '../../services/api';
import { COLORS, SHADOWS, TRIP_STATUS, TRIP_FLOW, getNextStatus, getNextStatusLabel } from '../../theme';
import SignatureCapture from '../../components/SignatureCapture';
import { showToast, showConfirm } from '../../components/CustomToast';
import { locationService } from '../../services/locationService';

// DB TripStatus enum values
const FINISHED_STATUSES = ['completed', 'cancelled', 'no_show'];

export default function DriverTripDetailScreen({ route, navigation }) {
  const [trip, setTrip] = useState(route.params?.trip);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();

    // Real-time subscription for this trip
    const channel = supabase
      .channel(`trip-detail-${trip.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.id}` },
        (payload) => {
          console.log('[TripDetail] Real-time update:', payload.new?.status);
          setTrip(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCurrentLocation = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[TripDetail] Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (error) {
      console.error('[TripDetail] Location error:', error);
    }
  };

  // ── Signature Flow ──

  const handleSignatureSaved = async (signatureData) => {
    setLoading(true);
    try {
      // Save signature to backend
      await driverAPI.saveSignature(trip.id, {
        ...signatureData,
        location_lat: location?.latitude || null,
        location_lng: location?.longitude || null,
      });

      // Now advance to patient_loaded
      const lat = location?.latitude || null;
      const lng = location?.longitude || null;
      const response = await driverAPI.updateTripStatus(trip.id, 'patient_loaded', lat, lng);

      if (response.success) {
        setTrip(response.trip);
        showToast('success', 'Signature Saved', 'Patient loaded successfully');
        console.log('[TripDetail] Signature saved, status → patient_loaded');
      }
    } catch (error) {
      showToast('error', 'Error', error.message || 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  // ── Status Update ──

  const handleUpdateStatus = async (newStatus) => {
    const statusLabel = TRIP_STATUS[newStatus]?.label || newStatus;

    // Require signature before patient_loaded
    if (newStatus === 'patient_loaded') {
      setShowSignature(true);
      return;
    }

    const statusIcon = TRIP_STATUS[newStatus]?.icon || 'arrow-forward';
    const statusColor = TRIP_STATUS[newStatus]?.color || COLORS.seafoam;

    const confirmed = await showConfirm({
      title: 'Update Status',
      message: `Mark this trip as "${statusLabel}"?`,
      confirmText: statusLabel,
      confirmColor: statusColor,
      icon: statusIcon,
      iconColor: statusColor,
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const lat = location?.latitude || null;
      const lng = location?.longitude || null;
      const response = await driverAPI.updateTripStatus(trip.id, newStatus, lat, lng);

      if (response.success) {
        setTrip(response.trip);
        console.log('[TripDetail] Status updated to:', newStatus);

        // Start breadcrumb tracking when trip becomes active
        if (newStatus === 'en_route_pickup') {
          locationService.setActiveTripId(trip.id);
        }
        // Stop breadcrumb tracking when trip finishes
        if (FINISHED_STATUSES.includes(newStatus)) {
          locationService.setActiveTripId(null);
        }

        if (FINISHED_STATUSES.includes(newStatus)) {
          showToast(
            newStatus === 'completed' ? 'success' : 'warning',
            newStatus === 'completed' ? 'Trip Completed' : 'No Show',
            newStatus === 'completed' ? 'Great job! Trip completed successfully.' : 'Trip marked as no show.',
            4000
          );
          setTimeout(() => navigation.goBack(), 1500);
        } else {
          showToast('success', 'Status Updated', `Trip is now: ${statusLabel}`);
        }
      }
    } catch (error) {
      showToast('error', 'Update Failed', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──

  const pickupTime = trip.scheduled_pickup_time || trip.scheduledPickupTime;
  const patientName = trip.patient_name || trip.rider || 'Unknown Patient';
  const patientPhone = trip.patient_phone || trip.phone || '';
  const pickupAddr = trip.pickup_address || 'Not set';
  const dropoffAddr = trip.dropoff_address || 'Not set';
  const isFinished = FINISHED_STATUSES.includes(trip.status);
  const nextStatus = getNextStatus(trip.status);
  const nextLabel = getNextStatusLabel(trip.status);

  // Determine which address to navigate to based on status
  const getNavDestination = () => {
    const pickupStatuses = ['assigned', 'en_route_pickup', 'arrived_pickup'];
    if (pickupStatuses.includes(trip.status)) return pickupAddr;
    return dropoffAddr;
  };

  const openNavigation = (address) => {
    const dest = address || getNavDestination();
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(dest)}`,
      android: `google.navigation:q=${encodeURIComponent(dest)}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`);
    });
  };

  const callPatient = () => {
    if (patientPhone) {
      Linking.openURL(`tel:${patientPhone}`);
    } else {
      showToast('info', 'No Phone', 'No phone number available for this patient.');
    }
  };

  // ── Progress Steps ──

  const progressSteps = TRIP_FLOW.map(key => ({
    key,
    label: TRIP_STATUS[key]?.label || key,
    icon: TRIP_STATUS[key]?.icon || 'ellipse',
    color: TRIP_STATUS[key]?.color || COLORS.textLight,
  }));

  const currentStepIndex = TRIP_FLOW.indexOf(trip.status);

  // ── Action Buttons Logic ──
  // No Show only after arrived_pickup (driver waited, patient didn't show)
  const showNoShow = trip.status === 'arrived_pickup';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Signature Modal */}
      <SignatureCapture
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={handleSignatureSaved}
        title="Patient Pickup Signature"
        signerName={patientName}
        signatureType="pickup"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {trip.trip_number && <Text style={styles.headerTripNum}>#{trip.trip_number}</Text>}
          <Text style={styles.headerTitle}>{patientName}</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: TRIP_STATUS[trip.status]?.color || COLORS.textLight }]}>
          <Text style={styles.headerBadgeText}>{TRIP_STATUS[trip.status]?.label || trip.status}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Progress Bar */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Trip Progress</Text>
          <View style={styles.progressBar}>
            {progressSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    isCompleted && { backgroundColor: COLORS.success },
                    isCurrent && { backgroundColor: step.color },
                    isPending && { backgroundColor: COLORS.border },
                  ]}>
                    <Ionicons
                      name={isCompleted ? 'checkmark' : step.icon}
                      size={16}
                      color={isPending ? COLORS.textLight : COLORS.textWhite}
                    />
                  </View>
                  <Text style={[
                    styles.progressLabel,
                    isCurrent && { color: step.color, fontWeight: '700' },
                    isCompleted && { color: COLORS.success },
                  ]} numberOfLines={2}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Patient</Text>
          </View>
          <Text style={styles.patientName}>{patientName}</Text>
          {patientPhone ? (
            <TouchableOpacity style={styles.phoneRow} onPress={callPatient}>
              <Ionicons name="call-outline" size={18} color={COLORS.seafoam} />
              <Text style={styles.phoneText}>{patientPhone}</Text>
            </TouchableOpacity>
          ) : null}
          {trip.service_level && (
            <View style={styles.serviceTag}>
              <Ionicons name="medical-outline" size={14} color={COLORS.navy} />
              <Text style={styles.serviceTagText}>{trip.service_level}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons — right below patient info */}
        {!isFinished && (
          <View style={styles.actionsCard}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.primaryAction, { backgroundColor: TRIP_STATUS[nextStatus]?.color || COLORS.seafoam }]}
                onPress={() => handleUpdateStatus(nextStatus)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name={TRIP_STATUS[nextStatus]?.icon || 'arrow-forward'} size={22} color="#fff" />
                    <Text style={styles.primaryActionText}>{nextLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {showNoShow && (
              <TouchableOpacity
                style={styles.noShowAction}
                onPress={() => handleUpdateStatus('no_show')}
                disabled={loading}
              >
                <Ionicons name="eye-off-outline" size={18} color={COLORS.danger} />
                <Text style={styles.noShowText}>Patient No Show</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Completed / Cancelled / No Show banner */}
        {isFinished && (
          <View style={[styles.finishedBanner, {
            backgroundColor: trip.status === 'completed' ? '#D1FAE5' : trip.status === 'no_show' ? '#FEF3C7' : '#FEE2E2',
          }]}>
            <Ionicons
              name={trip.status === 'completed' ? 'checkmark-circle' : trip.status === 'no_show' ? 'eye-off' : 'close-circle'}
              size={24}
              color={trip.status === 'completed' ? COLORS.success : trip.status === 'no_show' ? COLORS.warning : COLORS.danger}
            />
            <Text style={styles.finishedText}>
              {trip.status === 'completed' ? 'Trip completed successfully' :
               trip.status === 'no_show' ? 'Marked as no show' :
               'Trip cancelled'}
            </Text>
          </View>
        )}

        {/* Schedule */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Schedule</Text>
          </View>
          {pickupTime && (
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Pickup Time</Text>
              <Text style={styles.scheduleValue}>
                {new Date(pickupTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                {' at '}
                {new Date(pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {trip.appointment_time && (
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Appointment</Text>
              <Text style={[styles.scheduleValue, { color: '#8b5cf6' }]}>
                {new Date(trip.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {trip.distance ? (
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Distance</Text>
              <Text style={styles.scheduleValue}>{trip.distance} miles</Text>
            </View>
          ) : null}
          {trip.driver_payout ? (
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Your Payout</Text>
              <Text style={[styles.scheduleValue, { color: COLORS.success, fontWeight: '700' }]}>
                ${Number(trip.driver_payout).toFixed(2)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Locations */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color={COLORS.navy} />
            <Text style={styles.cardTitle}>Locations</Text>
          </View>

          <TouchableOpacity style={styles.locationRow} onPress={() => openNavigation(pickupAddr)}>
            <View style={[styles.locationDot, { backgroundColor: COLORS.success }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationAddress}>{pickupAddr}</Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color={COLORS.seafoam} />
          </TouchableOpacity>

          <View style={styles.locationDivider} />

          <TouchableOpacity style={styles.locationRow} onPress={() => openNavigation(dropoffAddr)}>
            <View style={[styles.locationDot, { backgroundColor: COLORS.danger }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>DROP-OFF</Text>
              <Text style={styles.locationAddress}>{dropoffAddr}</Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color={COLORS.seafoam} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        {trip.notes ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.navy} />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGrey,
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTripNum: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  scrollContent: {
    flex: 1,
  },
  // ── Progress ──
  progressCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    ...SHADOWS.small,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  // ── Cards ──
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 15,
    color: COLORS.seafoam,
    fontWeight: '600',
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.softGrey,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  serviceTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    textTransform: 'capitalize',
  },
  // ── Actions (below patient card) ──
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    ...SHADOWS.medium,
  },
  primaryActionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  noShowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.white,
  },
  noShowText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  // ── Finished Banner ──
  finishedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
  },
  finishedText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // ── Schedule ──
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  scheduleLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // ── Locations ──
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 24,
  },
  // ── Notes ──
  notesText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
