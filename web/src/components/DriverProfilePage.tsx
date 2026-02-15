import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X, User, FileText, History, TrendingUp, DollarSign, Activity, Shield,
  Car, Heart, Clipboard, Calendar, MapPin, Star, Award, Clock, Phone,
  Mail, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Download,
  Upload, Eye, MessageSquare, Ban, CheckSquare, Filter, Search,
  CreditCard, Package, Settings, Bell, Plus, Tag, Folder, Paperclip
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { DriverRateTiers } from './DriverRateTiers';
import * as api from '../services/api';

interface DriverProfilePageProps {
  driver: any;
  trips: any[];
  vehicles: any[];
  onClose: () => void;
  onUpdateDriver: (driverId: string, updates: any) => void;
  onSuspendDriver?: (driverId: string) => void;
  onReactivateDriver?: (driverId: string) => void;
  onSendMessage?: (driverId: string, message: string) => void;
  onAssignVehicle?: (driverId: string, vehicleId: string) => void;
}

export const DriverProfilePage: React.FC<DriverProfilePageProps> = ({
  driver,
  trips,
  vehicles,
  onClose,
  onUpdateDriver,
  onSuspendDriver,
  onReactivateDriver,
  onSendMessage,
  onAssignVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'documents' | 'payments' | 'admin'>('overview');
  const [editMode, setEditMode] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'no-show'>('all');

  const [editedDriver, setEditedDriver] = useState({
    firstName: driver.firstName || '',
    lastName: driver.lastName || '',
    email: driver.email || '',
    phone: driver.phone || '',
    licenseNumber: driver.licenseNumber || '',
    dateOfBirth: driver.dateOfBirth || '',
    dateOfHire: driver.dateOfHire || '',
    socialSecurityNumber: driver.socialSecurityNumber || '',
    address: driver.address || '',
    emergencyContact: driver.emergencyContact || '',
    emergencyPhone: driver.emergencyPhone || '',
    notes: driver.notes || ''
  });

  const [documents, setDocuments] = useState({
    driver_license: '',
    driver_certification: '',
    vehicle_insurance: '',
    vehicle_registration: '',
    medical_cert: '',
    background_check: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: File | null}>({
    driver_license: null,
    driver_certification: null,
    vehicle_insurance: null,
    vehicle_registration: null,
    medical_cert: null,
    background_check: null
  });

  const [uploadStatus, setUploadStatus] = useState<{[key: string]: 'idle' | 'uploading' | 'success' | 'error'}>({});

  // Fetched document submissions from DB
  const [docSubmissions, setDocSubmissions] = useState<any[]>([]);

  const fetchDocSubmissions = useCallback(async () => {
    try {
      const result = await api.getDriverDocuments(driver.id);
      if (result.success) {
        setDocSubmissions(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch driver documents:', err);
    }
  }, [driver.id]);

  useEffect(() => {
    fetchDocSubmissions();
  }, [fetchDocSubmissions]);

  // Custom documents system
  interface CustomDocument {
    id: string;
    name: string;
    category: string;
    file: File | null;
    expiryDate: string;
    uploadDate: string;
    status: 'idle' | 'uploading' | 'success' | 'error';
    notes: string;
    tags: string[];
  }

  const [customDocuments, setCustomDocuments] = useState<CustomDocument[]>([]);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocTags, setNewDocTags] = useState('');
  const [documentFilter, setDocumentFilter] = useState<'all' | 'required' | 'custom' | 'expiring'>('all');

  const documentCategories = [
    'Licenses & Certifications',
    'Insurance Documents',
    'Medical Records',
    'Training & Compliance',
    'Vehicle Documents',
    'Employment Records',
    'Background Checks',
    'Tax Documents',
    'Other'
  ];

  const handleAddCustomDocument = () => {
    if (!newDocName) {
      alert('Please enter a document name');
      return;
    }

    const newDoc: CustomDocument = {
      id: Date.now().toString(),
      name: newDocName,
      category: newDocCategory || 'Other',
      file: null,
      expiryDate: newDocExpiry,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'idle',
      notes: newDocNotes,
      tags: newDocTags.split(',').map(t => t.trim()).filter(t => t)
    };

    setCustomDocuments([...customDocuments, newDoc]);
    setShowAddDocumentModal(false);
    setNewDocName('');
    setNewDocCategory('');
    setNewDocExpiry('');
    setNewDocNotes('');
    setNewDocTags('');
  };

  const handleCustomFileSelect = (docId: string, file: File | null) => {
    setCustomDocuments(customDocuments.map(doc =>
      doc.id === docId ? { ...doc, file } : doc
    ));
  };

  const handleUploadCustomDocument = async (docId: string) => {
    const doc = customDocuments.find(d => d.id === docId);
    if (!doc || !doc.file) return;

    setCustomDocuments(customDocuments.map(d =>
      d.id === docId ? { ...d, status: 'uploading' } : d
    ));

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCustomDocuments(customDocuments.map(d =>
        d.id === docId ? { ...d, status: 'success' } : d
      ));

      setTimeout(() => {
        setCustomDocuments(customDocuments.map(d =>
          d.id === docId ? { ...d, status: 'idle' } : d
        ));
      }, 2000);
    } catch (error) {
      setCustomDocuments(customDocuments.map(d =>
        d.id === docId ? { ...d, status: 'error' } : d
      ));
    }
  };

  const handleDeleteCustomDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setCustomDocuments(customDocuments.filter(d => d.id !== docId));
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'trips', label: 'Trip History', icon: History },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments & Billing', icon: DollarSign },
    { id: 'admin', label: 'Admin Actions', icon: Settings }
  ];

  // Calculate driver statistics
  const driverTrips = useMemo(() =>
    trips.filter(t => t.driverId === driver.id),
    [trips, driver.id]
  );

  const filteredTrips = useMemo(() => {
    let filtered = [...driverTrips];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.pickupLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dropoffLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tripNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(t => {
        const tripDate = new Date(t.scheduledTime);
        return tripDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.scheduledTime) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.scheduledTime) >= monthAgo);
    }

    return filtered.sort((a, b) =>
      new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );
  }, [driverTrips, searchQuery, dateFilter, statusFilter]);

  const stats = useMemo(() => {
    const completed = driverTrips.filter(t => t.status === 'completed');
    const cancelled = driverTrips.filter(t => t.status === 'cancelled');
    const noShow = driverTrips.filter(t => t.status === 'no-show');

    const totalEarnings = completed.reduce((sum, t) => sum + (t.driverPayout || 0), 0);
    const totalMiles = completed.reduce((sum, t) => sum + (t.distance || 0), 0);

    const completionRate = driverTrips.length > 0
      ? (completed.length / driverTrips.length) * 100
      : 0;

    return {
      totalTrips: driverTrips.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      totalEarnings,
      averagePerTrip: completed.length > 0 ? totalEarnings / completed.length : 0,
      totalMiles,
      completionRate,
      rating: driver.rating || 0
    };
  }, [driverTrips, driver.rating]);

  const getDocumentStatus = (date: string | null) => {
    if (!date) return { status: 'not-set', label: 'Not Set', color: 'text-orange-600 bg-orange-50', icon: AlertTriangle };

    const expiryDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired', color: 'text-red-600 bg-red-50', icon: XCircle };
    if (daysUntilExpiry <= 7) return { status: 'urgent', label: `${daysUntilExpiry}d left`, color: 'text-orange-600 bg-orange-50', icon: AlertTriangle };
    if (daysUntilExpiry <= 30) return { status: 'warning', label: `${daysUntilExpiry}d left`, color: 'text-amber-600 bg-amber-50', icon: AlertTriangle };
    return { status: 'valid', label: 'Valid', color: 'text-green-600 bg-green-50', icon: CheckCircle };
  };

  const handleSaveBasicInfo = () => {
    onUpdateDriver(driver.id, editedDriver);
    setEditMode(false);
  };

  const handleSaveDocuments = () => {
    // Document expiry dates are now tracked in document_submissions table, not on the driver record
    console.log('Document dates are managed via document_submissions table');
  };

  const handleSendMessage = () => {
    if (onSendMessage && messageText.trim()) {
      onSendMessage(driver.id, messageText);
      setMessageText('');
      setShowMessageModal(false);
    }
  };

  const handleFileSelect = (key: string, file: File | null) => {
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [key]: file }));
      setUploadStatus(prev => ({ ...prev, [key]: 'idle' }));
    }
  };

  const handleUploadDocument = async (key: string) => {
    const file = uploadedFiles[key];
    if (!file) return;

    setUploadStatus(prev => ({ ...prev, [key]: 'uploading' }));

    try {
      // Upload file via backend (uses service role key)
      const filePath = `${driver.id}/${key}/${Date.now()}_${file.name}`;
      const uploadResult = await api.uploadFileToStorage('driver-documents', filePath, file);

      // Save document record to document_submissions table via API
      await api.uploadDriverDocument(driver.id, {
        documentType: key,
        fileName: file.name,
        fileUrl: uploadResult.filePath,
        fileSize: file.size,
      });

      setUploadStatus(prev => ({ ...prev, [key]: 'success' }));
      setUploadedFiles(prev => ({ ...prev, [key]: null }));

      // Refresh document submissions so the View button appears
      await fetchDocSubmissions();

      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  // Helper: find the latest submission for a given document type
  const getSubmission = (docType: string) =>
    docSubmissions.find(s => s.document_type === docType);

  const handleViewDocument = async (fileUrl: string) => {
    try {
      const signedUrl = await api.getSignedUrl('driver-documents', fileUrl);
      window.open(signedUrl, '_blank');
    } catch (err) {
      console.error('Failed to get signed URL:', err);
      alert('Could not open document. Please try again.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDriverDocument(driver.id, docId);
      await fetchDocSubmissions();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const documentList = [
    {
      key: 'driver_license',
      label: 'Driver License',
      icon: Shield,
      color: 'blue',
    },
    {
      key: 'vehicle_insurance',
      label: 'Vehicle Insurance',
      icon: FileText,
      color: 'green',
    },
    {
      key: 'vehicle_registration',
      label: 'Vehicle Registration',
      icon: Car,
      color: 'purple',
    },
    {
      key: 'medical_cert',
      label: 'Medical Certification',
      icon: Heart,
      color: 'red',
    },
    {
      key: 'driver_certification',
      label: 'Driver Certification',
      icon: Award,
      color: 'indigo',
    },
    {
      key: 'background_check',
      label: 'Background Check',
      icon: Clipboard,
      color: 'amber',
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white p-6 rounded-t-xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold backdrop-blur-sm border-4 border-white/30">
                  {driver.firstName?.[0]}{driver.lastName?.[0]}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${
                  driver.status === 'available' ? 'bg-green-500' :
                  driver.status === 'off_duty' ? 'bg-gray-500' :
                  driver.status === 'on_trip' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  {driver.firstName} {driver.lastName}
                </h1>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={driver.status} size="sm" />
                  <span className="text-blue-100 text-sm">ID: {driver.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">{stats.totalTrips}</div>
              <div className="text-xs text-blue-100">Total Trips</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">{stats.completed}</div>
              <div className="text-xs text-blue-100">Completed</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1 flex items-center">
                <Star className="w-5 h-5 mr-1 fill-yellow-300 text-yellow-300" />
                {stats.rating.toFixed(1)}
              </div>
              <div className="text-xs text-blue-100">Rating</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">${stats.totalEarnings.toFixed(0)}</div>
              <div className="text-xs text-blue-100">Total Earnings</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">{stats.completionRate.toFixed(0)}%</div>
              <div className="text-xs text-blue-100">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-6">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-5 py-3 font-medium transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600 bg-white'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Driver Info Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <User className="w-6 h-6 mr-2 text-blue-600" />
                    Driver Information
                  </h2>
                  <button
                    onClick={() => editMode ? handleSaveBasicInfo() : setEditMode(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      editMode
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editMode ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4" />
                        <span>Edit Info</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Contact Details</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedDriver.firstName}
                          onChange={e => setEditedDriver({...editedDriver, firstName: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{driver.firstName || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedDriver.lastName}
                          onChange={e => setEditedDriver({...editedDriver, lastName: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{driver.lastName || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        Phone Number
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editedDriver.phone}
                          onChange={e => setEditedDriver({...editedDriver, phone: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{driver.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        Email Address
                      </label>
                      {editMode ? (
                        <input
                          type="email"
                          value={editedDriver.email}
                          onChange={e => setEditedDriver({...editedDriver, email: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{driver.email || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  {/* License & Status */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 mb-3">License & Status</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedDriver.licenseNumber}
                          onChange={e => setEditedDriver({...editedDriver, licenseNumber: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{driver.licenseNumber || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <p className="text-gray-900 font-medium">
                        {driver.licenseNumber || 'Not set'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      {editMode ? (
                        <input
                          type="date"
                          value={editedDriver.dateOfBirth}
                          onChange={e => setEditedDriver({...editedDriver, dateOfBirth: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {driver.dateOfBirth ? new Date(driver.dateOfBirth).toLocaleDateString() : 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-green-600" />
                        Date of Hire
                      </label>
                      {editMode ? (
                        <input
                          type="date"
                          value={editedDriver.dateOfHire}
                          onChange={e => setEditedDriver({...editedDriver, dateOfHire: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {driver.dateOfHire ? new Date(driver.dateOfHire).toLocaleDateString() : 'Not set'}
                        </p>
                      )}
                      {!editMode && driver.dateOfHire && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.floor((new Date().getTime() - new Date(driver.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 365))} years with company
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Social Security Number</label>
                      {editMode ? (
                        <input
                          type="password"
                          value={editedDriver.socialSecurityNumber}
                          onChange={e => setEditedDriver({...editedDriver, socialSecurityNumber: e.target.value})}
                          placeholder="XXX-XX-XXXX"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {driver.socialSecurityNumber ? '•••-••-' + driver.socialSecurityNumber.slice(-4) : 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Car className="w-4 h-4 mr-1" />
                        Vehicle Assignment
                      </label>
                      <p className="text-gray-900 font-medium">
                        {driver.vehicleId ? `Vehicle #${driver.vehicleId.slice(0, 8)}` : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    {editMode ? (
                      <textarea
                        value={editedDriver.address}
                        onChange={e => setEditedDriver({...editedDriver, address: e.target.value})}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Street address, city, state, zip"
                      />
                    ) : (
                      <p className="text-gray-700">{driver.address || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedDriver.emergencyContact}
                          onChange={e => setEditedDriver({...editedDriver, emergencyContact: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Emergency contact name"
                        />
                      ) : (
                        <p className="text-gray-700">{driver.emergencyContact || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Phone</label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editedDriver.emergencyPhone}
                          onChange={e => setEditedDriver({...editedDriver, emergencyPhone: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Emergency contact phone"
                        />
                      ) : (
                        <p className="text-gray-700">{driver.emergencyPhone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  {editMode ? (
                    <textarea
                      value={editedDriver.notes}
                      onChange={e => setEditedDriver({...editedDriver, notes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any notes about this driver..."
                    />
                  ) : (
                    <p className="text-gray-700">{driver.notes || 'No notes added'}</p>
                  )}
                </div>
              </div>

              {/* Document Status Quick View */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-purple-600" />
                    Document Compliance Status
                  </h3>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
                  >
                    <span>Manage Documents</span>
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Go to the Documents tab to upload and manage driver documents.
                </p>
              </div>

              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{stats.completionRate.toFixed(0)}%</div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Completion Rate</h3>
                  <p className="text-xs text-gray-600 mt-1">{stats.completed} of {stats.totalTrips} trips</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-600 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-green-600">${stats.averagePerTrip.toFixed(0)}</div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Avg per Trip</h3>
                  <p className="text-xs text-gray-600 mt-1">Total: ${stats.totalEarnings.toFixed(2)}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-purple-600 rounded-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{stats.totalMiles.toFixed(0)}</div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Total Miles</h3>
                  <p className="text-xs text-gray-600 mt-1">Across all trips</p>
                </div>
              </div>

              {/* Achievements */}
              {(stats.completed >= 50 || stats.rating >= 4.5 || stats.completionRate >= 95) && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                    <Award className="w-6 h-6 mr-2 text-amber-600" />
                    Achievements & Badges
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {stats.completed >= 100 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">🏆</div>
                        <div className="text-xs font-semibold text-gray-700">Century Club</div>
                        <div className="text-xs text-gray-500">100+ Trips</div>
                      </div>
                    )}
                    {stats.completed >= 50 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">🎯</div>
                        <div className="text-xs font-semibold text-gray-700">Milestone</div>
                        <div className="text-xs text-gray-500">50+ Trips</div>
                      </div>
                    )}
                    {stats.rating >= 4.8 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">⭐</div>
                        <div className="text-xs font-semibold text-gray-700">Excellence</div>
                        <div className="text-xs text-gray-500">4.8+ Rating</div>
                      </div>
                    )}
                    {stats.rating >= 4.5 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">🌟</div>
                        <div className="text-xs font-semibold text-gray-700">Top Rated</div>
                        <div className="text-xs text-gray-500">4.5+ Rating</div>
                      </div>
                    )}
                    {stats.completionRate >= 95 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">✓</div>
                        <div className="text-xs font-semibold text-gray-700">Reliable</div>
                        <div className="text-xs text-gray-500">95%+ Rate</div>
                      </div>
                    )}
                    {stats.totalMiles >= 1000 && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl mb-2">🚗</div>
                        <div className="text-xs font-semibold text-gray-700">Road Warrior</div>
                        <div className="text-xs text-gray-500">1000+ Miles</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRIPS TAB */}
          {activeTab === 'trips' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Search className="w-4 h-4 mr-1" />
                      Search Trips
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by customer, location, or trip #..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Date Range
                    </label>
                    <select
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Filter className="w-4 h-4 mr-1" />
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No-Show</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Showing {filteredTrips.length} of {driverTrips.length} trips
                </div>
              </div>

              {/* Trips List */}
              {filteredTrips.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <History className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 font-medium">No trips found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTrips.map(trip => (
                    <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h4 className="font-semibold text-gray-900">{trip.customerName}</h4>
                            <span className="text-xs text-gray-500">#{trip.tripNumber}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(trip.scheduledTime).toLocaleDateString()} at{' '}
                            {new Date(trip.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={trip.status} size="sm" />
                          <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{trip.serviceLevel}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{trip.pickupLocation}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{trip.dropoffLocation}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{trip.distance ? `${trip.distance} mi` : 'N/A'}</span>
                          {trip.actualPickupTime && trip.actualDropoffTime && (
                            <span>
                              {Math.round(
                                (new Date(trip.actualDropoffTime).getTime() -
                                 new Date(trip.actualPickupTime).getTime()) / 60000
                              )} min
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Driver Payout</div>
                          <div className="font-semibold text-gray-900">
                            ${(trip.driverPayout || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Document Management</h3>
                    <p className="text-sm text-blue-700">
                      Upload all required driver documents for compliance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {documentList.map(doc => {
                  const Icon = doc.icon;
                  const submission = getSubmission(doc.key);
                  const hasDoc = submission && !submission.file_url?.startsWith('pending://');

                  return (
                    <div key={doc.key} className={`bg-white rounded-xl border-2 transition-all hover:shadow-md ${hasDoc ? 'border-green-200' : 'border-gray-200'}`}>
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${hasDoc ? 'bg-green-100' : `bg-${doc.color}-100`}`}>
                            <Icon className={`w-5 h-5 ${hasDoc ? 'text-green-600' : `text-${doc.color}-600`}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{doc.label}</h4>
                            {hasDoc && (
                              <p className="text-xs text-gray-500">{submission.file_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasDoc ? (
                            <>
                              <span className="text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Uploaded
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(submission.submission_date).toLocaleDateString()}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Missing
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Existing Document Actions */}
                      {hasDoc && (
                        <div className="px-5 pb-3 flex items-center gap-2">
                          <button
                            onClick={() => handleViewDocument(submission.file_url)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(submission.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}

                      {/* Upload Area */}
                      <div className="px-5 pb-4">
                        {uploadedFiles[doc.key] ? (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs text-blue-800 truncate flex-1">{uploadedFiles[doc.key]?.name}</span>
                            <span className="text-xs text-blue-500">{(uploadedFiles[doc.key]!.size / 1024).toFixed(1)} KB</span>
                            <button
                              onClick={() => handleUploadDocument(doc.key)}
                              disabled={uploadStatus[doc.key] === 'uploading'}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                                uploadStatus[doc.key] === 'uploading'
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : uploadStatus[doc.key] === 'success'
                                  ? 'bg-green-600 text-white'
                                  : uploadStatus[doc.key] === 'error'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {uploadStatus[doc.key] === 'uploading' && (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading</>
                              )}
                              {uploadStatus[doc.key] === 'success' && (
                                <><CheckCircle className="w-3 h-3" /> Done</>
                              )}
                              {uploadStatus[doc.key] === 'error' && (
                                <><XCircle className="w-3 h-3" /> Failed</>
                              )}
                              {!uploadStatus[doc.key] || uploadStatus[doc.key] === 'idle' ? (
                                <><Upload className="w-3 h-3" /> Upload</>
                              ) : null}
                            </button>
                            <button
                              onClick={() => setUploadedFiles(prev => ({ ...prev, [doc.key]: null }))}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs text-gray-500">
                            <Upload className="w-4 h-4" />
                            <span>{hasDoc ? 'Replace with new file' : 'Choose file to upload'}</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleFileSelect(doc.key, e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSaveDocuments}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Save All Required Documents</span>
              </button>

              {/* Custom Documents Section */}
              <div className="border-t-4 border-gray-200 pt-8 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Folder className="w-7 h-7 mr-3 text-purple-600" />
                      Additional Documents
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Upload any additional documents as needed</p>
                  </div>
                  <button
                    onClick={() => setShowAddDocumentModal(true)}
                    className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Document</span>
                  </button>
                </div>

                {/* Document Filter */}
                <div className="flex items-center space-x-3 mb-6">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <div className="flex space-x-2">
                    {(['all', 'required', 'custom', 'expiring'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setDocumentFilter(filter)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          documentFilter === filter
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {filter === 'all' && 'All Documents'}
                        {filter === 'required' && 'Required Only'}
                        {filter === 'custom' && 'Custom Only'}
                        {filter === 'expiring' && 'Expiring Soon'}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {customDocuments.length} custom document{customDocuments.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Custom Documents List */}
                {customDocuments.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <Paperclip className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Additional Documents</h3>
                    <p className="text-gray-600 mb-4">Add any extra documents like training certificates, contracts, or other files</p>
                    <button
                      onClick={() => setShowAddDocumentModal(true)}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Your First Document</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customDocuments.map(doc => (
                      <div key={doc.id} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="p-2.5 bg-purple-600 rounded-lg">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 text-lg">{doc.name}</h4>
                                <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                                  <span className="flex items-center space-x-1">
                                    <Folder className="w-3.5 h-3.5" />
                                    <span>{doc.category}</span>
                                  </span>
                                  <span>•</span>
                                  <span>Added {new Date(doc.uploadDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            {doc.tags.length > 0 && (
                              <div className="flex items-center space-x-2 mt-2 ml-12">
                                <Tag className="w-3.5 h-3.5 text-purple-600" />
                                <div className="flex flex-wrap gap-1.5">
                                  {doc.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {doc.notes && (
                              <p className="text-sm text-gray-700 mt-2 ml-12 italic">{doc.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCustomDocument(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-12">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Expiration Date {doc.expiryDate ? '' : '(Optional)'}
                            </label>
                            <input
                              type="date"
                              value={doc.expiryDate}
                              onChange={(e) => setCustomDocuments(customDocuments.map(d =>
                                d.id === doc.id ? { ...d, expiryDate: e.target.value } : d
                              ))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            {doc.expiryDate && (
                              <p className="text-xs text-gray-600 mt-1">
                                {new Date(doc.expiryDate) < new Date()
                                  ? '❌ Expired'
                                  : `Expires in ${Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload File
                            </label>
                            <div className="flex space-x-2">
                              <label className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => handleCustomFileSelect(doc.id, e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">
                                  {doc.file ? doc.file.name : 'Choose File'}
                                </span>
                              </label>
                              {doc.file && (
                                <button
                                  onClick={() => handleUploadCustomDocument(doc.id)}
                                  disabled={doc.status === 'uploading'}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                                    doc.status === 'uploading'
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : doc.status === 'success'
                                      ? 'bg-green-600 text-white'
                                      : doc.status === 'error'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-purple-600 text-white hover:bg-purple-700'
                                  }`}
                                >
                                  {doc.status === 'uploading' && (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      <span className="text-xs">Uploading...</span>
                                    </>
                                  )}
                                  {doc.status === 'success' && (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Uploaded</span>
                                    </>
                                  )}
                                  {doc.status === 'error' && (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      <span className="text-xs">Failed</span>
                                    </>
                                  )}
                                  {doc.status === 'idle' && (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      <span className="text-xs">Upload</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            {doc.file && (
                              <p className="text-xs text-gray-500 mt-1">
                                Size: {(doc.file.size / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Document Modal */}
          {showAddDocumentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Plus className="w-6 h-6 mr-2 text-purple-600" />
                    Add New Document
                  </h2>
                  <button
                    onClick={() => setShowAddDocumentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="e.g., CPR Certification, Contract Agreement"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={newDocCategory}
                      onChange={(e) => setNewDocCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a category</option>
                      {documentCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newDocExpiry}
                      onChange={(e) => setNewDocExpiry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newDocTags}
                      onChange={(e) => setNewDocTags(e.target.value)}
                      placeholder="e.g., training, required, medical"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={newDocNotes}
                      onChange={(e) => setNewDocNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes about this document..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddDocumentModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomDocument}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                  >
                    Add Document
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-600 rounded-lg">
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${stats.totalEarnings.toFixed(2)}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Total Earnings</h3>
                  <p className="text-xs text-gray-600 mt-1">All-time total</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <CreditCard className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    ${stats.averagePerTrip.toFixed(2)}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Average per Trip</h3>
                  <p className="text-xs text-gray-600 mt-1">Across {stats.completed} trips</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-purple-600 rounded-lg">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    ${(stats.totalEarnings * 0.3).toFixed(2)}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">This Month</h3>
                  <p className="text-xs text-gray-600 mt-1">Estimated earnings</p>
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Payment History
                </h3>
                <div className="space-y-3">
                  {filteredTrips
                    .filter(t => t.status === 'completed')
                    .slice(0, 10)
                    .map(trip => (
                      <div key={trip.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{trip.customerName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(trip.scheduledTime).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +${(trip.driverPayout || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{trip.distance} mi</p>
                        </div>
                      </div>
                    ))}
                </div>

                <button className="w-full mt-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Payment Statement</span>
                </button>
              </div>

              {/* Rate Configuration - New Dynamic Component */}
              <DriverRateTiers driverId={driver.id} onClose={() => {}} />
            </div>
          )}

          {/* ADMIN ACTIONS TAB */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Administrative Actions</h3>
                    <p className="text-sm text-amber-700">
                      These actions will affect the driver's account and access to the system.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Status Management
                </h3>
                <div className="space-y-3">
                  {driver.isActive ? (
                    <button
                      onClick={() => onSuspendDriver?.(driver.id)}
                      className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Ban className="w-5 h-5" />
                      <span>Suspend Driver</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivateDriver?.(driver.id)}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckSquare className="w-5 h-5" />
                      <span>Reactivate Driver</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vehicle Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Assignment
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Vehicle
                  </label>
                  <select
                    value={driver.vehicleId || ''}
                    onChange={(e) => onAssignVehicle?.(driver.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No vehicle assigned</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} - {vehicle.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Send Message */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Communication
                </h3>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Bell className="w-5 h-5" />
                  <span>Send Message or Alert</span>
                </button>
              </div>

              {/* Delete Driver */}
              <div className="bg-white border border-red-200 rounded-lg p-6">
                <h3 className="font-bold text-red-600 mb-4 text-lg flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete this driver and all associated data. This action cannot be undone.
                </p>
                <button className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                  Delete Driver Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Send Message</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type your message to the driver..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
