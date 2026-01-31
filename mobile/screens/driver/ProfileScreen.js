import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DriverProfileScreen({ navigation, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try storage first
      let profileData = await AsyncStorage.getItem('userProfile');
      let parsed = profileData ? JSON.parse(profileData) : null;
      
      // If no profile in storage, fetch from API
      if (!parsed) {
        console.log('No profile in storage, fetching from API...');
        try {
          const response = await driverAPI.getProfile();
          if (response.success && response.profile) {
            parsed = response.profile;
            await AsyncStorage.setItem('userProfile', JSON.stringify(parsed));
          }
        } catch (apiError) {
          console.log('Could not fetch profile:', apiError.message);
        }
      }
      
      if (parsed) {
        setProfile(parsed);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await driverAPI.logout();
          if (onLogout) {
            onLogout();
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    try {
      const response = await driverAPI.updateProfile(editedProfile);
      if (response.success) {
        const updatedProfile = { ...profile, ...editedProfile };
        setProfile(updatedProfile);
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const getStatusColor = () => {
    const status = profile.availability_status || profile.status;
    switch (status) {
      case 'available': return '#22c55e';
      case 'on_trip': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  const getStatusText = () => {
    const status = profile.availability_status || profile.status;
    switch (status) {
      case 'available': return 'Online';
      case 'on_trip': return 'On Trip';
      default: return 'Offline';
    }
  };

  const handleContactDispatcher = () => {
    Alert.alert(
      'Contact Dispatcher',
      'Choose how to contact dispatch:',
      [
        {
          text: 'Call',
          onPress: () => {
            // In production, use Linking.openURL('tel:8175550100')
            Alert.alert('Calling', 'Dispatcher: (817) 555-0100');
          },
        },
        {
          text: 'Message',
          onPress: () => {
            Alert.alert('Coming Soon', 'In-app messaging will be available in the next update.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              if (isEditing) {
                handleSaveProfile();
              } else {
                setIsEditing(true);
                setEditedProfile({
                  license_number: profile.license_number || '',
                  license_expiry: profile.license_expiry || '',
                });
              }
            }}
          >
            <Ionicons 
              name={isEditing ? "checkmark-circle" : "create-outline"} 
              size={24} 
              color={isEditing ? "#10B981" : "#FF3B30"} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <View style={styles.statusDot} />
            </View>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="car-sport" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.statValue}>{profile.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{profile.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{profile.trips_this_month || 0}</Text>
            <Text style={styles.statLabel}>Month</Text>
          </View>
        </View>

        {/* Quick Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#6B7280" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone || 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card-outline" size={20} color="#6B7280" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>License</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedProfile.license_number}
                    onChangeText={(text) => setEditedProfile({...editedProfile, license_number: text})}
                    placeholder="Enter license number"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile.license_number || 'Not set'}</Text>
                )}
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>License Expiry</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedProfile.license_expiry}
                    onChangeText={(text) => setEditedProfile({...editedProfile, license_expiry: text})}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {profile.license_expiry ? new Date(profile.license_expiry).toLocaleDateString() : 'Not set'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(
                'Change Password',
                'Please contact your administrator to reset your password.\n\nEmail: support@fwmc.com\nPhone: (817) 555-0100',
                [{ text: 'OK' }]
              )}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBg}>
                  <Ionicons name="lock-closed-outline" size={20} color="#FF3B30" />
                </View>
                <Text style={styles.menuItemText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBg}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                </View>
                <Text style={styles.menuItemText}>Two-Factor Auth</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Documents</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBg}>
                  <Ionicons name="card-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.menuItemText}>Driver's License</Text>
              </View>
              <View style={styles.menuItemRight}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#e0e7ff' }]}>
                  <Text style={styles.menuIcon}>📄</Text>
                </View>
                <Text style={styles.menuItemText}>Insurance</Text>
              </View>
              <View style={styles.menuItemRight}>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#fce7f3' }]}>
                  <Text style={styles.menuIcon}>📋</Text>
                </View>
                <Text style={styles.menuItemText}>Compliance Status</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Communication Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Communication</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleContactDispatcher}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBg}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>Contact Dispatcher</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Emergency', 'Emergency hotline: (817) 555-0911\n\nFor immediate assistance, call 911.')}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBg}>
                  <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.menuItemText}>Emergency Contact</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Document Status with Real Data */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Document Status</Text>
          <View style={styles.menuCard}>
            <View style={styles.docStatusItem}>
              <View style={styles.docStatusLeft}>
                <Ionicons name="card" size={20} color="#10B981" />
                <View style={styles.docStatusInfo}>
                  <Text style={styles.docStatusTitle}>Driver's License</Text>
                  <Text style={styles.docStatusExpiry}>
                    Expires: {profile.license_expiry ? new Date(profile.license_expiry).toLocaleDateString() : 'Not set'}
                  </Text>
                </View>
              </View>
              <View style={[styles.docStatusBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
            </View>
            <View style={styles.menuDivider} />
            <View style={styles.docStatusItem}>
              <View style={styles.docStatusLeft}>
                <Ionicons name="medical" size={20} color={profile.medical_cert_expiry ? "#F59E0B" : "#EF4444"} />
                <View style={styles.docStatusInfo}>
                  <Text style={styles.docStatusTitle}>Medical Certificate</Text>
                  <Text style={styles.docStatusExpiry}>
                    {profile.medical_cert_expiry ? `Expires: ${new Date(profile.medical_cert_expiry).toLocaleDateString()}` : 'Not uploaded'}
                  </Text>
                </View>
              </View>
              <View style={[styles.docStatusBadge, { backgroundColor: profile.medical_cert_expiry ? '#FEF3C7' : '#FEE2E2' }]}>
                <Ionicons name={profile.medical_cert_expiry ? "time" : "close-circle"} size={16} color={profile.medical_cert_expiry ? "#F59E0B" : "#EF4444"} />
              </View>
            </View>
            <View style={styles.menuDivider} />
            <View style={styles.docStatusItem}>
              <View style={styles.docStatusLeft}>
                <Ionicons name="shield-checkmark" size={20} color={profile.background_check_expiry ? "#10B981" : "#6B7280"} />
                <View style={styles.docStatusInfo}>
                  <Text style={styles.docStatusTitle}>Background Check</Text>
                  <Text style={styles.docStatusExpiry}>
                    {profile.background_check_expiry ? `Expires: ${new Date(profile.background_check_expiry).toLocaleDateString()}` : 'Not completed'}
                  </Text>
                </View>
              </View>
              <View style={[styles.docStatusBadge, { backgroundColor: profile.background_check_expiry ? '#DCFCE7' : '#FEE2E2' }]}>
                <Ionicons name={profile.background_check_expiry ? "checkmark-circle" : "close-circle"} size={16} color={profile.background_check_expiry ? "#10B981" : "#EF4444"} />
              </View>
            </View>
          </View>
        </View>

        {/* Performance Stats */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Performance</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceStat}>
                <View style={[styles.performanceIcon, { backgroundColor: '#dbeafe' }]}>
                  <Text style={styles.performanceIconText}>📊</Text>
                </View>
                <Text style={styles.performanceValue}>69%</Text>
                <Text style={styles.performanceLabel}>Completion Rate</Text>
                <Text style={styles.performanceSubtext}>11 of 16 trips</Text>
              </View>
              <View style={styles.performanceStat}>
                <View style={[styles.performanceIcon, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.performanceIconText}>💵</Text>
                </View>
                <Text style={styles.performanceValue}>$28.50</Text>
                <Text style={styles.performanceLabel}>Avg per Trip</Text>
                <Text style={styles.performanceSubtext}>Total: $456.00</Text>
              </View>
              <View style={styles.performanceStat}>
                <View style={[styles.performanceIcon, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.performanceIconText}>📍</Text>
                </View>
                <Text style={styles.performanceValue}>51</Text>
                <Text style={styles.performanceLabel}>Total Miles</Text>
                <Text style={styles.performanceSubtext}>This month</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Achievements & Badges</Text>
          <View style={styles.achievementsCard}>
            <View style={styles.achievementsRow}>
              <View style={styles.achievementItem}>
                <View style={[styles.achievementBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.achievementIcon}>⭐</Text>
                </View>
                <Text style={styles.achievementTitle}>Excellence</Text>
                <Text style={styles.achievementDesc}>4.8+ Rating</Text>
              </View>
              <View style={styles.achievementItem}>
                <View style={[styles.achievementBadge, { backgroundColor: '#fce7f3' }]}>
                  <Text style={styles.achievementIcon}>🏆</Text>
                </View>
                <Text style={styles.achievementTitle}>Top Rated</Text>
                <Text style={styles.achievementDesc}>4.5+ Rating</Text>
              </View>
              <View style={styles.achievementItem}>
                <View style={[styles.achievementBadge, { backgroundColor: '#e0e7ff' }]}>
                  <Text style={styles.achievementIcon}>🎯</Text>
                </View>
                <Text style={styles.achievementTitle}>100 Trips</Text>
                <Text style={styles.achievementDesc}>Milestone</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Dispatcher */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Communication</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Contact Dispatcher', 'Calling dispatch center...', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => {} }
              ])}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Text style={styles.menuIcon}>📞</Text>
                </View>
                <Text style={styles.menuItemText}>Call Dispatcher</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Message', 'Opening chat with dispatcher...', [{ text: 'OK' }])}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.menuIcon}>💬</Text>
                </View>
                <Text style={styles.menuItemText}>Message Dispatcher</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Text style={styles.menuIcon}>🚨</Text>
                </View>
                <Text style={styles.menuItemText}>Report Emergency</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits & Resources */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Benefits & Resources</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#fce7f3' }]}>
                  <Text style={styles.menuIcon}>❤️</Text>
                </View>
                <Text style={styles.menuItemText}>Health Insurance</Text>
              </View>
              <View style={styles.menuItemRight}>
                <View style={[styles.verifiedBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.verifiedText, { color: '#16a34a' }]}>Active</Text>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#e0e7ff' }]}>
                  <Text style={styles.menuIcon}>🎓</Text>
                </View>
                <Text style={styles.menuItemText}>Training Resources</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.menuIcon}>📚</Text>
                </View>
                <Text style={styles.menuItemText}>Company Handbook</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 2.0.0 • Build 2024.12</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  editButton: {
    padding: 8,
  },
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  editInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  verifiedText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  menuItemArrow: {
    fontSize: 22,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
  },
  docStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  docStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  docStatusInfo: {
    flex: 1,
  },
  docStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  docStatusExpiry: {
    fontSize: 13,
    color: '#6B7280',
  },
  docStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  complianceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  complianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  complianceStatusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  complianceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  complianceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  complianceItem: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  complianceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  complianceIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  complianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  complianceStatus: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '500',
  },
  manageDocsButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  manageDocsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  performanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceIconText: {
    fontSize: 18,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  performanceLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  performanceSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  achievementsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  achievementItem: {
    alignItems: 'center',
  },
  achievementBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 10,
    color: '#64748b',
  },
});
