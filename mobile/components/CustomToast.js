import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const { width } = Dimensions.get('window');

const TOAST_TYPES = {
  success: {
    bg: '#ECFDF5',
    border: COLORS.success,
    icon: 'checkmark-circle',
    iconColor: COLORS.success,
    textColor: '#065F46',
  },
  error: {
    bg: '#FEF2F2',
    border: COLORS.danger,
    icon: 'alert-circle',
    iconColor: COLORS.danger,
    textColor: '#991B1B',
  },
  info: {
    bg: '#EFF6FF',
    border: COLORS.info,
    icon: 'information-circle',
    iconColor: COLORS.info,
    textColor: '#1E40AF',
  },
  warning: {
    bg: '#FFFBEB',
    border: COLORS.warning,
    icon: 'warning',
    iconColor: COLORS.warning,
    textColor: '#92400E',
  },
};

// ── Toast Component ──

function ToastItem({ id, type, title, message, duration, onDismiss }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => dismiss(), duration || 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(id));
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={config.icon} size={22} color={config.iconColor} />
      <View style={styles.toastContent}>
        {title && <Text style={[styles.toastTitle, { color: config.textColor }]}>{title}</Text>}
        {message && <Text style={[styles.toastMessage, { color: config.textColor }]}>{message}</Text>}
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color={config.textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Confirmation Modal ──

function ConfirmModal({ visible, title, message, confirmText, cancelText, confirmColor, onConfirm, onCancel, icon, iconColor }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = (cb) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => cb());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.modalOverlay, { opacity: bgOpacity }]}>
      <Animated.View style={[styles.modalCard, { transform: [{ scale }] }]}>
        {icon && (
          <View style={[styles.modalIconCircle, { backgroundColor: (iconColor || COLORS.seafoam) + '20' }]}>
            <Ionicons name={icon} size={28} color={iconColor || COLORS.seafoam} />
          </View>
        )}
        <Text style={styles.modalTitle}>{title}</Text>
        {message && <Text style={styles.modalMessage}>{message}</Text>}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalCancelBtn}
            onPress={() => handleClose(onCancel)}
          >
            <Text style={styles.modalCancelText}>{cancelText || 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalConfirmBtn, { backgroundColor: confirmColor || COLORS.seafoam }]}
            onPress={() => handleClose(onConfirm)}
          >
            <Text style={styles.modalConfirmText}>{confirmText || 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ── Toast Provider (global) ──

let _showToast = () => {};
let _showConfirm = () => Promise.resolve(false);

export function showToast(type, title, message, duration) {
  _showToast(type, title, message, duration);
}

export function showConfirm({ title, message, confirmText, cancelText, confirmColor, icon, iconColor }) {
  return _showConfirm({ title, message, confirmText, cancelText, confirmColor, icon, iconColor });
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const confirmResolveRef = useRef(null);
  let nextId = useRef(0);

  _showToast = useCallback((type, title, message, duration) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  _showConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirm(opts);
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleConfirm = () => {
    setConfirm(null);
    if (confirmResolveRef.current) confirmResolveRef.current(true);
  };

  const handleCancel = () => {
    setConfirm(null);
    if (confirmResolveRef.current) confirmResolveRef.current(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Toast container */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            id={t.id}
            type={t.type}
            title={t.title}
            message={t.message}
            duration={t.duration}
            onDismiss={dismissToast}
          />
        ))}
      </View>

      {/* Confirm modal */}
      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText}
        cancelText={confirm?.cancelText}
        confirmColor={confirm?.confirmColor}
        icon={confirm?.icon}
        iconColor={confirm?.iconColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Toast ──
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 36,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    ...SHADOWS.medium,
  },
  toastContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toastMessage: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 18,
  },
  // ── Confirm Modal ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  modalCard: {
    width: width - 64,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
