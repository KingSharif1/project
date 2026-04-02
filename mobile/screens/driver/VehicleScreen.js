import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { driverAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../theme';

export default function DriverVehicleScreen({ navigation }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingVehicleDoc, setUploadingVehicleDoc] = useState(null);
  const [viewDocUrl, setViewDocUrl] = useState(null);
  const [form, setForm] = useState({
    vehicleName: '', make: '', model: '', year: '', licensePlate: '', color: '', vin: '',
    vehicleType: 'sedan', capacity: '4',
    wheelchairAccessible: false, stretcherCapable: false,
    lastMaintenanceDate: '', insuranceExpiry: '', registrationExpiry: '', inspectionExpiry: '',
  });

  useEffect(() => {
    loadVehicle();
  }, []);

  const loadVehicle = async () => {
    try {
      const response = await driverAPI.getVehicle();
      if (response.success) {
        setVehicle(response.vehicle);
      }
    } catch (error) {
      console.error('Load vehicle error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicle();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return 'missing';
    const expiry = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft < 30) return 'expiring';
    return 'valid';
  };

  const getExpiryColor = (status) => {
    switch (status) {
      case 'valid': return '#10B981';
      case 'expiring': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getExpiryLabel = (status) => {
    switch (status) {
      case 'valid': return 'Valid';
      case 'expiring': return 'Expiring Soon';
      case 'expired': return 'Expired';
      default: return 'Not Set';
    }
  };

  // Vehicle document types (matches web admin)
  const VEHICLE_DOC_TYPES = [
    { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline', expiryField: 'insuranceExpiry' },
    { key: 'registration', label: 'Registration', icon: 'document-text-outline', expiryField: 'registrationExpiry' },
    { key: 'inspection', label: 'Inspection', icon: 'search-outline', expiryField: 'inspectionExpiry' },
    { key: 'title', label: 'Vehicle Title', icon: 'ribbon-outline', expiryField: null },
  ];

  // Build document status list from vehicle expiry dates + uploaded docs
  const getDocumentItems = () => {
    if (!vehicle) return [];

    return VEHICLE_DOC_TYPES.map(dt => {
      const expiryDate = dt.expiryField ? vehicle[dt.expiryField] : null;
      const status = dt.expiryField ? getExpiryStatus(expiryDate) : 'missing';
      // Match uploaded document to this type
      const uploadedDoc = (vehicle.documents || []).find(d =>
        d.documentType === dt.key
      );

      return {
        ...dt,
        expiryDate,
        status,
        uploadedDoc,
      };
    });
  };

  const handleUploadVehicleDoc = async (docType, label) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      setUploadingVehicleDoc(docType);
      const uploadResult = await driverAPI.uploadVehicleDocument(
        docType,
        file.uri,
        file.name || `${label}.pdf`,
        file.mimeType || 'application/octet-stream',
      );
      if (uploadResult.success) {
        Alert.alert('Uploaded', `${label} submitted for review.`);
        loadVehicle();
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Failed to upload document');
    } finally {
      setUploadingVehicleDoc(null);
    }
  };

  const handleViewVehicleDoc = async (doc) => {
    if (!doc?.fileUrl) {
      Alert.alert('No File', 'This document has no file attached.');
      return;
    }
    try {
      const url = await driverAPI.getDocumentViewUrl(doc.fileUrl, 'vehicle-documents');
      if (url) setViewDocUrl(url);
    } catch (e) {
      Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
    }
  };

  const handleSubmitVehicle = async () => {
    if (!form.make || !form.model || !form.year || !form.licensePlate) {
      Alert.alert('Missing Info', 'Make, model, year, and license plate are required.');
      return;
    }
    if (isNaN(parseInt(form.year)) || parseInt(form.year) < 1990 || parseInt(form.year) > new Date().getFullYear() + 1) {
      Alert.alert('Invalid Year', 'Please enter a valid vehicle year.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await driverAPI.submitVehicle(form);
      if (response.success) {
        Alert.alert('Success', 'Vehicle submitted successfully!');
        setShowAddForm(false);
        setForm({
              vehicleName: '', make: '', model: '', year: '', licensePlate: '', color: '', vin: '',
              vehicleType: 'sedan', capacity: '4',
              wheelchairAccessible: false, stretcherCapable: false,
              lastMaintenanceDate: '', insuranceExpiry: '', registrationExpiry: '', inspectionExpiry: '',
            });
        loadVehicle();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignVehicle = async () => {
    Alert.alert(
      'Unassign Vehicle',
      'This will unlink this vehicle from your account. You can add a new vehicle afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await driverAPI.unassignVehicle();
              if (response.success) {
                Alert.alert('Done', 'Vehicle unassigned successfully.');
                setVehicle(null);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to unassign vehicle');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteVehicle = async () => {
    Alert.alert(
      'Delete Vehicle',
      'This will permanently delete this vehicle and all its documents. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await driverAPI.deleteVehicle();
              if (response.success) {
                Alert.alert('Done', 'Vehicle deleted successfully.');
                setVehicle(null);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete vehicle');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: 'Van' },
    { value: 'minivan', label: 'Minivan' },
    { value: 'wheelchair_van', label: 'Wheelchair Van' },
    { value: 'stretcher_van', label: 'Stretcher Van' },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.seafoam} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.seafoam]}
          />
        }
      >
        {vehicle ? (
          <>
            {/* Vehicle Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="car-sport" size={32} color={COLORS.seafoam} />
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryTitle}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.summarySubtitle}>
                    {vehicle.color ? `${vehicle.color} • ` : ''}{vehicle.vehicleType || 'Vehicle'}
                  </Text>
                </View>
                <View style={[styles.statusChip, {
                  backgroundColor: vehicle.status === 'available' ? '#DCFCE7' : '#FEF3C7',
                }]}>
                  <Text style={[styles.statusChipText, {
                    color: vehicle.status === 'available' ? '#16a34a' : '#d97706',
                  }]}>
                    {vehicle.status === 'available' ? 'Available' : vehicle.status || 'Active'}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryDetails}>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.detailLabel}>License Plate</Text>
                  <Text style={styles.detailValue}>{vehicle.licensePlate || '—'}</Text>
                </View>
                <View style={styles.summaryDetailItem}>
                  <Text style={styles.detailLabel}>VIN</Text>
                  <Text style={styles.detailValue}>{vehicle.vin || '—'}</Text>
                </View>
              </View>
              {vehicle.ownershipType && (
                <View style={styles.ownershipBadge}>
                  <Ionicons
                    name={vehicle.ownershipType === 'company' ? 'business-outline' : 'person-outline'}
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.ownershipText}>
                    {vehicle.ownershipType === 'company' ? 'Company Vehicle' : 'Private Vehicle'}
                  </Text>
                </View>
              )}

              {/* Vehicle Actions */}
              <View style={styles.vehicleActions}>
                <TouchableOpacity
                  style={styles.unassignButton}
                  onPress={handleUnassignVehicle}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.warning || '#F59E0B'} />
                  <Text style={styles.unassignButtonText}>Change Vehicle</Text>
                </TouchableOpacity>

                {vehicle.ownershipType === 'private' && (
                  <TouchableOpacity
                    style={styles.deleteVehicleButton}
                    onPress={handleDeleteVehicle}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteVehicleButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Capabilities Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="options-outline" size={22} color={COLORS.seafoam} />
                </View>
                <Text style={styles.cardTitle}>Capabilities</Text>
              </View>
              <View style={styles.capabilitiesRow}>
                <View style={styles.capabilityItem}>
                  <Ionicons
                    name="people"
                    size={20}
                    color={COLORS.navy}
                  />
                  <Text style={styles.capabilityLabel}>Capacity</Text>
                  <Text style={styles.capabilityValue}>{vehicle.capacity || 1}</Text>
                </View>
                <View style={styles.capabilityItem}>
                  <Ionicons
                    name="accessibility"
                    size={20}
                    color={vehicle.wheelchairAccessible ? '#10B981' : '#CBD5E1'}
                  />
                  <Text style={styles.capabilityLabel}>Wheelchair</Text>
                  <Text style={[styles.capabilityValue, {
                    color: vehicle.wheelchairAccessible ? '#10B981' : '#94a3b8',
                  }]}>
                    {vehicle.wheelchairAccessible ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.capabilityItem}>
                  <Ionicons
                    name="bed"
                    size={20}
                    color={vehicle.stretcherCapable ? '#10B981' : '#CBD5E1'}
                  />
                  <Text style={styles.capabilityLabel}>Stretcher</Text>
                  <Text style={[styles.capabilityValue, {
                    color: vehicle.stretcherCapable ? '#10B981' : '#94a3b8',
                  }]}>
                    {vehicle.stretcherCapable ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Vehicle Documents Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="folder-outline" size={22} color={COLORS.seafoam} />
                </View>
                <Text style={styles.cardTitle}>Vehicle Documents</Text>
              </View>

              {getDocumentItems().map((doc, index) => {
                const hasUpload = !!doc.uploadedDoc?.fileUrl;
                const isUploading = uploadingVehicleDoc === doc.key;
                const statusColor = hasUpload ? '#10B981' : '#EF4444';
                const statusLabel = hasUpload ? 'Uploaded' : 'Missing';

                return (
                  <View key={doc.key}>
                    {index > 0 && <View style={styles.docDivider} />}
                    <View style={styles.documentRow}>
                      <TouchableOpacity
                        style={styles.documentLeft}
                        onPress={hasUpload ? () => handleViewVehicleDoc(doc.uploadedDoc) : undefined}
                        activeOpacity={hasUpload ? 0.6 : 1}
                        disabled={!hasUpload}
                      >
                        <View style={[styles.docIconBg, { backgroundColor: `${statusColor}15` }]}>
                          <Ionicons name={doc.icon} size={20} color={statusColor} />
                        </View>
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentLabel}>{doc.label}</Text>
                          {hasUpload ? (
                            <>
                              <Text style={styles.documentExpiry} numberOfLines={1}>
                                {doc.uploadedDoc.fileName || 'Uploaded'}
                                {doc.expiryDate ? ` • Exp: ${formatDate(doc.expiryDate)}` : ''}
                              </Text>
                              <Text style={{ fontSize: 11, color: COLORS.seafoam, marginTop: 1 }}>Tap to view</Text>
                            </>
                          ) : (
                            <Text style={styles.documentExpiry}>
                              {doc.expiryDate ? `Expires: ${formatDate(doc.expiryDate)}` : 'No file uploaded'}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.docStatusBadge, { backgroundColor: `${statusColor}15` }]}>
                          <Text style={[styles.docStatusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        {isUploading ? (
                          <ActivityIndicator size="small" color={COLORS.seafoam} />
                        ) : (
                          <TouchableOpacity
                            style={styles.vDocUploadBtn}
                            onPress={() => handleUploadVehicleDoc(doc.key, doc.label)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="cloud-upload-outline" size={14} color={COLORS.seafoam} />
                            <Text style={styles.vDocUploadText}>{hasUpload ? 'Replace' : 'Upload'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Last Maintenance */}
            {vehicle.lastMaintenanceDate && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="construct-outline" size={22} color={COLORS.seafoam} />
                  </View>
                  <Text style={styles.cardTitle}>Maintenance</Text>
                </View>
                <View style={styles.maintenanceInfo}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.maintenanceText}>
                    Last serviced: {formatDate(vehicle.lastMaintenanceDate)}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : showAddForm ? (
          /* Add Vehicle Form — matches web admin */
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* Section 1: Vehicle Information */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="car-sport" size={22} color={COLORS.navy} />
                  <Text style={styles.formTitle}>Vehicle Information</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Vehicle Name</Text>
              <TextInput style={styles.formInput} value={form.vehicleName} onChangeText={(t) => setForm(f => ({ ...f, vehicleName: t }))} placeholder="e.g. My Blue Van" placeholderTextColor="#9CA3AF" />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Make *</Text>
                  <TextInput style={styles.formInput} value={form.make} onChangeText={(t) => setForm(f => ({ ...f, make: t }))} placeholder="e.g. Toyota" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Model *</Text>
                  <TextInput style={styles.formInput} value={form.model} onChangeText={(t) => setForm(f => ({ ...f, model: t }))} placeholder="e.g. Sienna" placeholderTextColor="#9CA3AF" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Year *</Text>
                  <TextInput style={styles.formInput} value={form.year} onChangeText={(t) => setForm(f => ({ ...f, year: t }))} placeholder="2024" placeholderTextColor="#9CA3AF" keyboardType="numeric" maxLength={4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Color</Text>
                  <TextInput style={styles.formInput} value={form.color} onChangeText={(t) => setForm(f => ({ ...f, color: t }))} placeholder="e.g. White" placeholderTextColor="#9CA3AF" />
                </View>
              </View>

              <Text style={styles.formLabel}>License Plate *</Text>
              <TextInput style={styles.formInput} value={form.licensePlate} onChangeText={(t) => setForm(f => ({ ...f, licensePlate: t.toUpperCase() }))} placeholder="e.g. ABC-1234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />

              <Text style={styles.formLabel}>VIN</Text>
              <TextInput style={styles.formInput} value={form.vin} onChangeText={(t) => setForm(f => ({ ...f, vin: t.toUpperCase() }))} placeholder="17-character VIN" placeholderTextColor="#9CA3AF" autoCapitalize="characters" maxLength={17} />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Capacity</Text>
                  <TextInput style={styles.formInput} value={form.capacity} onChangeText={(t) => setForm(f => ({ ...f, capacity: t }))} placeholder="4" placeholderTextColor="#9CA3AF" keyboardType="numeric" maxLength={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Ownership</Text>
                  <View style={[styles.formInput, { justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Private (You)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: Vehicle Type & Accessibility */}
            <View style={[styles.formCard, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="options-outline" size={20} color={COLORS.navy} />
                <Text style={styles.formSectionTitle}>Type & Accessibility</Text>
              </View>

              <Text style={styles.formLabel}>Vehicle Type</Text>
              <View style={styles.typeRow}>
                {vehicleTypes.map(vt => (
                  <TouchableOpacity
                    key={vt.value}
                    style={[styles.typeChip, form.vehicleType === vt.value && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, vehicleType: vt.value }))}
                  >
                    <Text style={[styles.typeChipText, form.vehicleType === vt.value && styles.typeChipTextActive]}>
                      {vt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleEmoji}>♿</Text>
                  <View>
                    <Text style={styles.toggleLabel}>Wheelchair Accessible</Text>
                    <Text style={styles.toggleDesc}>Vehicle has wheelchair ramp/lift</Text>
                  </View>
                </View>
                <Switch
                  value={form.wheelchairAccessible}
                  onValueChange={(v) => setForm(f => ({ ...f, wheelchairAccessible: v }))}
                  trackColor={{ false: COLORS.border, true: `${COLORS.seafoam}80` }}
                  thumbColor={form.wheelchairAccessible ? COLORS.seafoam : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleEmoji}>🛏</Text>
                  <View>
                    <Text style={styles.toggleLabel}>Stretcher Capable</Text>
                    <Text style={styles.toggleDesc}>Vehicle can transport stretchers</Text>
                  </View>
                </View>
                <Switch
                  value={form.stretcherCapable}
                  onValueChange={(v) => setForm(f => ({ ...f, stretcherCapable: v }))}
                  trackColor={{ false: COLORS.border, true: `${COLORS.seafoam}80` }}
                  thumbColor={form.stretcherCapable ? COLORS.seafoam : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Section 3: Vehicle Documents (upload/view) */}
            <View style={[styles.formCard, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.navy} />
                <Text style={styles.formSectionTitle}>Vehicle Documents</Text>
              </View>
              <Text style={styles.formHint}>Upload vehicle documents (PDF, JPG, PNG). These will be reviewed by admin.</Text>

              {[
                { key: 'insurance', label: 'Insurance', icon: 'shield-outline' },
                { key: 'registration', label: 'Registration', icon: 'document-outline' },
                { key: 'inspection', label: 'Inspection', icon: 'search-outline' },
                { key: 'title', label: 'Title', icon: 'ribbon-outline' },
              ].map((docItem, idx) => (
                <View key={docItem.key} style={[styles.vehicleDocRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name={docItem.icon} size={18} color={COLORS.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleLabel}>{docItem.label}</Text>
                      <Text style={styles.toggleDesc}>
                        {form[`${docItem.key}File`] ? form[`${docItem.key}File`].name : 'No file selected'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.vehicleDocPickBtn}
                    onPress={async () => {
                      try {
                        const result = await DocumentPicker.getDocumentAsync({
                          type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
                          copyToCacheDirectory: true,
                        });
                        if (!result.canceled && result.assets?.[0]) {
                          setForm(f => ({ ...f, [`${docItem.key}File`]: result.assets[0] }));
                        }
                      } catch (e) {
                        Alert.alert('Error', 'Could not pick file');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={form[`${docItem.key}File`] ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={form[`${docItem.key}File`] ? '#22C55E' : COLORS.seafoam} />
                    <Text style={[styles.docUploadText, form[`${docItem.key}File`] && { color: '#22C55E' }]}>
                      {form[`${docItem.key}File`] ? 'Selected' : 'Choose'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Section 4: Maintenance & Dates */}
            <View style={[styles.formCard, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="build-outline" size={20} color={COLORS.navy} />
                <Text style={styles.formSectionTitle}>Maintenance & Dates</Text>
              </View>
              <Text style={styles.formHint}>Enter dates in YYYY-MM-DD format</Text>

              <Text style={styles.formLabel}>Insurance Expiry</Text>
              <TextInput style={styles.formInput} value={form.insuranceExpiry} onChangeText={(t) => setForm(f => ({ ...f, insuranceExpiry: t }))} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />

              <Text style={styles.formLabel}>Registration Expiry</Text>
              <TextInput style={styles.formInput} value={form.registrationExpiry} onChangeText={(t) => setForm(f => ({ ...f, registrationExpiry: t }))} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />

              <Text style={styles.formLabel}>Inspection Expiry</Text>
              <TextInput style={styles.formInput} value={form.inspectionExpiry} onChangeText={(t) => setForm(f => ({ ...f, inspectionExpiry: t }))} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />

              <Text style={styles.formLabel}>Last Maintenance Date</Text>
              <TextInput style={styles.formInput} value={form.lastMaintenanceDate} onChangeText={(t) => setForm(f => ({ ...f, lastMaintenanceDate: t }))} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { marginTop: 16 }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitVehicle}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Vehicle</Text>
                </>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        ) : (
          /* No Vehicle Assigned */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="car-outline" size={56} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Vehicle Assigned</Text>
            <Text style={styles.emptySubtext}>
              Your administrator has not assigned a vehicle to you yet, or you can add your own vehicle below.
            </Text>
            <TouchableOpacity style={styles.addVehicleButton} onPress={() => setShowAddForm(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addVehicleButtonText}>Add My Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal visible={!!viewDocUrl} animationType="slide" onRequestClose={() => setViewDocUrl(null)}>
        <View style={styles.docViewerContainer}>
          <View style={styles.docViewerHeader}>
            <Text style={styles.docViewerTitle}>Document Viewer</Text>
            <TouchableOpacity onPress={() => setViewDocUrl(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          {viewDocUrl && (
            <WebView
              source={{ uri: viewDocUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.seafoam} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
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
  header: {
    backgroundColor: COLORS.navy,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Summary card
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.seafoam}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ownershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  ownershipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  unassignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  unassignButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  deleteVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteVehicleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Generic card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.seafoam}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Capabilities
  capabilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  capabilityItem: {
    alignItems: 'center',
    gap: 6,
  },
  capabilityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  capabilityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  // Documents / Compliance
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  docIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  documentExpiry: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  docDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Uploaded documents
  uploadedDocsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadedDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  uploadedDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  uploadedDocName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  uploadedDocDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  uploadedDocStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uploadedDocStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Maintenance
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  maintenanceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Empty state
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
    ...SHADOWS.small,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.softGrey}`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.seafoam,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addVehicleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Add vehicle form
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.small,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  formHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  formInput: {
    backgroundColor: COLORS.softGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.softGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: `${COLORS.seafoam}15`,
    borderColor: COLORS.seafoam,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.seafoam,
    fontWeight: '600',
  },
  // Toggle rows (wheelchair, stretcher)
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleEmoji: { fontSize: 20 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  toggleDesc: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  // Vehicle document picker rows
  vehicleDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  vehicleDocPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}10`,
  },
  docUploadText: { fontSize: 12, fontWeight: '600', color: COLORS.seafoam },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.seafoam,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Legacy (kept for InfoRow component)
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  // Vehicle doc upload/view buttons
  vDocUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}10`,
  },
  vDocUploadText: { fontSize: 11, fontWeight: '600', color: COLORS.seafoam },
  // Document viewer modal
  docViewerContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 30 },
  docViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  docViewerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
});
