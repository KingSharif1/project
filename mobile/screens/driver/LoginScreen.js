import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI } from '../../services/api';
import { COLORS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

// Animated floating circle for background
function FloatingCircle({ delay, duration, startX, startY, size, opacity }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateY = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: -30, duration, delay, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 30, duration, useNativeDriver: true }),
        ])
      ).start();
    };
    const animateX = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, { toValue: 15, duration: duration * 1.3, delay, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -15, duration: duration * 1.3, useNativeDriver: true }),
        ])
      ).start();
    };
    animateY();
    animateX();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.seafoam,
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

export default function DriverLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    loadSavedCredentials();
    if (Platform.OS !== 'web') {
      checkBiometricAvailability();
    }
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      if (Platform.OS !== 'web' && LocalAuthentication) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
      } else {
        setBiometricAvailable(false);
      }
    } catch (error) {
      console.log('Biometric check error:', error);
      setBiometricAvailable(false);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedRemember = await AsyncStorage.getItem('rememberMe');
      if (savedEmail && savedRemember === 'true') {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!LocalAuthentication) {
      Alert.alert('Not Available', 'Biometric authentication not available on web');
      return;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with biometrics',
        fallbackLabel: 'Use password',
      });
      if (result.success) {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          handleLogin(savedEmail, savedPassword);
        } else {
          showToast('No saved credentials. Please login manually.', 'error');
        }
      }
    } catch (error) {
      showToast('Biometric authentication failed', 'error');
    }
  };

  const handleLogin = async (loginEmail = email, loginPassword = password) => {
    if (!loginEmail || !loginPassword) {
      showToast('Please enter email and password', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await driverAPI.login(loginEmail, loginPassword, 'driver');
      if (response.success) {
        if (rememberMe) {
          await AsyncStorage.setItem('savedEmail', loginEmail);
          await AsyncStorage.setItem('savedPassword', loginPassword);
          await AsyncStorage.setItem('rememberMe', 'true');
        } else {
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('savedPassword');
          await AsyncStorage.removeItem('rememberMe');
        }

        const driverName = response.driver?.name || response.profile?.name || 'Driver';
        showToast(`Welcome back, ${driverName}!`, 'success');

        // Pass mustChangePassword flag to parent
        setTimeout(() => onLogin({
          mustChangePassword: response.mustChangePassword || false,
          usedTempPassword: response.usedTempPassword || false,
        }), 600);
      }
    } catch (error) {
      showToast(error.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToast({ visible: false, message: '', type: 'success' });
      });
    }, 3000);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Please contact your dispatcher or administrator to reset your password.',
      [
        { text: 'Call Support', onPress: () => Linking.openURL('tel:8175550100') },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Background */}
      <LinearGradient
        colors={[COLORS.navy, COLORS.navyLight, COLORS.navyDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FloatingCircle delay={0} duration={4000} startX={width * 0.1} startY={height * 0.08} size={80} opacity={0.06} />
      <FloatingCircle delay={500} duration={5000} startX={width * 0.7} startY={height * 0.12} size={120} opacity={0.04} />
      <FloatingCircle delay={1000} duration={3500} startX={width * 0.4} startY={height * 0.7} size={60} opacity={0.05} />
      <FloatingCircle delay={300} duration={4500} startX={width * 0.8} startY={height * 0.6} size={90} opacity={0.04} />
      <FloatingCircle delay={800} duration={3800} startX={width * 0.15} startY={height * 0.45} size={50} opacity={0.06} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons name="car-sport" size={36} color={COLORS.seafoam} />
              </View>
              <Text style={styles.title}>FW Transport</Text>
              <Text style={styles.subtitle}>Driver Portal</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSubtitle}>Enter your credentials to continue</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={COLORS.textLight}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 50 }]}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={() => handleLogin()}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => handleLogin()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.seafoam, COLORS.seafoamDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Biometric Login */}
              {biometricAvailable && Platform.OS !== 'web' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricLogin}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="finger-print" size={24} color={COLORS.navy} />
                    <Text style={styles.biometricText}>Use Biometrics</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.supportLink}>Need help? Contact support</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>v2.0.0</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 20 : 40,
  },
  content: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 28 : 36,
    paddingTop: isSmallDevice ? 40 : 60,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(69,177,168,0.3)',
  },
  title: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.textWhite,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.seafoam,
    fontWeight: '500',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: isSmallDevice ? 24 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softGrey,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: isSmallDevice ? 14 : 16,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -11 }],
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.seafoam,
    borderColor: COLORS.seafoam,
  },
  rememberMeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.seafoam,
    fontWeight: '600',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 16 : 18,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softGrey,
  },
  biometricText: {
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: isSmallDevice ? 24 : 32,
    paddingBottom: 20,
  },
  supportLink: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 12,
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
