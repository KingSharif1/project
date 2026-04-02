import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { driverAPI } from '../../services/api';
import { locationService } from '../../services/locationService';
import { COLORS, SHADOWS } from '../../theme';
import SignatureCapture from '../../components/SignatureCapture';

export default function DriverProfileScreen({ navigation, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null); // tracks which doc type is uploading
  const [viewDocUrl, setViewDocUrl] = useState(null); // signed URL for in-app doc viewer
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [driverSignature, setDriverSignature] = useState(null);
  const [savingSignature, setSavingSignature] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});


  useEffect(() => {
    loadProfile();
    loadDriverSignature();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await driverAPI.getProfile();
      if (response.success && response.profile) {
        setProfile(response.profile);
        await AsyncStorage.setItem('userProfile', JSON.stringify(response.profile));
      }
    } catch (error) {
      // Fallback to cached
      try {
        const cached = await AsyncStorage.getItem('userProfile');
        if (cached) setProfile(JSON.parse(cached));
      } catch (e) {}
      console.log('Load profile error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDriverSignature = async () => {
    try {
      const response = await driverAPI.getDriverSignature();
      if (response.success && response.data?.signature_data) {
        setDriverSignature(response.data.signature_data);
      }
    } catch (error) {
      console.log('Load signature error:', error.message);
    }
  };

  const handleSaveDriverSignature = async (signatureData) => {
    setSavingSignature(true);
    try {
      const response = await driverAPI.saveDriverSignature(
        signatureData.signature_data,
        null, // latitude
        null  // longitude
      );
      if (response.success) {
        setDriverSignature(signatureData.signature_data);
        setShowSignatureModal(false);
        Alert.alert('Success', 'Your signature has been saved and will be used for all trip completions.');
      } else {
        Alert.alert('Error', 'Failed to save signature');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save signature');
    } finally {
      setSavingSignature(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
    loadDriverSignature();
  }, []);

  const startEditing = () => {
    setEditForm({
      first_name: profile.firstName || '',
      last_name: profile.lastName || '',
      phone: profile.phone || '',
      date_of_birth: profile.dateOfBirth || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      zip_code: profile.zipCode || '',
      license_number: profile.licenseNumber || '',
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await driverAPI.updateProfile(editForm);
      if (response.success) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
        loadProfile(); // Reload fresh data
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const currentStatus = profile?.availabilityStatus || 'off_duty';
    const newStatus = currentStatus === 'available' ? 'off_duty' : 'available';
    try {
      await driverAPI.updateStatus(newStatus);
      setProfile(prev => ({ ...prev, availabilityStatus: newStatus }));

      // Start/stop location tracking based on online/offline
      if (newStatus === 'available') {
        if (!locationService.isActive() && profile?.id) {
          const perms = await locationService.requestPermissions();
          if (perms.foreground) {
            await locationService.startTracking(profile.id, { interval: 10000, distance: 10 });
            console.log('[Profile] Location tracking started');
          }
        }
      } else {
        await locationService.stopTracking();
        console.log('[Profile] Location tracking stopped');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'on_trip': return '#f59e0b';
      case 'break': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Online';
      case 'on_trip': return 'On Trip';
      case 'break': return 'On Break';
      default: return 'Offline';
    }
  };

  // Required document types (keys match web admin exactly)
  const REQUIRED_DOCS = [
    { type: 'driver_license', label: 'Driver License', icon: 'card-outline' },
    { type: 'vehicle_insurance', label: 'Vehicle Insurance', icon: 'shield-outline' },
    { type: 'vehicle_registration', label: 'Vehicle Registration', icon: 'document-text-outline' },
    { type: 'medical_cert', label: 'Medical Certificate', icon: 'medical-outline' },
    { type: 'background_check', label: 'Background Check', icon: 'shield-checkmark-outline' },
  ];

  const getDocList = () => {
    const uploaded = profile?.documents || [];
    return REQUIRED_DOCS.map(req => {
      const found = uploaded.find(d => d.documentType === req.type);
      return {
        ...req,
        uploaded: !!found,
        doc: found || null,
      };
    });
  };

  const handleUploadDoc = async (docType, label) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword'],
        copyToCacheDirectory: true,
      });

      // User cancelled
      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      setUploadingDoc(docType);
      const uploadResult = await driverAPI.uploadDriverDocument(
        docType,
        file.uri,
        file.name || `${label}.pdf`,
        file.mimeType || 'application/octet-stream',
      );

      if (uploadResult.success) {
        Alert.alert('Uploaded', `${label} submitted for review.`);
        loadProfile();
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleViewDoc = async (doc) => {
    if (!doc?.fileUrl) {
      Alert.alert('No File', 'This document has no file attached.');
      return;
    }
    try {
      const url = await driverAPI.getDocumentViewUrl(doc.fileUrl);
      if (url) {
        setViewDocUrl(url);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.seafoam} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Ionicons name="person-circle-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.loadingText}>Could not load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = profile.availabilityStatus || 'off_duty';
  const isOnline = status === 'available';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.headerBtn} onPress={() => setIsEditing(false)}>
                  <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: COLORS.seafoam }]} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.headerBtn} onPress={startEditing}>
                  <Ionicons name="create-outline" size={22} color={COLORS.textWhite} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.getParent()?.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={22} color={COLORS.textWhite} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Avatar + Status */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <View style={styles.statusDot} />
            </View>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          {/* Online/Offline Toggle */}
          <TouchableOpacity
            style={[styles.statusToggle, isOnline ? styles.statusToggleOnline : styles.statusToggleOffline]}
            onPress={handleToggleStatus}
            activeOpacity={0.7}
          >
            <View style={[styles.statusToggleDot, { backgroundColor: isOnline ? '#22c55e' : '#94a3b8' }]} />
            <Text style={[styles.statusToggleText, { color: isOnline ? '#22c55e' : '#94a3b8' }]}>
              {getStatusLabel(status)}
            </Text>
            <Ionicons
              name={isOnline ? 'toggle' : 'toggle-outline'}
              size={28}
              color={isOnline ? '#22c55e' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.seafoam]} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="car-sport" size={22} color={COLORS.seafoam} />
            <Text style={styles.statValue}>{profile.totalTrips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={22} color="#10B981" />
            <Text style={styles.statValue}>{profile.tripsThisMonth || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={22} color="#8b5cf6" />
            <Text style={styles.statValue}>
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { month: 'short', year: '2-digit' }) : '—'}
            </Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>

        {/* My Information (merged personal + driver) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>My Information</Text>
          </View>
          <View style={styles.card}>
            <InfoRow label="First Name" value={profile.firstName} editKey="first_name" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="Last Name" value={profile.lastName} editKey="last_name" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="Phone" value={profile.phone} editKey="phone" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} keyboardType="phone-pad" />
            <InfoRow label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : null} editKey="date_of_birth" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} placeholder="YYYY-MM-DD" />
            <InfoRow label="Address" value={profile.address} editKey="address" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="City" value={profile.city} editKey="city" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="State" value={profile.state} editKey="state" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="Zip Code" value={profile.zipCode} editKey="zip_code" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} keyboardType="numeric" />
            <InfoRow label="License Number" value={profile.licenseNumber} editKey="license_number" isEditing={isEditing} editForm={editForm} setEditForm={setEditForm} />
            <InfoRow label="Driver ID" value={profile.id?.slice(0, 8)} isEditing={false} last />
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="folder-open-outline" size={20} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>Documents</Text>
            <Text style={styles.sectionBadge}>
              {getDocList().filter(d => d.uploaded).length}/{REQUIRED_DOCS.length}
            </Text>
          </View>
          <View style={styles.card}>
            {getDocList().map((item, index) => {
              const { label, icon, uploaded, doc } = item;
              const isUploading = uploadingDoc === item.type;
              const hasFile = uploaded && doc?.fileUrl;
              const statusColor = hasFile ? '#10B981' : '#EF4444';
              const statusLabel = hasFile ? 'Uploaded' : 'Missing';

              return (
                <View key={item.type}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.docRow}
                    onPress={hasFile ? () => handleViewDoc(doc) : undefined}
                    activeOpacity={hasFile ? 0.6 : 1}
                    disabled={!hasFile}
                  >
                    <View style={[styles.docIconBg, { backgroundColor: `${statusColor}15` }]}>
                      <Ionicons name={hasFile ? 'checkmark-circle' : icon} size={18} color={statusColor} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName}>{label}</Text>
                      <Text style={styles.docMeta}>
                        {hasFile ? doc.fileName || 'Uploaded' : 'Not uploaded'}
                      </Text>
                      {hasFile && (
                        <Text style={styles.docViewHint}>Tap to view</Text>
                      )}
                    </View>
                    {isUploading ? (
                      <ActivityIndicator size="small" color={COLORS.seafoam} />
                    ) : (
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.docStatusPill, { backgroundColor: `${statusColor}15` }]}>
                          <Text style={[styles.docStatusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.docUploadBtn}
                          onPress={() => handleUploadDoc(item.type, label)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="cloud-upload-outline" size={16} color={COLORS.seafoam} />
                          <Text style={styles.docUploadText}>{hasFile ? 'Re-upload' : 'Upload'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Driver Signature */}
          <View style={[styles.card, { marginTop: 16, backgroundColor: '#F0F9FF', borderColor: '#3B82F6', borderWidth: 2 }]}>
            <View style={styles.signatureHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signatureTitle}>Driver Signature</Text>
                <Text style={styles.signatureSubtitle}>
                  {driverSignature ? 'Your signature is on file' : 'Required for trip completions'}
                </Text>
              </View>
              {driverSignature && (
                <View style={[styles.docStatusPill, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.docStatusText, { color: '#10B981' }]}>Active</Text>
                </View>
              )}
            </View>

            {driverSignature ? (
              <View style={styles.signaturePreview}>
                <View style={styles.signatureImageContainer}>
                  <Text style={styles.signatureLabel}>Current Signature:</Text>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureText}>✓ Signature on file</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.signatureUpdateBtn}
                  onPress={() => setShowSignatureModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  <Text style={styles.signatureUpdateText}>Update Signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.signatureAddBtn}
                onPress={() => setShowSignatureModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.signatureAddText}>Add Your Signature</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Settings Navigation */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.getParent()?.navigate('Settings')} activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: `${COLORS.navy}10` }]}>
                  <Ionicons name="settings-outline" size={18} color={COLORS.navy} />
                </View>
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal visible={!!viewDocUrl} animationType="slide" onRequestClose={() => setViewDocUrl(null)}>
        <View style={styles.docViewerContainer}>
          <View style={styles.docViewerHeader}>
            <Text style={styles.docViewerTitle}>Document Viewer</Text>
            <TouchableOpacity onPress={() => setViewDocUrl(null)} style={styles.docViewerClose}>
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

      {/* Signature Capture Modal */}
      <SignatureCapture
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveDriverSignature}
        title="Driver Signature"
        signerName={`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()}
        signatureType="driver"
      />
    </View>
  );
}

function InfoRow({ label, value, editKey, isEditing, editForm, setEditForm, keyboardType, placeholder, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {isEditing && editKey ? (
        <TextInput
          style={styles.infoInput}
          value={editForm[editKey] || ''}
          onChangeText={(text) => setEditForm(prev => ({ ...prev, [editKey]: text }))}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType || 'default'}
        />
      ) : (
        <Text style={styles.infoValue}>{value || '—'}</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGrey },
  // Header
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.textWhite },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile card in header
  profileCard: { alignItems: 'center', paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.seafoam,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.navy,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.textWhite, marginTop: 8, marginBottom: 2 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  // Status toggle
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusToggleOnline: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusToggleOffline: { backgroundColor: 'rgba(255,255,255,0.1)' },
  statusToggleDot: { width: 8, height: 8, borderRadius: 4 },
  statusToggleText: { fontSize: 13, fontWeight: '600' },
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.small,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Sections
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy, flex: 1 },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...SHADOWS.small,
  },
  // Info rows
  infoRow: { paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  infoInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLORS.seafoam}08`,
  },
  // Divider
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  // Documents
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  docIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  docMeta: { fontSize: 12, color: '#6B7280' },
  docStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  docStatusText: { fontSize: 11, fontWeight: '600' },
  docRejection: { fontSize: 12, color: '#EF4444', marginLeft: 48, marginBottom: 8, fontStyle: 'italic' },
  docUploadBtn: {
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
  docViewHint: { fontSize: 11, color: COLORS.seafoam, marginTop: 2 },
  docReuploadBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  docReuploadText: { fontSize: 11, color: COLORS.textLight, textDecorationLine: 'underline' },
  // Menu items
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuItemText: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 16, marginBottom: 24 },
  retryButton: { backgroundColor: COLORS.seafoam, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Document viewer modal
  docViewerContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 30 },
  // Signature styles
  signatureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  signatureTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  signatureSubtitle: { fontSize: 12, color: '#6B7280' },
  signaturePreview: { marginTop: 8 },
  signatureImageContainer: { marginBottom: 12 },
  signatureLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  signatureBox: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  signatureText: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  signatureUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
  },
  signatureUpdateText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  signatureAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    marginTop: 8,
  },
  signatureAddText: { fontSize: 15, fontWeight: '700', color: '#fff' },
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
  docViewerClose: { padding: 4 },
});
