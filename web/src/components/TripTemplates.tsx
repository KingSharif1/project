import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, Plus, Edit2, Trash2, Play, Pause, MapPin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface TripTemplate {
  id: string;
  template_name: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  pickup_zip: string;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_state: string;
  dropoff_zip: string;
  trip_type: string;
  service_level: string;
  recurrence_pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'weekdays' | 'custom';
  recurrence_days?: number[];
  preferred_time?: string;
  duration_minutes?: number;
  notes?: string;
  special_instructions?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export const TripTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TripTemplate | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    template_name: '',
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    pickup_address: '',
    pickup_city: '',
    pickup_state: 'TX',
    pickup_zip: '',
    dropoff_address: '',
    dropoff_city: '',
    dropoff_state: 'TX',
    dropoff_zip: '',
    service_level: 'ambulatory',
    recurrence_pattern: 'weekly' as const,
    recurrence_days: [] as number[],
    preferred_time: '09:00',
    duration_minutes: 30,
    notes: '',
    special_instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trip_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        trip_type: formData.service_level,
        facility_id: user?.clinicId || null,
        created_by: user?.id || null,
        is_active: true,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('trip_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_templates')
          .insert(templateData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleToggleActive = async (template: TripTemplate) => {
    try {
      const { error } = await supabase
        .from('trip_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('trip_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEdit = (template: TripTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      patient_name: template.patient_name,
      patient_phone: template.patient_phone,
      patient_email: template.patient_email || '',
      pickup_address: template.pickup_address,
      pickup_city: template.pickup_city,
      pickup_state: template.pickup_state,
      pickup_zip: template.pickup_zip,
      dropoff_address: template.dropoff_address,
      dropoff_city: template.dropoff_city,
      dropoff_state: template.dropoff_state,
      dropoff_zip: template.dropoff_zip,
      service_level: template.service_level,
      recurrence_pattern: template.recurrence_pattern,
      recurrence_days: template.recurrence_days || [],
      preferred_time: template.preferred_time || '09:00',
      duration_minutes: template.duration_minutes || 30,
      notes: template.notes || '',
      special_instructions: template.special_instructions || '',
      start_date: template.start_date || new Date().toISOString().split('T')[0],
      end_date: template.end_date || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      patient_name: '',
      patient_phone: '',
      patient_email: '',
      pickup_address: '',
      pickup_city: '',
      pickup_state: 'TX',
      pickup_zip: '',
      dropoff_address: '',
      dropoff_city: '',
      dropoff_state: 'TX',
      dropoff_zip: '',
      service_level: 'ambulatory',
      recurrence_pattern: 'weekly',
      recurrence_days: [],
      preferred_time: '09:00',
      duration_minutes: 30,
      notes: '',
      special_instructions: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
  };

  const getRecurrenceText = (template: TripTemplate) => {
    const patterns: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      weekdays: 'Weekdays',
      custom: 'Custom',
    };

    let text = patterns[template.recurrence_pattern] || template.recurrence_pattern;

    if (template.recurrence_days && template.recurrence_days.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNames = template.recurrence_days.map(d => days[d]).join(', ');
      text += ` (${dayNames})`;
    }

    return text;
  };

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Templates</h1>
          <p className="text-gray-600 mt-1">Create templates for recurring trips like dialysis or therapy appointments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTemplate(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Template</span>
        </button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Repeat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-4">Create your first recurring trip template</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                template.is_active ? 'border-blue-200 hover:border-blue-300' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{template.template_name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Repeat className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">{getRecurrenceText(template)}</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  template.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {template.is_active ? 'Active' : 'Paused'}
                </div>
              </div>

              {/* Patient Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{template.patient_name}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {template.preferred_time || '—'} ({template.duration_minutes || 30} min)
                  </span>
                </div>

                <div className="flex items-start space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-700 truncate">{template.pickup_address}</div>
                    <div className="text-gray-500 text-xs">→</div>
                    <div className="text-gray-700 truncate">{template.dropoff_address}</div>
                  </div>
                </div>
              </div>

              {/* Service Level */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                  {template.service_level}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleActive(template)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {template.is_active ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Activate</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>

                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Simplified for brevity */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Template Name (e.g., John Doe - Dialysis)"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Patient Name"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={formData.recurrence_pattern}
                onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays Only</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>

              {(formData.recurrence_pattern === 'weekly' || formData.recurrence_pattern === 'custom') && (
                <div className="flex space-x-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.recurrence_days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTemplate ? 'Update' : 'Create'} Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
