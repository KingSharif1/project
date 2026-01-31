import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { logAudit } from '../utils/auditLog';
import { useSessionTimeout } from '../utils/sessionTimeout';
import { bruteForceProtection, formatLockoutTime } from '../utils/bruteForceProtection';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isSuperAdmin: boolean; // Platform owner - can manage all companies
  isAdmin: boolean; // Company admin - manages their own company
  isDispatcher: boolean;
  isRegularDispatcher: boolean; // Company-level dispatcher (no facility assigned)
  isFacilityDispatcher: boolean; // Facility-level dispatcher (has facilityId)
  showSessionWarning: boolean;
  extendSession: () => void;
  // Permission helpers
  canManageCompanies: boolean; // Super admin only - create/edit companies
  canManageUsers: boolean;
  canManageFacilities: boolean;
  canAssignDrivers: boolean;
  canViewAllTrips: boolean;
  canViewFinancialReports: boolean;
  canManageDrivers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('transportHub_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const handleSessionTimeout = () => {
    if (user) {
      logAudit({
        userId: user.id,
        clinicId: user.clinicId,
        action: 'logout',
        entityType: 'auth',
        details: { reason: 'session_timeout' }
      });
      logout();
      alert('Your session has expired due to inactivity. Please log in again.');
    }
  };

  const handleSessionWarning = () => {
    setShowSessionWarning(true);
  };

  const { resetTimer } = useSessionTimeout(
    handleSessionTimeout,
    handleSessionWarning
  );

  const extendSession = () => {
    setShowSessionWarning(false);
    resetTimer();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Check brute force protection
      if (bruteForceProtection.isBlocked(email)) {
        const remainingTime = bruteForceProtection.getRemainingLockoutTime(email);
        const timeString = formatLockoutTime(remainingTime);

        await logAudit({
          action: 'login_failed',
          entityType: 'auth',
          details: { email, reason: 'account_locked', remainingTime: timeString }
        });

        alert(`Account temporarily locked due to multiple failed login attempts. Please try again in ${timeString}.`);
        return false;
      }

      // Authenticate with backend API
      const response = await api.login(email, password);

      if (!response.success) {
        bruteForceProtection.recordAttempt(email, false);
        const remainingAttempts = bruteForceProtection.getRemainingAttempts(email);

        await logAudit({
          action: 'login_failed',
          entityType: 'auth',
          details: {
            email,
            reason: 'invalid_credentials',
            remainingAttempts,
            attemptCount: bruteForceProtection.getAttemptCount(email)
          }
        });

        if (remainingAttempts > 0 && remainingAttempts <= 2) {
          alert(`Invalid credentials. You have ${remainingAttempts} attempt(s) remaining before your account is locked.`);
        }

        return false;
      }

      // User profile from backend
      const userProfile: User = {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.fullName,
        role: response.user.role as 'admin' | 'dispatcher',
        clinicId: response.user.clinicId || undefined,
        isActive: response.user.isActive,
        createdAt: response.user.createdAt,
        updatedAt: response.user.updatedAt,
      };

      bruteForceProtection.recordAttempt(email, true);

      setUser(userProfile);
      localStorage.setItem('transportHub_user', JSON.stringify(userProfile));
      localStorage.setItem('transportHub_loginTime', new Date().toISOString());
      localStorage.setItem('transportHub_token', response.token);

      await logAudit({
        userId: userProfile.id,
        clinicId: userProfile.clinicId,
        action: 'login',
        entityType: 'auth',
        details: { email }
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      await logAudit({
        action: 'login_failed',
        entityType: 'auth',
        details: { email, reason: 'exception', error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      await logAudit({
        userId: user.id,
        clinicId: user.clinicId,
        action: 'logout',
        entityType: 'auth',
        details: { reason: 'user_initiated' }
      });
    }
    
    // Call backend logout endpoint
    const token = localStorage.getItem('transportHub_token');
    if (token) {
      try {
        await api.logout(token);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setUser(null);
    localStorage.removeItem('transportHub_user');
    localStorage.removeItem('transportHub_loginTime');
    localStorage.removeItem('transportHub_token');
  };

  // Role flags
  const isSuperAdmin = user?.role === 'superadmin'; // Platform owner - manages all companies
  const isAdmin = user?.role === 'admin' || isSuperAdmin; // Company admin OR super admin
  const isDispatcher = user?.role === 'dispatcher';
  const isFacilityDispatcher = isDispatcher && !!user?.facilityId;
  const isRegularDispatcher = isDispatcher && !user?.facilityId;

  // Permission helpers based on role
  const canManageCompanies = isSuperAdmin; // Only super admin can create/edit companies
  const canManageUsers = isAdmin; // Admin and super admin can manage users
  const canManageFacilities = isAdmin; // Only admin can create/edit facilities
  const canAssignDrivers = isAdmin || isRegularDispatcher; // Facility dispatchers cannot assign drivers
  const canViewAllTrips = isAdmin || isRegularDispatcher; // Facility dispatchers only see their facility's trips
  const canViewFinancialReports = isAdmin; // Only admin can view financial reports
  const canManageDrivers = isAdmin || isRegularDispatcher; // Facility dispatchers cannot manage drivers

  const value: AuthContextType = {
    user,
    login,
    logout,
    isSuperAdmin,
    isAdmin,
    isDispatcher,
    isRegularDispatcher,
    isFacilityDispatcher,
    showSessionWarning,
    extendSession,
    canManageCompanies,
    canManageUsers,
    canManageFacilities,
    canAssignDrivers,
    canViewAllTrips,
    canViewFinancialReports,
    canManageDrivers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
