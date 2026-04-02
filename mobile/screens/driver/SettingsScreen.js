import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../theme';

export default function DriverSettingsScreen({ navigation, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [notifTrips, setNotifTrips] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [reminderTime, setReminderTime] = useState(30); // minutes before trip
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const REMINDER_OPTIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ];

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await AsyncStorage.getItem('userProfile');
      if (data) setProfile(JSON.parse(data));
    } catch (e) {}
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('driverSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotifTrips(parsed.notifTrips ?? true);
        setNotifMessages(parsed.notifMessages ?? true);
        setNotifReminders(parsed.notifReminders ?? true);
        setLocationTracking(parsed.locationTracking ?? true);
        setReminderTime(parsed.reminderTime ?? 30);
      }
    } catch (e) {}
  };

  const saveSetting = async (key, value) => {
    try {
      const settings = await AsyncStorage.getItem('driverSettings');
      const parsed = settings ? JSON.parse(settings) : {};
      parsed[key] = value;
      await AsyncStorage.setItem('driverSettings', JSON.stringify(parsed));
    } catch (e) {}
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await driverAPI.changePassword(currentPassword, newPassword);
      if (result.success) {
        Alert.alert('Success', 'Password changed successfully.');
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try { await driverAPI.logout(); } catch (e) {}
          if (onLogout) onLogout();
        },
      },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear cached data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          await AsyncStorage.removeItem('vehicleInfo');
          await AsyncStorage.removeItem('userProfile');
          Alert.alert('Done', 'Cache cleared.');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with back button */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.card}>
            <SettingToggle icon="car-outline" label="Trip Assignments" description="Get notified when new trips are assigned" value={notifTrips} onToggle={(v) => { setNotifTrips(v); saveSetting('notifTrips', v); }} />
            <View style={styles.separator} />
            <SettingToggle icon="chatbubble-outline" label="Messages" description="Notifications for new messages" value={notifMessages} onToggle={(v) => { setNotifMessages(v); saveSetting('notifMessages', v); }} />
            <View style={styles.separator} />
            <SettingToggle icon="alarm-outline" label="Trip Reminders" description="Reminders before scheduled pickups" value={notifReminders} onToggle={(v) => { setNotifReminders(v); saveSetting('notifReminders', v); }} />
            {notifReminders && (
              <View style={styles.reminderTimePicker}>
                <Text style={styles.reminderLabel}>Remind me before trip:</Text>
                <View style={styles.reminderChips}>
                  {REMINDER_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.reminderChip, reminderTime === opt.value && styles.reminderChipActive]}
                      onPress={() => { setReminderTime(opt.value); saveSetting('reminderTime', opt.value); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reminderChipText, reminderTime === opt.value && styles.reminderChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <View style={styles.card}>
            <SettingToggle icon="navigate-outline" label="GPS Tracking" description="Share location during active trips" value={locationTracking} onToggle={(v) => { setLocationTracking(v); saveSetting('locationTracking', v); }} />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={18} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.card}>
            <SettingRow icon="lock-closed-outline" iconBg="#FEE2E2" iconColor="#EF4444" label="Change Password" onPress={() => setShowChangePassword(true)} />
            <View style={styles.separator} />
            <SettingRow icon="trash-outline" iconBg="#F3F4F6" iconColor="#6B7280" label="Clear Cache" onPress={handleClearCache} />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.navy} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App Version</Text>
              <Text style={styles.aboutValue}>2.0.0</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Driver ID</Text>
              <Text style={styles.aboutValue}>{profile?.id?.slice(0, 8) || '—'}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>Production</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="slide" transparent onRequestClose={() => setShowChangePassword(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Current Password</Text>
              <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Enter current password" placeholderTextColor={COLORS.textLight} />
              <Text style={styles.modalLabel}>New Password</Text>
              <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={COLORS.textLight} />
              <Text style={styles.modalLabel}>Confirm New Password</Text>
              <TextInput style={styles.modalInput} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Re-enter new password" placeholderTextColor={COLORS.textLight} />
              <TouchableOpacity style={[styles.modalButton, changingPassword && styles.modalButtonDisabled]} onPress={handleChangePassword} disabled={changingPassword}>
                <Text style={styles.modalButtonText}>{changingPassword ? 'Changing...' : 'Change Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SettingToggle({ icon, label, description, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconBg, { backgroundColor: `${COLORS.navy}10` }]}>
          <Ionicons name={icon} size={18} color={COLORS.navy} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: `${COLORS.seafoam}80` }}
        thumbColor={value ? COLORS.seafoam : '#f4f3f4'}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

function SettingRow({ icon, iconBg, iconColor, label, onPress }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconBg, { backgroundColor: iconBg || '#F3F4F6' }]}>
          <Ionicons name={icon} size={18} color={iconColor || COLORS.navy} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGrey },
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === 'ios' ? 50 : 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textWhite },
  scrollContent: { padding: 16 },
  // Sections
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    ...SHADOWS.small,
  },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  // Setting rows
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  settingDescription: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  aboutLabel: { fontSize: 15, color: COLORS.textSecondary },
  aboutValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    ...SHADOWS.small,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  modalForm: { gap: 0 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: COLORS.softGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalButton: { backgroundColor: COLORS.seafoam, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  modalButtonDisabled: { opacity: 0.6 },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.textWhite },
  // Reminder time picker
  reminderTimePicker: {
    paddingVertical: 12,
    paddingLeft: 48,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reminderLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  reminderChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softGrey,
  },
  reminderChipActive: {
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}15`,
  },
  reminderChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  reminderChipTextActive: { color: COLORS.seafoam },
});
