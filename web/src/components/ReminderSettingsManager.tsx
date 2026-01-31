import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Clock, AlertCircle, Save, X, Plus, Trash2 } from 'lucide-react';

interface ReminderSettingsManagerProps {
  onClose: () => void;
}

export const ReminderSettingsManager: React.FC<ReminderSettingsManagerProps> = ({ onClose }) => {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: true,
    inAppEnabled: true,
    reminderSchedules: [
      { days: 30, label: '30 days before', enabled: true, emailEnabled: true, smsEnabled: false },
      { days: 14, label: '2 weeks before', enabled: true, emailEnabled: true, smsEnabled: false },
      { days: 7, label: '1 week before', enabled: true, emailEnabled: true, smsEnabled: true },
      { days: 3, label: '3 days before', enabled: true, emailEnabled: true, smsEnabled: true },
      { days: 1, label: '1 day before', enabled: true, emailEnabled: true, smsEnabled: true },
      { days: 0, label: 'On expiry day', enabled: true, emailEnabled: true, smsEnabled: true }
    ],
    snoozeEnabled: true,
    snoozeDurations: [1, 3, 7, 14],
    emailTemplate: {
      subject: 'Document Expiry Reminder - {{DOCUMENT_TYPE}}',
      body: 'Hello {{DRIVER_NAME}},\n\nThis is a reminder that your {{DOCUMENT_TYPE}} will expire on {{EXPIRY_DATE}}.\n\nPlease renew it as soon as possible to avoid any interruptions.\n\nThank you,\nTransportation Management Team'
    },
    smsTemplate: {
      message: 'Reminder: Your {{DOCUMENT_TYPE}} expires on {{EXPIRY_DATE}}. Please renew soon.'
    }
  });

  const [newSchedule, setNewSchedule] = useState({ days: 0, label: '' });
  const [showAddSchedule, setShowAddSchedule] = useState(false);

  const handleSave = () => {
    alert('Reminder settings saved successfully!');
    onClose();
  };

  const handleAddSchedule = () => {
    if (newSchedule.days >= 0 && newSchedule.label) {
      setSettings({
        ...settings,
        reminderSchedules: [
          ...settings.reminderSchedules,
          { ...newSchedule, enabled: true, emailEnabled: true, smsEnabled: false }
        ].sort((a, b) => b.days - a.days)
      });
      setNewSchedule({ days: 0, label: '' });
      setShowAddSchedule(false);
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setSettings({
      ...settings,
      reminderSchedules: settings.reminderSchedules.filter((_, i) => i !== index)
    });
  };

  const updateSchedule = (index: number, updates: any) => {
    const updated = [...settings.reminderSchedules];
    updated[index] = { ...updated[index], ...updates };
    setSettings({ ...settings, reminderSchedules: updated });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Bell className="w-6 h-6 mr-2" />
                Reminder Settings
              </h2>
              <p className="text-blue-100 mt-1">Configure email and SMS notification preferences</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Global Settings */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">Global Notification Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-600">Send reminders via email</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-900">SMS Notifications</div>
                    <div className="text-sm text-gray-600">Send reminders via text message</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsEnabled}
                  onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold text-gray-900">In-App Notifications</div>
                    <div className="text-sm text-gray-600">Show reminders in the dashboard</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.inAppEnabled}
                  onChange={(e) => setSettings({ ...settings, inAppEnabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Reminder Schedules */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Reminder Schedule</h3>
              <button
                onClick={() => setShowAddSchedule(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Schedule</span>
              </button>
            </div>

            {showAddSchedule && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3">Add New Reminder Schedule</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days Before Expiry</label>
                    <input
                      type="number"
                      min="0"
                      value={newSchedule.days}
                      onChange={(e) => setNewSchedule({ ...newSchedule, days: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={newSchedule.label}
                      onChange={(e) => setNewSchedule({ ...newSchedule, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1 week before"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddSchedule}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSchedule(false);
                      setNewSchedule({ days: 0, label: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {settings.reminderSchedules.map((schedule, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">{schedule.label}</span>
                      <span className="text-sm text-gray-600">({schedule.days} days before)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(e) => updateSchedule(index, { enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Enabled</span>
                      </label>
                      <button
                        onClick={() => handleRemoveSchedule(index)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm ml-7">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.emailEnabled}
                        onChange={(e) => updateSchedule(index, { emailEnabled: e.target.checked })}
                        disabled={!schedule.enabled}
                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.smsEnabled}
                        onChange={(e) => updateSchedule(index, { smsEnabled: e.target.checked })}
                        disabled={!schedule.enabled}
                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-gray-700">SMS</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Snooze Settings */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">Snooze Options</h3>
            <label className="flex items-center justify-between mb-4">
              <span className="text-gray-700">Allow users to snooze reminders</span>
              <input
                type="checkbox"
                checked={settings.snoozeEnabled}
                onChange={(e) => setSettings({ ...settings, snoozeEnabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            {settings.snoozeEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Snooze Durations (days)</label>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {settings.snoozeDurations.map((duration, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {duration} day{duration !== 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Template */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Email Template
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={settings.emailTemplate.subject}
                  onChange={(e) => setSettings({
                    ...settings,
                    emailTemplate: { ...settings.emailTemplate, subject: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={settings.emailTemplate.body}
                  onChange={(e) => setSettings({
                    ...settings,
                    emailTemplate: { ...settings.emailTemplate, body: e.target.value }
                  })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Available Variables:</span> {'{'}
                  {'{DRIVER_NAME}'}, {'{'}
                  {'{DOCUMENT_TYPE}'}, {'{'}
                  {'{EXPIRY_DATE}'}
                </p>
              </div>
            </div>
          </div>

          {/* SMS Template */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
              SMS Template
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={settings.smsTemplate.message}
                  onChange={(e) => setSettings({
                    ...settings,
                    smsTemplate: { ...settings.smsTemplate, message: e.target.value }
                  })}
                  rows={3}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings.smsTemplate.message.length}/160 characters
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Available Variables:</span> {'{'}
                  {'{DRIVER_NAME}'}, {'{'}
                  {'{DOCUMENT_TYPE}'}, {'{'}
                  {'{EXPIRY_DATE}'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
