import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  tripId?: string;
  driverId?: string;
  relatedUserId?: string;
  actionUrl?: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

interface NotificationPreferences {
  tripAssigned: boolean;
  tripStatusChanged: boolean;
  tripCancelled: boolean;
  tripCompleted: boolean;
  newMessage: boolean;
  paymentReceived: boolean;
  systemAlerts: boolean;
  soundEnabled: boolean;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    tripAssigned: true,
    tripStatusChanged: true,
    tripCancelled: true,
    tripCompleted: true,
    newMessage: true,
    paymentReceived: true,
    systemAlerts: true,
    soundEnabled: true
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadPreferences();
      subscribeToNotifications();
    }
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const result = await api.getUserNotifications();
      const data = result.data || [];

      const formattedNotifications = data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        tripId: n.trip_id,
        driverId: n.driver_id,
        relatedUserId: n.related_user_id,
        actionUrl: n.action_url,
        isRead: n.is_read,
        priority: n.priority,
        metadata: n.metadata,
        createdAt: n.created_at,
        readAt: n.read_at
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n: any) => !n.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const result = await api.getNotificationPreferences();
      const data = result.data;

      if (data) {
        setPreferences({
          tripAssigned: data.trip_assigned,
          tripStatusChanged: data.trip_status_changed,
          tripCancelled: data.trip_cancelled,
          tripCompleted: data.trip_completed,
          newMessage: data.new_message,
          paymentReceived: data.payment_received,
          systemAlerts: data.system_alerts,
          soundEnabled: data.sound_enabled
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newNotification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            tripId: payload.new.trip_id,
            driverId: payload.new.driver_id,
            relatedUserId: payload.new.related_user_id,
            actionUrl: payload.new.action_url,
            isRead: payload.new.is_read,
            priority: payload.new.priority,
            metadata: payload.new.metadata,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Play sound if enabled
          if (preferences.soundEnabled) {
            playNotificationSound();
          }

          // Show browser notification
          showBrowserNotification(newNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const playNotificationSound = () => {
    // Create a simple beep sound
    if (!audioRef.current) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
        badge: '/badge.png'
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationRead(notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await api.markAllNotificationsRead(unreadIds);

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.isRead ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;

    try {
      await api.clearAllNotifications();

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await api.saveNotificationPreferences({
        trip_assigned: preferences.tripAssigned,
        trip_status_changed: preferences.tripStatusChanged,
        trip_cancelled: preferences.tripCancelled,
        trip_completed: preferences.tripCompleted,
        new_message: preferences.newMessage,
        payment_received: preferences.paymentReceived,
        system_alerts: preferences.systemAlerts,
        sound_enabled: preferences.soundEnabled,
      });

      alert('Preferences saved successfully!');
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      trip_assigned: '🚗',
      trip_status_changed: '📋',
      trip_cancelled: '❌',
      trip_completed: '✅',
      message: '💬',
      payment: '💰',
      alert: '⚠️',
      system: '🔔'
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'border-gray-300 bg-gray-50',
      normal: 'border-blue-300 bg-blue-50',
      high: 'border-orange-300 bg-orange-50',
      urgent: 'border-red-300 bg-red-50'
    };
    return colors[priority] || colors.normal;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowSettings(false);
          requestNotificationPermission();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!showSettings && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                  className="flex-1 text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings ? (
            <div className="p-4 overflow-y-auto">
              <h4 className="font-semibold text-gray-900 mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Trip Assigned</span>
                  <input
                    type="checkbox"
                    checked={preferences.tripAssigned}
                    onChange={e => setPreferences({ ...preferences, tripAssigned: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Trip Status Changed</span>
                  <input
                    type="checkbox"
                    checked={preferences.tripStatusChanged}
                    onChange={e => setPreferences({ ...preferences, tripStatusChanged: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Trip Cancelled</span>
                  <input
                    type="checkbox"
                    checked={preferences.tripCancelled}
                    onChange={e => setPreferences({ ...preferences, tripCancelled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Trip Completed</span>
                  <input
                    type="checkbox"
                    checked={preferences.tripCompleted}
                    onChange={e => setPreferences({ ...preferences, tripCompleted: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Messages</span>
                  <input
                    type="checkbox"
                    checked={preferences.newMessage}
                    onChange={e => setPreferences({ ...preferences, newMessage: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Payment Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.paymentReceived}
                    onChange={e => setPreferences({ ...preferences, paymentReceived: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">System Alerts</span>
                  <input
                    type="checkbox"
                    checked={preferences.systemAlerts}
                    onChange={e => setPreferences({ ...preferences, systemAlerts: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 flex items-center space-x-2">
                    {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Sound Enabled</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={e => setPreferences({ ...preferences, soundEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
              <button
                onClick={savePreferences}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          ) : (
            <>
              {/* Notification List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${getPriorityColor(notification.priority)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="ml-2 p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(notification.createdAt)}
                              </span>
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
