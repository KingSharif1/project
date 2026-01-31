import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Clock, Info, Check, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReminderSettings as ReminderSettingsType, DEFAULT_REMINDER_SETTINGS } from '../utils/reminderService';

interface ReminderSettingsProps {
  patientId: string;
  onClose?: () => void;
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({ patientId, onClose }) => {
  const [settings, setSettings] = useState<ReminderSettingsType>(DEFAULT_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [patientId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_reminder_preferences')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading reminder settings:', error);
      }

      if (data) {
        setSettings({
          enabled: data.enabled,
          smsEnabled: data.sms_enabled,
          emailEnabled: data.email_enabled,
          reminderTimes: data.reminder_times || DEFAULT_REMINDER_SETTINGS.reminderTimes,
          includeDriverInfo: data.include_driver_info,
          includeTrackingLink: data.include_tracking_link,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('patient_reminder_preferences')
        .upsert({
          patient_id: patientId,
          enabled: settings.enabled,
          sms_enabled: settings.smsEnabled,
          email_enabled: settings.emailEnabled,
          reminder_times: settings.reminderTimes,
          include_driver_info: settings.includeDriverInfo,
          include_tracking_link: settings.includeTrackingLink,
        }, {
          onConflict: 'patient_id'
        });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addReminderTime = () => {
    setSettings({
      ...settings,
      reminderTimes: [...settings.reminderTimes, 1],
    });
  };

  const removeReminderTime = (index: number) => {
    setSettings({
      ...settings,
      reminderTimes: settings.reminderTimes.filter((_, i) => i !== index),
    });
  };

  const updateReminderTime = (index: number, value: number) => {
    const newTimes = [...settings.reminderTimes];
    newTimes[index] = value;
    setSettings({
      ...settings,
      reminderTimes: newTimes,
    });
  };

  const formatReminderTime = (hours: number): string => {
    if (hours >= 24) {
      const days = hours / 24;
      return `${days} day${days > 1 ? 's' : ''} before`;
    } else if (hours >= 1) {
      return `${hours} hour${hours > 1 ? 's' : ''} before`;
    } else {
      const minutes = hours * 60;
      return `${minutes} minute${minutes > 1 ? 's' : ''} before`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Trip Reminder Settings</h2>
              <p className="text-sm text-gray-600">Configure automatic notifications for scheduled trips</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-600" />
            <div>
              <p className="font-semibold text-gray-900">Enable Trip Reminders</p>
              <p className="text-sm text-gray-600">Receive notifications before scheduled trips</p>
            </div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* Notification Methods */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Notification Methods</h3>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">SMS Text Messages</p>
                    <p className="text-xs text-gray-600">Receive reminders via text</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, smsEnabled: !settings.smsEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.smsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.smsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-600">Receive reminders via email</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, emailEnabled: !settings.emailEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.emailEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.emailEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Reminder Times */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Reminder Schedule</h3>
                <button
                  onClick={addReminderTime}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Reminder
                </button>
              </div>

              <div className="space-y-2">
                {settings.reminderTimes.sort((a, b) => b - a).map((hours, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <Clock size={18} className="text-gray-400" />
                    <select
                      value={hours}
                      onChange={(e) => updateReminderTime(index, parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value={168}>1 week before</option>
                      <option value={72}>3 days before</option>
                      <option value={48}>2 days before</option>
                      <option value={24}>1 day before</option>
                      <option value={12}>12 hours before</option>
                      <option value={6}>6 hours before</option>
                      <option value={4}>4 hours before</option>
                      <option value={2}>2 hours before</option>
                      <option value={1}>1 hour before</option>
                      <option value={0.5}>30 minutes before</option>
                      <option value={0.25}>15 minutes before</option>
                    </select>
                    {settings.reminderTimes.length > 1 && (
                      <button
                        onClick={() => removeReminderTime(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  You will receive a reminder at each selected time before your scheduled trip.
                </p>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Include in Reminders</h3>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={settings.includeDriverInfo}
                  onChange={(e) => setSettings({ ...settings, includeDriverInfo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Driver Information</p>
                  <p className="text-xs text-gray-600">Include driver name and phone number</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={settings.includeTrackingLink}
                  onChange={(e) => setSettings({ ...settings, includeTrackingLink: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Real-time Tracking Link</p>
                  <p className="text-xs text-gray-600">Include link to track driver location</p>
                </div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <Check size={18} />
                <span className="text-sm font-medium">Settings saved successfully!</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
