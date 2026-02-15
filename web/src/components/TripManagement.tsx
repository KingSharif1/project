import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, UserPlus, MapPin, Navigation, Calendar, Phone, DollarSign, FileText, Check, X, ChevronDown, Search, User, Clock, Car, Key, ArrowUpDown, ArrowUp, ArrowDown, Copy, Settings, Eye, EyeOff, Play, MessageSquare, Upload, Download, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as api from '../services/api';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { AddressAutocomplete } from './AddressAutocomplete';
import { TripPlaybackViewer } from './TripPlaybackViewer';
import { CollapsibleSection } from './CollapsibleSection';
import { PatientHistory } from './PatientHistory';
import { DispatchSuggestions } from './DispatchSuggestions';
import { ManualCompletionModal } from './ManualCompletionModal';
import { TripHistory } from './TripHistory';
import { RiderAutocomplete } from './RiderAutocomplete';
import Toast, { ToastType } from './Toast';
import { Trip, Contractor } from '../types';
import { detectTripConflicts } from '../utils/conflictDetection';
import { generateInvoicePDF, generateInvoiceNumber, isTripBillable, getBillingReason } from '../utils/invoiceUtils';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { calculateDistance } from '../utils/distanceCalculator';
import * as XLSX from 'xlsx';
import { generateTripNumber, getBaseTripNumber } from '../utils/tripNumberGenerator';
import { isSameDay, isToday, isTomorrow, isYesterday, getStartOfDay, getEndOfDay } from '../utils/timezoneUtils';
import { calculateTripRates } from '../utils/rateCalculator';
import { formatDateUS, formatDateTimeUS, formatTimeUS } from '../utils/dateFormatter';
import { sendAppointmentReminder } from '../utils/tripEnhancements';

interface ColumnConfig {
  id: string;
  label: string;
  description: string;
  required?: boolean;
  adminOnly?: boolean;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { id: 'checkbox', label: 'Select', description: 'Select trips for bulk actions', required: true },
  { id: 'tripNumber', label: 'Trip Number', description: 'Unique trip identifier', required: true },
  { id: 'clinicNote', label: 'Clinic Code', description: 'Clinic code (4-digit)', adminOnly: true },
  { id: 'status', label: 'Status', description: 'Current trip status' },
  { id: 'confirmation', label: 'Passenger Confirmation', description: 'SMS confirmation status from passenger' },
  { id: 'customerName', label: 'Passenger Name', description: 'Patient/passenger name' },
  { id: 'serviceLevel', label: 'Service Level', description: 'Ambulatory/Wheelchair/Stretcher' },
  { id: 'classification', label: 'Classification', description: 'Trip classification (Child & Family, RAPP, BH)' },
  { id: 'driverId', label: 'Driver Name', description: 'Assigned driver' },
  { id: 'scheduledTime', label: 'Scheduled Pickup', description: 'Scheduled pickup time' },
  { id: 'appointmentTime', label: 'Appt Time', description: 'Appointment time' },
  { id: 'actualPickupTime', label: 'Actual PU', description: 'Actual pickup time' },
  { id: 'actualDropoffTime', label: 'Actual DO', description: 'Actual dropoff time' },
  { id: 'passengerSignature', label: 'Pickup Signature', description: 'Passenger signature at pickup from mobile app' },
  { id: 'pickupLocation', label: 'Pickup Address', description: 'Pickup location' },
  { id: 'dropoffLocation', label: 'Dropoff Address', description: 'Dropoff location' },
  { id: 'distance', label: 'Mileage', description: 'Trip distance in miles' },
  { id: 'fare', label: 'Contractor', description: 'Contractor assigned to this trip' },
  { id: 'driverPayout', label: 'Driver Rate', description: 'Driver payout amount' },
  { id: 'clinic', label: 'Transport Company', description: 'Transportion Provider', adminOnly: true },
  { id: 'contractor', label: 'Contractor / Account', description: 'The Contractor or Account being billed', adminOnly: true },
  { id: 'actions', label: 'Actions', description: 'Trip actions menu', required: true },
];

const COLUMN_PRESETS = {
  compact: {
    name: 'Compact View',
    columns: ['checkbox', 'tripNumber', 'status', 'confirmation', 'customerName', 'driverId', 'scheduledTime', 'fare', 'actions']
  },
  detailed: {
    name: 'Detailed View',
    columns: ['checkbox', 'tripNumber', 'status', 'confirmation', 'customerName', 'serviceLevel', 'driverId', 'scheduledTime', 'appointmentTime', 'actualPickupTime', 'actualDropoffTime', 'passengerSignature', 'pickupLocation', 'dropoffLocation', 'distance', 'fare', 'driverPayout', 'actions']
  },
  dispatch: {
    name: 'Dispatch View',
    columns: ['checkbox', 'tripNumber', 'status', 'confirmation', 'customerName', 'serviceLevel', 'driverId', 'scheduledTime', 'pickupLocation', 'dropoffLocation', 'distance', 'actions']
  },
  billing: {
    name: 'Billing View',
    columns: ['checkbox', 'tripNumber', 'status', 'customerName', 'scheduledTime', 'distance', 'fare', 'driverPayout', 'actions']
  }
};

export const TripManagement: React.FC = () => {
  const { trips, drivers, addTrip, updateTrip, deleteTrip, assignDriver, reinstateTrip, clinics, contractors, tripSources, refreshData } = useApp();
  const { user, isAdmin, canAssignDrivers, isContractorDispatcher } = useAuth();

  const userClinic = clinics.find(c => c.id === user?.clinicId);
  const isMHMRUser = isAdmin || user?.clinicId === 'mhmr' || userClinic?.name?.toLowerCase().includes('mhmr');

  //console.log('TripManagement - Drivers loaded:', drivers.length, drivers);
  //console.log('TripManagement - Clinics loaded:', clinics.length, clinics);
  //console.log('TripManagement - User clinic:', user?.clinicId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());

  // Safety check: ensure selectedTrips is always a Set
  const safeSelectedTrips = selectedTrips instanceof Set ? selectedTrips : new Set();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('today');
  const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [filterTripNumber, setFilterTripNumber] = useState<string>('');
  const [filterRiderName, setFilterRiderName] = useState<string>('');
  const [filterDriver, setFilterDriver] = useState<string>('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterClinic, setFilterClinic] = useState<string>('all');
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [mileageBreakdown, setMileageBreakdown] = useState<{ leg1?: number; leg2?: number } | null>(null);
  const [rateBreakdown, setRateBreakdown] = useState<{ contractor: string; driver: string } | null>(null);
  const [isCalculatingMileage, setIsCalculatingMileage] = useState(false);
  const [cancellationNote, setCancellationNote] = useState('');
  const [noShowNote, setNoShowNote] = useState('');
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [phoneSearchResult, setPhoneSearchResult] = useState<string>('');
  const [editingTimeField, setEditingTimeField] = useState<{ tripId: string; field: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [playbackTrip, setPlaybackTrip] = useState<Trip | null>(null);
  const [showPlaybackViewer, setShowPlaybackViewer] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState<string>('');
  const [patientHistoryModal, setPatientHistoryModal] = useState<{
    isOpen: boolean;
    patientName: string;
    patientPhone?: string;
  }>({ isOpen: false, patientName: '' });
  const [showDispatchSuggestions, setShowDispatchSuggestions] = useState(false);
  const [manualCompletionModal, setManualCompletionModal] = useState<{
    isOpen: boolean;
    tripId: string;
    tripNumber: string;
    isBulk?: boolean;
  }>({ isOpen: false, tripId: '', tripNumber: '', isBulk: false });
  const [bulkCompletionData, setBulkCompletionData] = useState<{
    actualPickupAt: string;
    actualDropoffAt: string;
  }>({ actualPickupAt: '', actualDropoffAt: '' });
  const [tripSignatures, setTripSignatures] = useState<Map<string, {
    pickup?: { signature_data: string; signed_at: string; signer_name: string };
    dropoff?: { signature_data: string; signed_at: string; signer_name: string };
  }>>(new Map());

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          //console.log('Trip updated in realtime:', payload);
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          //console.log('New trip created in realtime:', payload);
          refreshData();
          showToast(`New trip ${payload.new.trip_number} created`, 'success');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'checkbox',
    'tripNumber',
    'status',
    'customerName',
    'serviceLevel',
    'driverId',
    'scheduledTime',
    'appointmentTime',
    'actualPickupTime',
    'actualDropoffTime',
    'pickupLocation',
    'dropoffLocation',
    'distance',
    'fare',
    'driverPayout',
    'actions'
  ]));

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    scheduledDate: '',
    scheduledPickupTime: '',
    appointmentTime: '',
    actualPickupTime: '',
    actualDropoffTime: '',
    distance: '',
    notes: '',
    clinicNote: '',
    tripType: 'clinic' as Trip['tripType'],
    journeyType: 'one-way' as Trip['journeyType'],
    serviceLevel: 'ambulatory' as Trip['serviceLevel'],
    returnTime: '',
    returnPickupLocation: '',
    returnDropoffLocation: '',
    willCall: false,
    contractorId: '',
    classification: '',
    driverId: '',
    driverPayout: '',
    levelOfAssistance: '',
    patientId: '', // Track selected/created patient ID
  });

  // Rider/Patient Management State
  const [riderMode, setRiderMode] = useState<'search' | 'new'>('search');
  const [patientForm, setPatientForm] = useState({
    company: '', // Helper for clinicId
    dateOfBirth: '',
    accountNumber: '',
    defaultLevelOfService: '', // Map to serviceLevel
  });

  // Reset patient form when mode changes
  useEffect(() => {
    if (riderMode === 'new') {
      setFormData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        customerPhone: '',
        customerEmail: '',
        pickupLocation: '',
        patientId: '',
      }));
      setPatientForm(prev => ({ ...prev, company: user?.clinicId || '' }));
    }
  }, [riderMode, user?.clinicId]);

  const [additionalStops, setAdditionalStops] = useState<Array<{ pickupLocation: string; dropoffLocation: string }>>([]);

  // Auto-fill return trip addresses when pickup/dropoff changes
  useEffect(() => {
    if (formData.journeyType === 'roundtrip' && !editingTrip) {
      // Only update if the values are actually different to avoid infinite loops
      if (formData.returnPickupLocation !== formData.dropoffLocation ||
        formData.returnDropoffLocation !== formData.pickupLocation) {
        setFormData(prev => ({
          ...prev,
          returnPickupLocation: prev.dropoffLocation,
          returnDropoffLocation: prev.pickupLocation,
        }));
      }
    }
  }, [formData.pickupLocation, formData.dropoffLocation, formData.journeyType, formData.returnPickupLocation, formData.returnDropoffLocation, editingTrip]);

  // Clear return time when Will Call is checked
  useEffect(() => {
    if (formData.willCall) {
      setFormData(prev => ({
        ...prev,
        returnTime: '',
      }));
    }
  }, [formData.willCall]);

  // Auto-calculate mileage when addresses change
  // Only trigger when addresses look like full addresses (contain a comma — from autocomplete selection)
  useEffect(() => {
    const isFullAddress = (addr: string) => addr && addr.includes(',') && addr.length > 10;

    const calculateMileageAuto = async () => {
      if (isFullAddress(formData.pickupLocation) && isFullAddress(formData.dropoffLocation) && !editingTrip) {
        try {
          setIsCalculatingMileage(true);
          const result = await calculateDistance(
            formData.pickupLocation,
            formData.dropoffLocation
          );

          if (result.success) {
            let totalDistance = result.distanceMiles;
            const breakdown: { leg1?: number; leg2?: number } = { leg1: result.distanceMiles };

            if (formData.journeyType === 'roundtrip') {
              const returnPickup = formData.returnPickupLocation || formData.dropoffLocation;
              const returnDropoff = formData.returnDropoffLocation || formData.pickupLocation;

              if (isFullAddress(returnPickup) && isFullAddress(returnDropoff)) {
                const leg2Result = await calculateDistance(returnPickup, returnDropoff);
                if (leg2Result.success) {
                  totalDistance += leg2Result.distanceMiles;
                  breakdown.leg2 = leg2Result.distanceMiles;
                }
              }
            }

            setFormData(prev => ({
              ...prev,
              distance: totalDistance.toFixed(2),
            }));
            setMileageBreakdown(breakdown);
          } else {
            console.warn('Distance calculation failed:', result.error);
          }
        } catch (error) {
          console.error('Error calculating mileage:', error);
        } finally {
          setIsCalculatingMileage(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      calculateMileageAuto();
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [formData.pickupLocation, formData.dropoffLocation, formData.returnPickupLocation, formData.returnDropoffLocation, formData.journeyType, editingTrip]);

  // Auto-recalculate rates when service level, driver, or clinic changes
  useEffect(() => {
    const recalculateRates = async () => {
      const distance = parseFloat(formData.distance);
      if (distance > 0 && formData.serviceLevel) {
        try {
          const driver = drivers.find(d => d.id === formData.driverId);
          const contractorId = formData.contractorId || user?.clinicId;
          const clinic = clinics.find(c => c.id === contractorId);

          //console.log('Recalculating rates - Clinic:', clinic?.name, 'Service Level:', formData.serviceLevel);

          const rates = await calculateTripRates(
            {
              serviceLevel: formData.serviceLevel as any,
              distanceMiles: distance,
              driverId: formData.driverId,
              status: 'pending'
            },
            driver,
            clinic
          );

          //console.log('Calculated rates:', rates);

          setFormData(prev => ({
            ...prev,
            driverPayout: rates.driverPayout.toString()
          }));

          setRateBreakdown({
            contractor: rates.contractorBreakdown,
            driver: rates.driverBreakdown
          });
        } catch (error) {
          console.error('Error recalculating rates:', error);
        }
      }
    };

    // Recalculate for both new and existing trips to ensure rates match clinic configuration
    recalculateRates();
  }, [formData.serviceLevel, formData.driverId, formData.contractorId, formData.distance]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      pickupLocation: '',
      dropoffLocation: '',
      scheduledTime: '',
      scheduledDate: '',
      scheduledPickupTime: '',
      appointmentTime: '',
      actualPickupTime: '',
      actualDropoffTime: '',
      distance: '',
      notes: '',
      clinicNote: '',
      tripType: 'clinic',
      journeyType: 'one-way',
      serviceLevel: 'ambulatory',
      returnTime: '',
      returnPickupLocation: '',
      returnDropoffLocation: '',
      willCall: false,
      contractorId: '',
      classification: '',
      driverId: '',
      driverPayout: '',
      levelOfAssistance: '',
      patientId: '',
    });
    setAdditionalStops([]);
    setEditingTrip(null);
    setRecurringDays([]);
    setRecurringEndDate('');
  };

  const toggleColumn = (columnId: string) => {
    const column = AVAILABLE_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return;

    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      localStorage.setItem('tripTableColumns', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const applyColumnPreset = (presetKey: keyof typeof COLUMN_PRESETS) => {
    const preset = COLUMN_PRESETS[presetKey];
    const newColumns = new Set(preset.columns);
    setVisibleColumns(newColumns);
    localStorage.setItem('tripTableColumns', JSON.stringify(preset.columns));
    setShowColumnSettings(false);
  };

  const isColumnVisible = (columnId: string) => visibleColumns.has(columnId);

  useEffect(() => {
    const saved = localStorage.getItem('tripTableColumns');
    if (saved) {
      try {
        const columns = JSON.parse(saved);
        setVisibleColumns(new Set(columns));
      } catch (e) {
        console.error('Error loading column preferences:', e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSignatures = async () => {
      if (!trips || trips.length === 0) return;

      try {
        const tripIds = trips.map(t => t.id);
        const result = await api.getTripSignatures(tripIds);
        const data = result.data || [];

        const signaturesMap = new Map();
        data.forEach((sig: any) => {
          if (!signaturesMap.has(sig.trip_id)) {
            signaturesMap.set(sig.trip_id, {});
          }
          const tripSigs = signaturesMap.get(sig.trip_id);
          if (sig.signature_type === 'pickup' && !tripSigs.pickup) {
            tripSigs.pickup = {
              signature_data: sig.signature_data,
              signed_at: sig.signed_at,
              signer_name: sig.signer_name
            };
          } else if (sig.signature_type === 'dropoff' && !tripSigs.dropoff) {
            tripSigs.dropoff = {
              signature_data: sig.signature_data,
              signed_at: sig.signed_at,
              signer_name: sig.signer_name
            };
          }
        });

        setTripSignatures(signaturesMap);
      } catch (error) {
        console.error('Error fetching signatures:', error);
      }
    };

    fetchSignatures();
  }, [trips]);

  const handleOpenModal = (trip?: Trip) => {
    if (trip) {
      setEditingTrip(trip);
      const scheduledDateTime = new Date(trip.scheduledTime);
      const scheduledDateStr = scheduledDateTime.toISOString().slice(0, 10);
      const scheduledTimeStr = scheduledDateTime.toTimeString().slice(0, 5);

      setFormData({
        firstName: trip.firstName || '',
        lastName: trip.lastName || '',
        customerName: trip.customerName,
        customerPhone: trip.customerPhone,
        customerEmail: trip.customerEmail || '',
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        scheduledTime: new Date(trip.scheduledTime).toISOString().slice(0, 16),
        scheduledDate: scheduledDateStr,
        scheduledPickupTime: scheduledTimeStr,
        appointmentTime: trip.appointmentTime ? new Date(trip.appointmentTime).toISOString().slice(0, 16) : '',
        actualPickupTime: trip.actualPickupTime ? new Date(trip.actualPickupTime).toISOString().slice(0, 16) : '',
        actualDropoffTime: trip.actualDropoffTime ? new Date(trip.actualDropoffTime).toISOString().slice(0, 16) : '',
        distance: trip.distance.toString(),
        notes: trip.notes || '',
        clinicNote: trip.clinicNote || '',
        tripType: trip.tripType,
        journeyType: trip.journeyType || 'one-way',
        serviceLevel: trip.serviceLevel || 'ambulatory',
        returnTime: trip.returnTime || '',
        returnPickupLocation: trip.returnPickupLocation || '',
        returnDropoffLocation: trip.returnDropoffLocation || '',
        willCall: trip.willCall || false,
        contractorId: trip.clinicId || '',
        classification: trip.classification || '',
        driverId: trip.driverId || '',
        driverPayout: trip.driverPayout?.toString() || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMileageBreakdown(null);
    setRateBreakdown(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Check for conflicts before submitting
      const newTripData = {
        scheduledTime: formData.scheduledTime,
        driverId: formData.driverId || null,
      } as Partial<Trip>;

      const conflicts = detectTripConflicts(trips, newTripData);
      if (conflicts.length > 0 && !confirm(
        `Warning: ${conflicts.length} scheduling conflict(s) detected.\n\n` +
        conflicts.map(c => c.message).join('\n') +
        '\n\nDo you want to continue?'
      )) {
        return;
      }

      const isPrivate = formData.tripType === 'private';
      const invoiceNumber = isPrivate && !editingTrip ? generateInvoiceNumber() : editingTrip?.invoiceNumber;
      const isRoundtrip = formData.journeyType === 'roundtrip';
      const isMultiStop = formData.journeyType === 'multi-stop';
      const isRecurring = formData.journeyType === 'recurring';

      //console.log('=== TRIP SUBMIT DEBUG ===');
      //console.log('Journey Type:', formData.journeyType);
      //console.log('isRoundtrip:', isRoundtrip);
      //console.log('editingTrip:', editingTrip?.id);
      //console.log('formData:', formData);

      // Get existing trip numbers to avoid duplicates
      const existingTripNumbers = trips.map(t => t.tripNumber);

      // Generate base trip number using improved generator
      const baseTripNumber = editingTrip?.tripNumber
        ? getBaseTripNumber(editingTrip.tripNumber)
        : getBaseTripNumber(generateTripNumber(false, undefined, existingTripNumbers));

      // Rider Creation Logic
      let finalPatientId = formData.patientId;

      if (riderMode === 'new') {
        try {
          // Create new patient record
          const patientResult = await api.createPatient({
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.customerPhone,
              dateOfBirth: patientForm.dateOfBirth || null,
              accountNumber: patientForm.accountNumber || null,
              serviceLevel: patientForm.defaultLevelOfService || 'ambulatory',
              notes: formData.notes || null,
              clinicId: patientForm.company || (isAdmin ? null : user?.clinicId),
            });

          if (!patientResult.success || !patientResult.data) {
            console.error('Error creating new patient');
            if (!confirm('Failed to save new rider profile. Continue creating trip anyway?')) {
              return;
            }
          } else {
            finalPatientId = patientResult.data.id;
            showToast('New rider profile created', 'success');
          }
        } catch (err) {
          console.error('Exception creating patient:', err);
        }
      }

      const baseTripData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        customerName: `${formData.firstName} ${formData.lastName}`.trim() || formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        patientId: finalPatientId || undefined, // Link to patient

        fare: 0, // Default to 0 as field is removed
        distance: parseFloat(formData.distance) || 0,
        notes: formData.notes,
        clinicNote: formData.clinicNote,
        classification: formData.classification,
        status: 'pending' as const,
        tripType: formData.tripType,
        journeyType: formData.journeyType,
        serviceLevel: formData.serviceLevel,
        clinicId: user?.clinicId || editingTrip?.clinicId || '',
        contractorId: formData.contractorId || editingTrip?.contractorId || '',
        createdBy: user?.id,
        driverId: formData.driverId || undefined,
        paymentStatus: 'unpaid' as const, // Default to unpaid
        paymentMethod: 'invoice' as const, // Default to invoice
        invoiceNumber: isPrivate ? invoiceNumber : undefined,
        invoiceDate: isPrivate ? new Date().toISOString() : undefined,
        billingAddress: undefined, // Field removed
        levelOfAssistance: formData.levelOfAssistance,
        tripSourceId: undefined, // Field removed
      };

      if (editingTrip) {
        // Check if user is converting a one-way trip to roundtrip
        const wasOneWay = editingTrip.journeyType === 'one-way';
        const isNowRoundtrip = isRoundtrip;

        // Update the existing trip
        const outboundTripNumber = isNowRoundtrip && wasOneWay ? `${baseTripNumber}A` : baseTripNumber;

        updateTrip(editingTrip.id, {
          ...baseTripData,
          tripNumber: outboundTripNumber,
          pickupLocation: formData.pickupLocation,
          dropoffLocation: formData.dropoffLocation,
          scheduledTime: (editingTrip.isReturnTrip && formData.willCall) ? '2000-01-01T00:00:00.000Z' : new Date(formData.scheduledTime).toISOString(),
          appointmentTime: formData.appointmentTime ? new Date(formData.appointmentTime).toISOString() : undefined,
          actualPickupTime: formData.actualPickupTime ? new Date(formData.actualPickupTime).toISOString() : undefined,
          actualDropoffTime: formData.actualDropoffTime ? new Date(formData.actualDropoffTime).toISOString() : undefined,
          willCall: editingTrip.isReturnTrip ? formData.willCall : false,
          driverPayout: parseFloat(formData.driverPayout) || 0,
          distance: mileageBreakdown?.leg1 || parseFloat(formData.distance) || 0,
          leg1Miles: isNowRoundtrip ? (mileageBreakdown?.leg1 || 0) : 0,
          leg2Miles: 0,
        });

        // If converting from one-way to roundtrip, create the return trip
        if (wasOneWay && isNowRoundtrip) {
          const returnTripNumber = `${baseTripNumber}B`;

          // For Will Call, use the same date as outbound but with 00:00:00 time
          const returnScheduledTime = formData.willCall
            ? (() => {
              const outboundDate = new Date(formData.scheduledTime);
              const willCallDate = new Date(outboundDate.getFullYear(), outboundDate.getMonth(), outboundDate.getDate(), 0, 0, 0);
              return willCallDate.toISOString();
            })()
            : (formData.returnTime
              ? new Date(formData.returnTime).toISOString()
              : new Date(new Date(formData.scheduledTime).getTime() + 2 * 60 * 60 * 1000).toISOString());

          const returnTrip = {
            ...baseTripData,
            tripNumber: returnTripNumber,
            pickupLocation: formData.returnPickupLocation || formData.dropoffLocation,
            dropoffLocation: formData.returnDropoffLocation || formData.pickupLocation,
            scheduledTime: returnScheduledTime,
            willCall: formData.willCall,
            driverPayout: parseFloat(formData.driverPayout) || 0,
            appointmentTime: undefined,
            actualPickupTime: undefined,
            actualDropoffTime: undefined,
            notes: `${formData.notes ? formData.notes + ' | ' : ''}Return leg of roundtrip${formData.willCall ? ' | Will Call' : ''}`,
            isReturnTrip: true,
            distance: mileageBreakdown?.leg2 || parseFloat(formData.distance) || 0,
            leg1Miles: 0,
            leg2Miles: mileageBreakdown?.leg2 || 0,
          };

          //console.log('Creating return trip for converted roundtrip:', returnTrip);
          await addTrip(returnTrip);
          await refreshData();
          showToast(`Trip converted to roundtrip! Outbound: ${outboundTripNumber}, Return: ${returnTripNumber}`, 'success');
        }
      } else {
        if (isRoundtrip) {
          const outboundTripNumber = `${baseTripNumber}A`;
          const returnTripNumber = `${baseTripNumber}B`;

          const outboundTrip = {
            ...baseTripData,
            tripNumber: outboundTripNumber,
            pickupLocation: formData.pickupLocation,
            dropoffLocation: formData.dropoffLocation,
            scheduledTime: new Date(formData.scheduledTime).toISOString(),
            willCall: false,
            driverPayout: parseFloat(formData.driverPayout) || 0,
            appointmentTime: formData.appointmentTime ? new Date(formData.appointmentTime).toISOString() : undefined,
            notes: `${formData.notes ? formData.notes + ' | ' : ''}Outbound leg of roundtrip`,
            distance: mileageBreakdown?.leg1 || parseFloat(formData.distance) || 0,
            leg1Miles: mileageBreakdown?.leg1 || 0,
            leg2Miles: 0,
          };

          //console.log('Creating outbound trip:', outboundTrip);
          const outboundResult = await addTrip(outboundTrip);
          //console.log('Outbound trip created:', outboundResult);

          // Always create return trip for roundtrip, even if Will Call
          // For Will Call returns, use the same date as outbound trip but with 00:00:00 time
          const returnScheduledTime = formData.willCall
            ? (() => {
              const outboundDate = new Date(formData.scheduledTime);
              const willCallDate = new Date(outboundDate.getFullYear(), outboundDate.getMonth(), outboundDate.getDate(), 0, 0, 0);
              return willCallDate.toISOString();
            })()
            : (formData.returnTime
              ? new Date(formData.returnTime).toISOString()
              : new Date(new Date(formData.scheduledTime).getTime() + 2 * 60 * 60 * 1000).toISOString());

          const returnTrip = {
            ...baseTripData,
            tripNumber: returnTripNumber,
            pickupLocation: formData.returnPickupLocation || formData.dropoffLocation,
            dropoffLocation: formData.returnDropoffLocation || formData.pickupLocation,
            scheduledTime: returnScheduledTime,
            willCall: formData.willCall,
            driverPayout: parseFloat(formData.driverPayout) || 0,
            appointmentTime: undefined,
            actualPickupTime: undefined,
            actualDropoffTime: undefined,
            notes: `${formData.notes ? formData.notes + ' | ' : ''}Return leg of roundtrip${formData.willCall ? ' | Will Call' : ''}`,
            isReturnTrip: true,
            distance: mileageBreakdown?.leg2 || parseFloat(formData.distance) || 0,
            leg1Miles: 0,
            leg2Miles: mileageBreakdown?.leg2 || 0,
          };

          //console.log('Creating return trip:', returnTrip);
          const returnResult = await addTrip(returnTrip);
          //console.log('Return trip created:', returnResult);

          // Refresh data to show both trips
          await refreshData();

          // Show success message for roundtrip
          showToast(`Roundtrip created successfully! Outbound: ${outboundTripNumber}, Return: ${returnTripNumber}`, 'success');
        } else if (isMultiStop && additionalStops.length > 0) {
          // Build stops JSONB array for multi-stop trip - each stop has its own pickup and dropoff
          const stopsArray = [
            {
              stopNumber: 1,
              pickupAddress: formData.pickupLocation,
              dropoffAddress: formData.dropoffLocation,
              scheduledTime: new Date(formData.scheduledTime).toISOString(),
            },
            ...additionalStops.map((stop, index) => ({
              stopNumber: index + 2,
              pickupAddress: stop.pickupLocation,
              dropoffAddress: stop.dropoffLocation,
              scheduledTime: new Date(formData.scheduledTime).toISOString(),
            }))
          ];

          const multiStopTrip = {
            ...baseTripData,
            tripNumber: baseTripNumber,
            pickupLocation: formData.pickupLocation,
            dropoffLocation: formData.dropoffLocation,
            scheduledTime: new Date(formData.scheduledTime).toISOString(),
            appointmentTime: formData.appointmentTime ? new Date(formData.appointmentTime).toISOString() : undefined,
            notes: `${formData.notes ? formData.notes + ' | ' : ''}Multi-stop trip with ${additionalStops.length + 1} stops`,
            stops: stopsArray, // JSONB array of stops
          };
          await addTrip(multiStopTrip);
        } else if (isRecurring && recurringDays.length > 0 && recurringEndDate) {
          // Generate recurring trips
          const startDate = new Date(formData.scheduledDate || formData.scheduledTime);
          const endDate = new Date(recurringEndDate);
          const dayMap: { [key: string]: number } = {
            'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0
          };

          const selectedDayNumbers = recurringDays.map(day => dayMap[day]).filter(d => d !== undefined);
          const scheduledTimeOnly = formData.scheduledTime.includes('T')
            ? formData.scheduledTime.split('T')[1]
            : formData.scheduledTime;

          let tripCounter = 1;
          let currentDate = new Date(startDate);
          currentDate.setHours(0, 0, 0, 0);

          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();

            if (selectedDayNumbers.includes(dayOfWeek)) {
              const tripDate = new Date(currentDate);
              const [hours, minutes] = scheduledTimeOnly.split(':');
              tripDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

              const recurringTrip = {
                ...baseTripData,
                tripNumber: `${baseTripNumber}-R${tripCounter}`,
                pickupLocation: formData.pickupLocation,
                dropoffLocation: formData.dropoffLocation,
                scheduledTime: tripDate.toISOString(),
                willCall: false,
                driverPayout: parseFloat(formData.driverPayout) || 0,
                appointmentTime: formData.appointmentTime ? new Date(formData.appointmentTime).toISOString() : undefined,
                actualPickupTime: formData.actualPickupTime ? new Date(formData.actualPickupTime).toISOString() : undefined,
                actualDropoffTime: formData.actualDropoffTime ? new Date(formData.actualDropoffTime).toISOString() : undefined,
                notes: `${formData.notes ? formData.notes + ' | ' : ''}Recurring trip ${tripCounter}`,
              };

              await addTrip(recurringTrip);
              tripCounter++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          const singleTrip = {
            ...baseTripData,
            tripNumber: `${baseTripNumber}A`,
            pickupLocation: formData.pickupLocation,
            dropoffLocation: formData.dropoffLocation,
            scheduledTime: new Date(formData.scheduledTime).toISOString(),
            willCall: false,
            driverPayout: parseFloat(formData.driverPayout) || 0,
            appointmentTime: formData.appointmentTime ? new Date(formData.appointmentTime).toISOString() : undefined,
            actualPickupTime: formData.actualPickupTime ? new Date(formData.actualPickupTime).toISOString() : undefined,
            actualDropoffTime: formData.actualDropoffTime ? new Date(formData.actualDropoffTime).toISOString() : undefined,
          };
          await addTrip(singleTrip);
        }
      }

      // Success - close modal (no alert needed)
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting trip:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save trip. Please try again.', 'error');
    }
  };

  const handleMarkPaid = (trip: Trip) => {
    updateTrip(trip.id, {
      paymentStatus: 'paid',
      paidAmount: trip.fare,
      paidDate: new Date().toISOString(),
    });
  };

  const handleMarkUnpaid = (trip: Trip) => {
    updateTrip(trip.id, {
      paymentStatus: 'unpaid',
      paidAmount: 0,
      paidDate: undefined,
    });
  };

  const handleGenerateInvoice = (trip: Trip) => {
    const clinic = clinics.find(c => c.id === trip.clinicId);
    generateInvoicePDF(trip, clinic?.name || 'TransportHub');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      deleteTrip(id);
    }
  };

  const handleSelectTrip = (tripId: string) => {
    const newSelected = new Set(safeSelectedTrips);
    if (newSelected.has(tripId)) {
      newSelected.delete(tripId);
    } else {
      newSelected.add(tripId);
    }
    setSelectedTrips(newSelected);
  };

  const handleSelectAll = () => {
    if (safeSelectedTrips.size === filteredTrips.length) {
      setSelectedTrips(new Set());
    } else {
      setSelectedTrips(new Set(filteredTrips.map(t => t.id)));
    }
  };

  const handleBulkStatusUpdate = (status: Trip['status']) => {
    if (safeSelectedTrips.size === 0) return;

    // For completed status, open the manual completion modal
    if (status === 'completed') {
      // Check if any selected trips are will-call without actual pickup time
      const selectedTripsArray = Array.from(safeSelectedTrips).map(id => trips.find(t => t.id === id)).filter(Boolean);
      const willCallTripsWithoutPickup = selectedTripsArray.filter(t => t!.willCall && !t!.actualPickupTime);

      if (willCallTripsWithoutPickup.length > 0) {
        const tripNumbers = willCallTripsWithoutPickup.map(t => t!.tripNumber).join(', ');
        showToast(`Please update Will Call status and set actual pickup time for: ${tripNumbers}`, 'error');
        return;
      }

      const firstTripId = Array.from(safeSelectedTrips)[0];
      const firstTrip = trips.find(t => t.id === firstTripId);
      setManualCompletionModal({
        isOpen: true,
        tripId: firstTripId,
        tripNumber: firstTrip?.tripNumber || 'Multiple',
        isBulk: true
      });
      return;
    }

    // For cancelled status, open the cancel modal
    if (status === 'cancelled') {
      const firstTripId = Array.from(safeSelectedTrips)[0];
      setSelectedTripId(firstTripId);
      setIsCancelModalOpen(true);
      return;
    }

    // For no-show status, open the no-show modal
    if (status === 'no-show') {
      const firstTripId = Array.from(safeSelectedTrips)[0];
      setSelectedTripId(firstTripId);
      setIsNoShowModalOpen(true);
      return;
    }

    // For other statuses (pending, in-progress), proceed with confirmation
    if (confirm(`Update ${safeSelectedTrips.size} trip(s) to ${status}?`)) {
      safeSelectedTrips.forEach(tripId => {
        const updates: Partial<Trip> = { status };
        updateTrip(tripId, updates);
      });
      setSelectedTrips(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkReinstate = () => {
    if (safeSelectedTrips.size === 0) return;

    const cancelledOrNoShowTrips = Array.from(safeSelectedTrips).filter(tripId => {
      const trip = trips.find(t => t.id === tripId);
      return trip && (trip.status === 'cancelled' || trip.status === 'no-show');
    });

    if (cancelledOrNoShowTrips.length === 0) {
      showToast('No cancelled or no-show trips selected to reinstate.', 'warning');
      return;
    }

    if (confirm(`Reinstate ${cancelledOrNoShowTrips.length} cancelled/no-show trip(s)?`)) {
      cancelledOrNoShowTrips.forEach(tripId => {
        reinstateTrip(tripId);
      });
      setSelectedTrips(new Set());
      setShowBulkActions(false);
    }
  };

  const getDriverDailyStats = (driverId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTrips = trips.filter(trip => {
      const tripDate = new Date(trip.scheduledTime);
      tripDate.setHours(0, 0, 0, 0);
      return trip.driverId === driverId && tripDate.getTime() === today.getTime();
    });

    const completedTrips = todaysTrips.filter(t => t.status === 'completed').length;
    const totalMiles = todaysTrips.reduce((sum, t) => sum + (t.distance || 0), 0);

    let totalHours = 0;
    todaysTrips.forEach(trip => {
      if (trip.actualPickupTime && trip.actualDropoffTime) {
        const pickup = new Date(trip.actualPickupTime);
        const dropoff = new Date(trip.actualDropoffTime);
        const hours = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return {
      tripsCompleted: completedTrips,
      totalTrips: todaysTrips.length,
      miles: Math.round(totalMiles * 10) / 10,
      hours: Math.round(totalHours * 10) / 10
    };
  };

  const handleDuplicateTrip = (trip: Trip) => {
    setEditingTrip(null);
    const scheduledDateTime = new Date(trip.scheduledTime);
    const scheduledDateStr = scheduledDateTime.toISOString().slice(0, 10);
    const scheduledTimeStr = scheduledDateTime.toTimeString().slice(0, 5);

    setFormData({
      firstName: trip.firstName || '',
      lastName: trip.lastName || '',
      customerName: trip.customerName,
      customerPhone: trip.customerPhone,
      customerEmail: trip.customerEmail || '',
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      scheduledTime: '',
      scheduledDate: '',
      scheduledPickupTime: scheduledTimeStr,
      appointmentTime: '',
      actualPickupTime: '',
      actualDropoffTime: '',
      distance: trip.distance.toString(),
      notes: trip.notes || '',
      clinicNote: trip.clinicNote || '',
      tripType: trip.tripType,
      journeyType: trip.journeyType || 'one-way',
      serviceLevel: trip.serviceLevel || 'ambulatory',
      returnTime: '',
      returnPickupLocation: '',
      returnDropoffLocation: '',
      willCall: false,
      contractorId: trip.clinicId || '',
      classification: trip.classification || '',
      driverId: '',
      driverPayout: '',
      levelOfAssistance: '',
      patientId: '',
    });
    setIsModalOpen(true);
  };

  const handleAssignDriver = (driverId: string) => {
    if (selectedTripId) {
      assignDriver(selectedTripId, driverId);
      setIsAssignModalOpen(false);
      setSelectedTripId(null);
    }
  };

  const handleStatusChange = (tripId: string, newStatus: Trip['status']) => {
    updateTrip(tripId, { status: newStatus });
    setOpenActionMenu(null);
  };

  const handleCancelTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setIsCancelModalOpen(true);
    setOpenActionMenu(null);
  };

  const handleConfirmCancel = () => {
    if (selectedTripId) {
      // Check if this is a bulk operation
      if (safeSelectedTrips.size > 0 && safeSelectedTrips.has(selectedTripId)) {
        // Bulk cancel all selected trips with the same note
        safeSelectedTrips.forEach(tripId => {
          updateTrip(tripId, {
            status: 'cancelled',
            cancellationReason: cancellationNote || 'Trip cancelled',
            notes: cancellationNote || 'Trip cancelled',
            cancelledAt: new Date().toISOString()
          });
        });
        setSelectedTrips(new Set());
        setShowBulkActions(false);
        showToast(`${safeSelectedTrips.size} trip(s) cancelled`, 'success');
      } else {
        // Single trip cancel
        updateTrip(selectedTripId, {
          status: 'cancelled',
          cancellationReason: cancellationNote || 'Trip cancelled',
          notes: cancellationNote || 'Trip cancelled',
          cancelledAt: new Date().toISOString()
        });
        showToast('Trip cancelled', 'success');
      }
      setIsCancelModalOpen(false);
      setCancellationNote('');
      setSelectedTripId(null);
    }
  };

  const handleNoShow = (tripId: string) => {
    setSelectedTripId(tripId);
    setIsNoShowModalOpen(true);
    setOpenActionMenu(null);
  };

  const handleConfirmNoShow = () => {
    if (selectedTripId) {
      // Check if this is a bulk operation
      if (safeSelectedTrips.size > 0 && safeSelectedTrips.has(selectedTripId)) {
        // Bulk no-show all selected trips with the same note
        safeSelectedTrips.forEach(tripId => {
          updateTrip(tripId, {
            status: 'no-show',
            cancellationReason: noShowNote || 'Patient no-show',
            notes: noShowNote || 'Patient no-show'
          });
        });
        setSelectedTrips(new Set());
        setShowBulkActions(false);
        showToast(`${safeSelectedTrips.size} trip(s) marked as no-show`, 'success');
      } else {
        // Single trip no-show
        updateTrip(selectedTripId, {
          status: 'no-show',
          cancellationReason: noShowNote || 'Patient no-show',
          notes: noShowNote || 'Patient no-show'
        });
        showToast('Trip marked as no-show', 'success');
      }
      setIsNoShowModalOpen(false);
      setNoShowNote('');
      setSelectedTripId(null);
    }
  };

  const handleCompleteTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    // Check if this is a will-call trip without actual pickup time
    if (trip.willCall && !trip.actualPickupTime) {
      showToast('Please update the Will Call status and set actual pickup time before completing this trip', 'error');
      setOpenActionMenu(null);
      return;
    }

    setManualCompletionModal({
      isOpen: true,
      tripId,
      tripNumber: trip.tripNumber || 'N/A',
    });
    setOpenActionMenu(null);
  };

  const handleManualCompletionConfirm = async (actualPickupAt: string, actualDropoffAt: string) => {
    const tripId = manualCompletionModal.tripId;
    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      console.error('Trip not found:', tripId);
      showToast('Trip not found. Please refresh and try again.', 'error');
      return;
    }

    try {
      //console.log('Manual completion started for trip:', trip.tripNumber);
      //console.log('Pickup time:', actualPickupAt);
      //console.log('Dropoff time:', actualDropoffAt);
      //console.log('Is Will Call:', trip.willCall);

      // Check if this is a bulk operation
      if (manualCompletionModal.isBulk && safeSelectedTrips.size > 0) {
        // Bulk complete all selected trips with the same times
        for (const selectedTripId of Array.from(safeSelectedTrips)) {
          const selectedTrip = trips.find(t => t.id === selectedTripId);
          //console.log('Completing trip:', selectedTrip?.tripNumber);
          await updateTrip(selectedTripId, {
            status: 'completed',
            actualPickupTime: actualPickupAt,
            actualDropoffTime: actualDropoffAt,
            // Clear will-call flag if it's set
            ...(selectedTrip?.willCall && { willCall: false, scheduledTime: actualPickupAt })
          });
        }
        setSelectedTrips(new Set());
        setShowBulkActions(false);
        showToast(`${safeSelectedTrips.size} trip(s) marked as completed`, 'success');
      } else {
        // Single trip completion
        const updateData = {
          status: 'completed' as const,
          actualPickupTime: actualPickupAt,
          actualDropoffTime: actualDropoffAt,
          // Clear will-call flag if it's set
          ...(trip?.willCall && { willCall: false, scheduledTime: actualPickupAt })
        };
        //console.log('Update data:', updateData);
        await updateTrip(tripId, updateData);
        //console.log('Trip updated successfully');
        showToast('Trip marked as completed', 'success');
      }
      setManualCompletionModal({ isOpen: false, tripId: '', tripNumber: '', isBulk: false });
    } catch (error) {
      console.error('Error completing trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error message:', errorMessage);
      showToast(`Failed to complete trip: ${errorMessage}`, 'error');
    }
  };

  const handleReinstateTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const newStatus = prompt(
      'Enter new status for this trip:\n\n' +
      'Options: pending, scheduled, assigned, arrived, on-way, in_progress\n\n' +
      'Leave blank to use "scheduled"',
      'scheduled'
    );

    if (newStatus === null) return;

    const validStatuses = ['pending', 'scheduled', 'assigned', 'arrived', 'on-way', 'in_progress'];
    const statusToUse = validStatuses.includes(newStatus.toLowerCase()) ? newStatus.toLowerCase() : 'scheduled';

    // Reinstate trip to selected status
    updateTrip(tripId, {
      status: statusToUse as Trip['status'],
      // Keep existing driver and times when reinstating
      // Clear timestamps only if explicitly needed
      actualPickupTime: undefined,
      actualDropoffTime: undefined,
      // Clear tracking state
      trackingLinkId: undefined,
      // Regenerate charges based on current rates
      fare: 0, // Will be recalculated
      driverPayout: 0, // Will be recalculated
      // Clear cancellation data
      cancellationReason: undefined,
      cancelledAt: undefined,
    });
    setOpenActionMenu(null);
  };

  const toggleActionMenu = (tripId: string) => {
    setOpenActionMenu(openActionMenu === tripId ? null : tripId);
  };

  const handleSendManualReminder = async (trip: Trip) => {
    try {
      setOpenActionMenu(null);

      // Show loading toast
      setToast({
        type: 'info',
        message: 'Sending SMS reminder...',
      });

      // Send the reminder
      await sendAppointmentReminder(trip, trip.clinicNote);

      // Show success toast
      setToast({
        type: 'success',
        message: 'SMS reminder sent successfully!',
      });
    } catch (error) {
      console.error('Error sending manual reminder:', error);
      setToast({
        type: 'error',
        message: 'Failed to send SMS reminder. Please try again.',
      });
    }
  };

  const handlePhoneSearch = async () => {
    if (!formData.customerPhone || formData.customerPhone.length < 10) {
      setPhoneSearchResult('Please enter a valid phone number (at least 10 digits)');
      setTimeout(() => setPhoneSearchResult(''), 3000);
      return;
    }

    setIsSearchingPhone(true);
    setPhoneSearchResult('');

    try {
      const existingTrip = trips
        .filter(t => t.customerPhone === formData.customerPhone)
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];

      if (existingTrip) {
        setFormData({
          ...formData,
          firstName: existingTrip.firstName || '',
          lastName: existingTrip.lastName || '',
          customerName: existingTrip.customerName,
          customerEmail: existingTrip.customerEmail || '',
          pickupLocation: existingTrip.pickupLocation,
          dropoffLocation: existingTrip.dropoffLocation,
          serviceLevel: existingTrip.serviceLevel,
        });
        setPhoneSearchResult(`Found ${existingTrip.firstName} ${existingTrip.lastName} - Previous booking loaded. You can modify any field.`);
        setTimeout(() => setPhoneSearchResult(''), 5000);
      } else {
        setPhoneSearchResult('No previous bookings found for this phone number. Please enter passenger details manually.');
        setTimeout(() => setPhoneSearchResult(''), 4000);
      }
    } catch (error) {
      console.error('Error searching phone:', error);
      setPhoneSearchResult('Error searching phone number. Please try again.');
      setTimeout(() => setPhoneSearchResult(''), 3000);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const generateTripNumber = (isRoundtrip: boolean, legType: 'A' | 'B' = 'A') => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `FW${randomNum}${isRoundtrip ? legType : ''}`;
  };

  const calculateMileage = async (isAutoCalc = false) => {
    if (!formData.pickupLocation || !formData.dropoffLocation) {
      if (!isAutoCalc) showToast('Please enter both pickup and dropoff addresses first', 'warning');
      return;
    }

    setIsCalculatingMileage(true);
    setMileageBreakdown(null);

    try {
      const leg1Result = await calculateDistance(
        formData.pickupLocation,
        formData.dropoffLocation
      );

      if (!leg1Result.success) {
        throw new Error(leg1Result.error || 'Failed to calculate distance');
      }

      let totalDistance = leg1Result.distanceMiles;
      let breakdown: { leg1?: number; leg2?: number } = {
        leg1: leg1Result.distanceMiles,
      };

      if (formData.journeyType === 'roundtrip') {
        const returnPickup = formData.returnPickupLocation || formData.dropoffLocation;
        const returnDropoff = formData.returnDropoffLocation || formData.pickupLocation;

        const leg2Result = await calculateDistance(returnPickup, returnDropoff);

        if (leg2Result.success) {
          totalDistance += leg2Result.distanceMiles;
          breakdown.leg2 = leg2Result.distanceMiles;
        }
      }

      // Preserve all form data, only update distance
      setFormData(prev => ({
        ...prev,
        distance: totalDistance.toFixed(1)
      }));
      setMileageBreakdown(breakdown);

      //console.log('Distance calculated:', {
      //  leg1: leg1Result,
      //  totalDistance,
      //  breakdown
      //});
    } catch (error) {
      console.error('Error calculating distance:', error);
      if (!isAutoCalc) {
        showToast(
          error instanceof Error
            ? error.message
            : 'Failed to calculate distance. Please check addresses and try again.',
          'error'
        );
      }
    } finally {
      setIsCalculatingMileage(false);
    }
  };

  useEffect(() => {
    if (formData.journeyType === 'roundtrip' && formData.pickupLocation && formData.dropoffLocation) {
      setFormData(prev => ({
        ...prev,
        returnPickupLocation: prev.dropoffLocation,
        returnDropoffLocation: prev.pickupLocation,
      }));
    }
  }, [formData.journeyType, formData.pickupLocation, formData.dropoffLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenu) {
        setOpenActionMenu(null);
      }
    };

    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openActionMenu]);

  const openAssignModal = (tripId: string) => {
    setSelectedTripId(tripId);
    setIsAssignModalOpen(true);
  };

  const handleBulkAssignDriver = (driverId: string) => {
    safeSelectedTrips.forEach(tripId => {
      assignDriver(tripId, driverId);
    });
    setSelectedTrips(new Set());
    setIsAssignModalOpen(false);
  };

  const handleBulkUnassign = () => {
    safeSelectedTrips.forEach(tripId => {
      updateTrip(tripId, { driverId: null as any, status: 'pending' });
    });
    setSelectedTrips(new Set());
  };

  const handleSmartAutoAssign = async () => {
    if (safeSelectedTrips.size === 0) {
      showToast('Please select trips to auto-assign', 'error');
      return;
    }

    setIsAutoAssigning(true);

    try {
      const tripsToAssign = Array.from(safeSelectedTrips)
        .map(id => trips.find(t => t.id === id))
        .filter((t): t is Trip => t !== undefined && (t.status === 'pending' || !t.driverId));

      if (tripsToAssign.length === 0) {
        showToast('No unassigned or pending trips selected. Auto-assign works on trips without drivers or with pending status.', 'error');
        setIsAutoAssigning(false);
        return;
      }

      let assignedCount = 0;
      let failedCount = 0;

      for (const trip of tripsToAssign) {
        const availableDrivers = drivers.filter(d => d.status === 'available');

        if (availableDrivers.length === 0) {
          failedCount++;
          continue;
        }

        const tripsToday = trips.filter(t =>
          t.driverId &&
          t.scheduledTime &&
          isSameDay(new Date(t.scheduledTime), new Date())
        );

        const driverScores = availableDrivers.map(driver => {
          let score = 100;

          const driverTripsToday = tripsToday.filter(t => t.driverId === driver.id).length;
          if (driverTripsToday > 5) score -= 30;
          else if (driverTripsToday > 3) score -= 15;

          if (driver.rating && driver.rating >= 4.5) score += 20;
          else if (driver.rating && driver.rating < 3.5) score -= 15;

          const driverTotalTrips = trips.filter(t => t.driverId === driver.id).length;
          if (driverTotalTrips > 100) score += 10;
          else if (driverTotalTrips > 50) score += 5;

          if (trip.serviceLevel === 'wheelchair' && driver.vehicleType === 'van') {
            score += 25;
          } else if (trip.serviceLevel === 'wheelchair' && driver.vehicleType !== 'van') {
            score -= 50;
          }

          return { driver, score };
        });

        driverScores.sort((a, b) => b.score - a.score);

        const bestDriver = driverScores[0]?.driver;

        if (bestDriver) {
          await updateTrip(trip.id, {
            driverId: bestDriver.id,
            status: 'assigned',
          });
          assignedCount++;
        } else {
          failedCount++;
        }
      }

      setSelectedTrips(new Set());

      if (assignedCount > 0 && failedCount === 0) {
        showToast(`Successfully auto-assigned ${assignedCount} trip${assignedCount > 1 ? 's' : ''}`, 'success');
      } else if (assignedCount > 0 && failedCount > 0) {
        showToast(`Assigned ${assignedCount} trip${assignedCount > 1 ? 's' : ''}, ${failedCount} failed`, 'info');
      } else {
        showToast('No trips could be auto-assigned', 'error');
      }
    } catch (error) {
      console.error('Error in smart auto-assignment:', error);
      showToast('Error during auto-assignment', 'error');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleUpdateWillCall = () => {
    const selectedTripsArray = Array.from(safeSelectedTrips);
    const returnTrips = selectedTripsArray.filter(tripId => {
      const trip = trips.find(t => t.id === tripId);
      return trip?.isReturnTrip;
    });

    if (returnTrips.length === 0) {
      showToast('Please select return trips to update Will Call status', 'error');
      return;
    }

    const nonReturnCount = selectedTripsArray.length - returnTrips.length;

    returnTrips.forEach(tripId => {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        const newWillCallStatus = !trip.willCall;
        const scheduledTime = newWillCallStatus
          ? '2000-01-01T00:00:00.000Z'
          : new Date().toISOString();
        updateTrip(tripId, {
          willCall: newWillCallStatus,
          scheduledTime: scheduledTime
        });
      }
    });

    const message = nonReturnCount > 0
      ? `Updated ${returnTrips.length} return trip(s). ${nonReturnCount} non-return trip(s) were skipped.`
      : `Updated Will Call status for ${returnTrips.length} return trip(s)`;

    showToast(message, 'success');
    setSelectedTrips(new Set());
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const toggleAllTrips = () => {
    if (safeSelectedTrips.size === filteredTrips.length) {
      setSelectedTrips(new Set());
    } else {
      setSelectedTrips(new Set(filteredTrips.map(t => t.id)));
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ column: string; label: string; className?: string }> = ({ column, label, className }) => {
    const isSorted = sortConfig?.key === column;
    const direction = sortConfig?.direction;

    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase cursor-pointer hover:bg-gray-100 transition-colors ${className || ''}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isSorted ? (
            direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  const showDateInTime = filterDate !== 'today';

  const EditableTimeField: React.FC<{ tripId: string; field: string; value?: string }> = ({ tripId, field, value }) => {
    const isEditing = editingTimeField?.tripId === tripId && editingTimeField?.field === field;
    const trip = trips.find(t => t.id === tripId);

    if (isEditing) {
      return (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          autoFocus
          onChange={(e) => {
            const newValue = e.target.value ? new Date(e.target.value).toISOString() : undefined;

            // If this is a Will Call trip and driver is setting actual pickup time, clear willCall flag
            if (trip?.willCall && field === 'actualPickupTime' && newValue) {
              updateTrip(tripId, {
                [field]: newValue,
                willCall: false,
                scheduledTime: newValue
              });
            } else {
              updateTrip(tripId, { [field]: newValue });
            }
          }}
          onBlur={() => setEditingTimeField(null)}
          className="w-full px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    return (
      <div
        onClick={() => setEditingTimeField({ tripId, field })}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
      >
        {value ? (showDateInTime ? formatDateTime(value) : formatTime(value)) : '--:--'}
      </div>
    );
  };

  const EditableFareField: React.FC<{ tripId: string; fare: number }> = ({ tripId, fare }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(fare.toString());

    if (isEditing) {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          autoFocus
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            const newFare = parseFloat(editValue) || 0;
            updateTrip(tripId, { fare: newFare, fareManuallySet: true } as any);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newFare = parseFloat(editValue) || 0;
              updateTrip(tripId, { fare: newFare, fareManuallySet: true } as any);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setEditValue(fare.toString());
              setIsEditing(false);
            }
          }}
          className="w-20 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    return (
      <div
        onClick={() => {
          setEditValue(fare.toString());
          setIsEditing(true);
        }}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors inline-block"
        title="Click to edit fare"
      >
        <span className="text-gray-900 font-semibold">
          {fare > 0 ? `$${fare.toFixed(2)}` : '-'}
        </span>
      </div>
    );
  };

  const EditableDriverPayoutField: React.FC<{ tripId: string; driverPayout: number }> = ({ tripId, driverPayout }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(driverPayout.toString());

    if (isEditing) {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          autoFocus
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            const newPayout = parseFloat(editValue) || 0;
            updateTrip(tripId, { driverPayout: newPayout, driverPayoutManuallySet: true } as any);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newPayout = parseFloat(editValue) || 0;
              updateTrip(tripId, { driverPayout: newPayout, driverPayoutManuallySet: true } as any);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setEditValue(driverPayout.toString());
              setIsEditing(false);
            }
          }}
          className="w-20 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    return (
      <div
        onClick={() => {
          setEditValue(driverPayout.toString());
          setIsEditing(true);
        }}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors inline-block"
        title="Click to edit driver payout"
      >
        <span className="text-gray-900 font-semibold">
          {driverPayout > 0 ? `$${driverPayout.toFixed(2)}` : '-'}
        </span>
      </div>
    );
  };

  const filteredTrips = trips.filter(trip => {
    if (filterStatus !== 'all' && trip.status !== filterStatus) {
      return false;
    }

    // Handle date filtering
    if (filterDate !== 'all') {
      // Will Call return trips don't have a scheduled date yet
      // But they should appear with their outbound trip on the same date
      if (trip.willCall && trip.isReturnTrip) {
        // Find the outbound trip (A trip) for this return trip (B trip)
        const outboundTripNumber = (trip.tripNumber || '').replace(/B$/, 'A');
        const outboundTrip = trips.find(t => t.tripNumber === outboundTripNumber);

        if (outboundTrip && outboundTrip.scheduledTime) {
          // Use the outbound trip's scheduled time for filtering
          const outboundDateTime = new Date(outboundTrip.scheduledTime);
          if (isNaN(outboundDateTime.getTime())) {
            return false;
          }
          const outboundDate = getStartOfDay(outboundDateTime);

          // Now apply the same date filter logic using the outbound trip's date
          if (filterDate === 'range' && filterDateRange) {
            const startDate = getStartOfDay(new Date(filterDateRange.start));
            const endDate = getEndOfDay(new Date(filterDateRange.end));
            return outboundDate >= startDate && outboundDate <= endDate;
          }

          switch (filterDate) {
            case 'today':
              return isToday(outboundDate);
            case 'yesterday':
              return isYesterday(outboundDate);
            case 'tomorrow':
              return isTomorrow(outboundDate);
            case 'this-week':
              const weekStart = getStartOfDay(new Date());
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekEnd = getEndOfDay(new Date());
              weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
              return outboundDate >= weekStart && outboundDate <= weekEnd;
            case 'next-week':
              const nextWeekStart = getStartOfDay(new Date());
              nextWeekStart.setDate(nextWeekStart.getDate() + (7 - nextWeekStart.getDay()));
              const nextWeekEnd = getEndOfDay(new Date(nextWeekStart));
              nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
              return outboundDate >= nextWeekStart && outboundDate <= nextWeekEnd;
            case 'this-month':
              const thisMonthDate = new Date();
              return outboundDate.getMonth() === thisMonthDate.getMonth() &&
                outboundDate.getFullYear() === thisMonthDate.getFullYear();
            case 'next-month':
              const nextMonthDate = new Date();
              nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
              return outboundDate.getMonth() === nextMonthDate.getMonth() &&
                outboundDate.getFullYear() === nextMonthDate.getFullYear();
            case 'last-month':
              const lastMonthDate = new Date();
              lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
              return outboundDate.getMonth() === lastMonthDate.getMonth() &&
                outboundDate.getFullYear() === lastMonthDate.getFullYear();
            case 'this-year':
              const thisYear = new Date();
              return outboundDate.getFullYear() === thisYear.getFullYear();
            case 'specific-date':
              if (filterDateRange && filterDateRange.start) {
                const specificDate = getStartOfDay(new Date(filterDateRange.start));
                return isSameDay(outboundDate, specificDate);
              }
              return false;
            default:
              return false;
          }
        }
        // If no outbound trip found, don't show this will-call return trip
        return false;
      }

      // Skip trips without scheduled times
      if (!trip.scheduledTime) {
        return false;
      }

      // Parse the trip date and normalize to start of day for comparison
      const tripDateTime = new Date(trip.scheduledTime);

      // Check if the date is valid
      if (isNaN(tripDateTime.getTime())) {
        return false;
      }

      const tripDate = getStartOfDay(tripDateTime);

      if (filterDate === 'range' && filterDateRange) {
        const startDate = getStartOfDay(new Date(filterDateRange.start));
        const endDate = getEndOfDay(new Date(filterDateRange.end));
        if (tripDate < startDate || tripDate > endDate) {
          return false;
        }
      } else {
        switch (filterDate) {
          case 'today':
            const today = getStartOfDay(new Date());
            if (!isSameDay(tripDate, today)) {
              return false;
            }
            break;
          case 'yesterday':
            const yesterday = getStartOfDay(new Date());
            yesterday.setDate(yesterday.getDate() - 1);
            if (!isSameDay(tripDate, yesterday)) {
              return false;
            }
            break;
          case 'tomorrow':
            const tomorrow = getStartOfDay(new Date());
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (!isSameDay(tripDate, tomorrow)) {
              return false;
            }
            break;
          case 'this-week':
            const currentDate = new Date();
            const weekStart = getStartOfDay(new Date(currentDate));
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = getEndOfDay(new Date(weekStart));
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (tripDate < weekStart || tripDate > weekEnd) return false;
            break;
          case 'next-week':
            const nextWeekRef = new Date();
            const nextWeekStart = getStartOfDay(new Date(nextWeekRef));
            nextWeekStart.setDate(nextWeekStart.getDate() - nextWeekStart.getDay() + 7);
            const nextWeekEnd = getEndOfDay(new Date(nextWeekStart));
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
            if (tripDate < nextWeekStart || tripDate > nextWeekEnd) return false;
            break;
          case 'last-week':
            const todayDate = new Date();
            const lastWeekStart = getStartOfDay(new Date(todayDate));
            lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
            const lastWeekEnd = getEndOfDay(new Date(lastWeekStart));
            lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
            if (tripDate < lastWeekStart || tripDate > lastWeekEnd) return false;
            break;
          case 'this-month':
            const thisMonth = new Date();
            if (tripDate.getMonth() !== thisMonth.getMonth() || tripDate.getFullYear() !== thisMonth.getFullYear()) return false;
            break;
          case 'next-month':
            const nextMonthDate = new Date();
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            if (tripDate.getMonth() !== nextMonthDate.getMonth() || tripDate.getFullYear() !== nextMonthDate.getFullYear()) return false;
            break;
          case 'last-month':
            const lastMonthDate = new Date();
            lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
            if (tripDate.getMonth() !== lastMonthDate.getMonth() || tripDate.getFullYear() !== lastMonthDate.getFullYear()) return false;
            break;
          case 'this-year':
            const thisYear = new Date();
            if (tripDate.getFullYear() !== thisYear.getFullYear()) return false;
            break;
          case 'specific-date':
            if (filterDateRange && filterDateRange.start) {
              const specificDate = getStartOfDay(new Date(filterDateRange.start));
              if (!isSameDay(tripDate, specificDate)) return false;
            }
            break;
        }
      }
    }

    if (filterTripNumber && !((trip.tripNumber || trip.id).toLowerCase().includes(filterTripNumber.toLowerCase()))) {
      return false;
    }

    if (filterRiderName && !trip.customerName.toLowerCase().includes(filterRiderName.toLowerCase())) {
      return false;
    }

    if (filterDriver && trip.driverId !== filterDriver) {
      return false;
    }

    if (filterClassification !== 'all' && trip.classification !== filterClassification) {
      return false;
    }

    if (filterClinic !== 'all' && trip.clinicId !== filterClinic) {
      return false;
    }

    return true;
  });

  // Log filter results
  //console.log('Filter Results:', {
  //  totalTrips: trips.length,
  //  filteredTrips: filteredTrips.length,
  //  filterDate: filterDate,
  //  filterStatus: filterStatus
  //});

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    let aValue: any = a[key as keyof Trip];
    let bValue: any = b[key as keyof Trip];

    if (key === 'driverId') {
      aValue = getDriverName(a.driverId);
      bValue = getDriverName(b.driverId);
    } else if (key === 'clinicId') {
      aValue = getClinicName(a.clinicId);
      bValue = getClinicName(b.clinicId);
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getDriverName = (driverId?: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'Unassigned';
  };

  const getClinicName = (clinicId?: string) => {
    if (!clinicId) return '-';
    // Check clinics first (Transport Company)
    const clinic = clinics.find(c => c.id === clinicId);
    if (clinic) return clinic.name;
    return '-';
  };

  const getContractorName = (contractorId?: string) => {
    if (!contractorId) return '-';
    // Check contractors (Client Account)
    const contractor = contractors.find(f => f.id === contractorId);
    if (contractor) return contractor.name;
    return '-';
  };

  const getContractorDisplay = (contractorId?: string) => {
    if (!contractorId) return '-';
    const contractor = contractors.find(f => f.id === contractorId);
    if (!contractor) return '-';
    // Show code if available, otherwise full name
    return (contractor as any).contractorCode || contractor.name;
  };

  const renderConfirmationStatus = (trip: any) => {
    const status = trip.passenger_confirmation_status || trip.passengerConfirmationStatus;
    const lastUpdate = trip.last_confirmation_update || trip.lastConfirmationUpdate;

    if (!status || status === 'awaiting_response') {
      return (
        <div className="flex items-center gap-2" title="Awaiting passenger response">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            ⏳ Awaiting Response
          </span>
        </div>
      );
    }

    if (status === 'confirmed') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            ✅ Confirmed
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      );
    }

    if (status === 'canceled') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            ❌ Canceled
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      );
    }

    if (status === 'unconfirmed') {
      return (
        <div className="flex items-center gap-2" title="Passenger reply unclear">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            ⚠️ Unconfirmed
          </span>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex items-center gap-2" title="Confirmation window expired">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
            ⏰ Expired
          </span>
        </div>
      );
    }

    return (
      <span className="text-gray-400 text-sm">-</span>
    );
  };

  const calculateDriverPayoutAmount = (trip: Trip): number => {
    // If driverPayout was manually edited, use that value
    if (trip.driverPayout && trip.driverPayout > 0 && (trip as any).driverPayoutManuallySet) {
      return trip.driverPayout;
    }

    // If we have a stored driver payout value, use it
    if (trip.driverPayout !== undefined && trip.driverPayout !== null && trip.driverPayout > 0) {
      return trip.driverPayout;
    }

    // No driver assigned
    if (!trip.driverId) {
      return 0;
    }

    // Find driver
    const driver = drivers.find(d => d.id === trip.driverId);
    if (!driver) {
      return 0;
    }

    // Drivers don't have cancellation/no-show rates
    if (trip.status === 'cancelled' || trip.status === 'no-show') {
      return 0;
    }

    // Calculate payout from compact rates JSONB
    const rates = driver.rates || {};
    const serviceLevel = trip.serviceLevel || 'ambulatory';
    const serviceLevelRates = rates[serviceLevel];

    if (!serviceLevelRates || !Array.isArray(serviceLevelRates) || serviceLevelRates.length === 0) {
      return 0;
    }

    const distance = trip.distance || 0;
    const roundedMiles = Math.round(distance);

    // Parse compact format: [...[from,to,rate], additionalRate]
    const additionalMileRate = typeof serviceLevelRates[serviceLevelRates.length - 1] === 'number' && !Array.isArray(serviceLevelRates[serviceLevelRates.length - 1])
      ? serviceLevelRates[serviceLevelRates.length - 1]
      : 0;
    const tiers = serviceLevelRates.filter((item: any) => Array.isArray(item));

    // Find applicable tier
    let applicableTier = tiers.find((t: number[]) => roundedMiles >= t[0] && roundedMiles <= t[1]);
    if (!applicableTier && tiers.length > 0) {
      applicableTier = tiers[tiers.length - 1]; // Use last tier if beyond all
    }
    if (!applicableTier) return 0;

    let payout = applicableTier[2]; // rate
    const baseMiles = applicableTier[1]; // toMiles of the tier

    // Add additional miles charge if distance exceeds tier
    if (roundedMiles > baseMiles && additionalMileRate > 0) {
      payout += (roundedMiles - baseMiles) * additionalMileRate;
    }

    // Apply deductions
    const deductions = rates.deductions;
    if (deductions && Array.isArray(deductions)) {
      const [rental, insurance, percentage] = deductions;
      if (rental) payout -= rental;
      if (insurance) payout -= insurance;
      if (percentage) payout -= payout * (percentage / 100);
    }

    return Math.max(0, Math.round(payout * 100) / 100);
  };

  const calculateTripCharge = (trip: Trip): number => {
    // If fare was manually edited, use that value
    // Check if fare exists and fareManuallySet flag is true
    if (trip.fare && trip.fare > 0 && (trip as any).fareManuallySet) {
      return trip.fare;
    }

    // Otherwise, always calculate from current rates (dynamic pricing)
    let rateSource: any = null;

    // First check contractor (Client Account)
    if (trip.contractorId) {
      rateSource = contractors.find(f => f.id === trip.contractorId);
    }

    // Fallback to clinic (Transport Company) if no contractor
    if (!rateSource && trip.clinicId) {
      rateSource = clinics.find(c => c.id === trip.clinicId);
    }

    if (!rateSource) {
      // console.log('No rate source found for trip:', trip.id);
      return 0;
    }

    // Get rate based on status and service level
    let rate = 0;

    // Contractors store all rates inside rateTiers JSONB; clinics use flat fields
    const rt = rateSource.rateTiers;
    const hasTiers = rt && typeof rt === 'object';

    // For cancelled trips, use cancellation rate
    if (trip.status === 'cancelled') {
      const cr = hasTiers ? rt.cancellationRate : rateSource.cancellationRate;
      if (cr !== undefined && cr !== null) rate = cr;
    }
    // For no-show trips, use no-show rate
    else if (trip.status === 'no-show') {
      const nr = hasTiers ? rt.noShowRate : rateSource.noShowRate;
      if (nr !== undefined && nr !== null) rate = nr;
    }
    // Otherwise use service level rate (first tier rate for contractors, flat field for clinics)
    else {
      if (hasTiers) {
        const tierKey = trip.serviceLevel as string; // 'ambulatory' | 'wheelchair' | 'stretcher'
        const tiers = rt[tierKey];
        if (Array.isArray(tiers) && tiers.length > 0) {
          rate = tiers[0].rate || 0;
        }
      } else {
        switch (trip.serviceLevel) {
          case 'ambulatory':
            rate = rateSource.ambulatoryRate || 0;
            break;
          case 'wheelchair':
            rate = rateSource.wheelchairRate || 0;
            break;
          case 'stretcher':
            rate = rateSource.stretcherRate || 0;
            break;
        }
      }
    }

    // console.log('Calculated charge for trip', trip.id, ':', rate);
    return rate;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrors([]);
    setImportPreview([]);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          let rows: any[] = [];

          if (file.name.endsWith('.csv')) {
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            rows = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
          } else {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet);
          }

          const errors: string[] = [];
          const preview = rows.map((row, index) => {
            const rowErrors: string[] = [];

            // Support both old and new template field names
            const firstName = row['First Name'] || '';
            const lastName = row['Last Name'] || '';
            const patientName = row['Patient Name'] || row['Rider Name'] || '';
            
            if (!firstName && !lastName && !patientName) {
              rowErrors.push(`Row ${index + 2}: Missing rider name (First Name and Last Name required)`);
            }
            if (!row['Pickup Address']) {
              rowErrors.push(`Row ${index + 2}: Missing pickup address`);
            }
            if (!row['Dropoff Address']) {
              rowErrors.push(`Row ${index + 2}: Missing dropoff address`);
            }
            if (!row['Pickup Date'] && !row['Date']) {
              rowErrors.push(`Row ${index + 2}: Missing pickup date`);
            }
            if (!row['Pickup Time'] && !row['Time']) {
              rowErrors.push(`Row ${index + 2}: Missing pickup time`);
            }
            
            // Validate service level
            const serviceLevel = (row['Service Level'] || row['Service Type'] || '').toLowerCase();
            const validServiceLevels = ['ambulatory', 'wheelchair', 'stretcher', 'bariatric'];
            if (!serviceLevel || !validServiceLevels.includes(serviceLevel)) {
              rowErrors.push(`Row ${index + 2}: Invalid or missing service level (must be: ambulatory, wheelchair, stretcher, or bariatric)`);
            }
            
            // Validate journey type if provided
            const journeyType = (row['Journey Type'] || 'one-way').toLowerCase();
            if (!['one-way', 'roundtrip'].includes(journeyType)) {
              rowErrors.push(`Row ${index + 2}: Invalid journey type (must be: one-way or roundtrip)`);
            }
            
            // Validate return time for roundtrip
            const willCall = (row['Will Call'] || '').toLowerCase();
            if (journeyType === 'roundtrip' && !row['Return Time'] && willCall !== 'yes') {
              rowErrors.push(`Row ${index + 2}: Roundtrip requires Return Time or Will Call set to 'yes'`);
            }

            if (rowErrors.length > 0) {
              errors.push(...rowErrors);
            }

            return {
              ...row,
              hasErrors: rowErrors.length > 0
            };
          });

          setImportPreview(preview);
          setImportErrors(errors);
        } catch (error) {
          console.error('Error parsing file:', error);
          setImportErrors(['Failed to parse file. Please check the file format.']);
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      setImportErrors(['Failed to read file.']);
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0 || importErrors.length > 0) {
      showToast('Please fix errors before importing', 'error');
      return;
    }

    setIsProcessingImport(true);

    try {
      const validTrips = importPreview.filter(row => !row.hasErrors);
      let successCount = 0;
      let failCount = 0;

      for (const row of validTrips) {
        try {
          // Support both old and new template field names
          const firstName = row['First Name'] || '';
          const lastName = row['Last Name'] || '';
          const patientName = row['Patient Name'] || row['Rider Name'] || `${firstName} ${lastName}`.trim();
          const patientPhone = row['Phone'] || row['Patient Phone'] || '';
          const patientEmail = row['Email'] || '';
          const pickupAddress = row['Pickup Address'] || '';
          const dropoffAddress = row['Dropoff Address'] || '';
          const pickupDate = row['Pickup Date'] || row['Date'] || '';
          const pickupTime = row['Pickup Time'] || row['Time'] || '';
          const appointmentTime = row['Appointment Time'] || '';
          const serviceLevel = (row['Service Level'] || row['Service Type'] || 'ambulatory').toLowerCase();
          const journeyType = (row['Journey Type'] || 'one-way').toLowerCase();
          const returnTime = row['Return Time'] || '';
          const willCallValue = (row['Will Call'] || '').toLowerCase();
          const willCall = willCallValue === 'yes' || willCallValue === 'true';
          const classification = row['Classification'] || 'medical';
          const levelOfAssistance = row['Level of Assistance'] || '';
          const notes = row['Notes'] || '';
          const contractorNotes = row['Facility Notes'] || '';

          // Use user's contractor/clinic ID
          const clinicId = user?.clinicId || '';

          // Parse pickup date and time
          const dateTimeString = `${pickupDate} ${pickupTime}`;
          const scheduledTime = new Date(dateTimeString);

          if (isNaN(scheduledTime.getTime())) {
            failCount++;
            continue;
          }

          // Parse return time for roundtrip
          let returnDateTime: Date | null = null;
          if (journeyType === 'roundtrip' && returnTime && !willCall) {
            const returnDateTimeString = `${pickupDate} ${returnTime}`;
            returnDateTime = new Date(returnDateTimeString);
            if (isNaN(returnDateTime.getTime())) {
              returnDateTime = null;
            }
          }

          const tripData = {
            firstName,
            lastName,
            customerName: patientName,
            customerPhone: patientPhone,
            customerEmail: patientEmail,
            pickupLocation: pickupAddress,
            dropoffLocation: dropoffAddress,
            scheduledPickupTime: scheduledTime.toISOString(),
            appointmentTime: appointmentTime ? `${pickupDate} ${appointmentTime}` : '',
            serviceLevel: serviceLevel as 'ambulatory' | 'wheelchair' | 'stretcher' | 'bariatric',
            journeyType: journeyType as 'one-way' | 'roundtrip',
            returnTime: returnDateTime ? returnDateTime.toISOString() : '',
            returnPickupLocation: journeyType === 'roundtrip' ? dropoffAddress : '',
            returnDropoffLocation: journeyType === 'roundtrip' ? pickupAddress : '',
            willCall,
            classification: classification as Trip['classification'],
            levelOfAssistance,
            notes,
            clinicNote: contractorNotes,
            clinicId,
            contractorId: user?.clinicId || '', // Contractor dispatcher's contractor
          };

          await addTrip(tripData);
          successCount++;
        } catch (error) {
          console.error('Error importing trip:', error);
          failCount++;
        }
      }

      await refreshData();

      showToast(
        `Import completed: ${successCount} trips imported${failCount > 0 ? `, ${failCount} failed` : ''}`,
        failCount > 0 ? 'warning' : 'success'
      );

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
    } catch (error) {
      console.error('Error during import:', error);
      showToast('Failed to import trips', 'error');
    } finally {
      setIsProcessingImport(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone': '123-456-7890',
        'Email': 'john.doe@email.com (optional)',
        'Pickup Address': '123 Main St, City, State 12345',
        'Dropoff Address': '456 Oak Ave, City, State 12345',
        'Pickup Date': '2025-11-05',
        'Pickup Time': '09:00',
        'Appointment Time': '10:00 (optional)',
        'Service Level': 'ambulatory, wheelchair, stretcher, or bariatric',
        'Journey Type': 'one-way or roundtrip',
        'Return Time': '14:00 (required if roundtrip, leave empty for Will Call)',
        'Will Call': 'yes or no (for roundtrip only)',
        'Classification': 'medical, dialysis, or other',
        'Level of Assistance': 'door-to-door, curb-to-curb, or hand-to-hand (optional)',
        'Notes': 'Optional notes for driver',
        'Facility Notes': 'Optional internal notes'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 40 },
      { wch: 15 }, { wch: 30 }, { wch: 45 }, { wch: 30 }, { wch: 30 }
    ];
    
    XLSX.writeFile(wb, 'trip_import_template.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Management</h1>
          <p className="text-gray-600">Create, assign, and manage all trips</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-4 mb-4`}>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Date</label>
            <select
              value={filterDate}
              onChange={e => {
                const value = e.target.value;
                setFilterDate(value);
                if (value === 'range' || value === 'specific-date') {
                  setShowDatePicker(true);
                } else {
                  setFilterDateRange(null);
                  setShowDatePicker(false);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this-week">This Week</option>
              <option value="next-week">Next Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="next-month">Next Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="specific-date">Specific Date</option>
              <option value="range">Date Range</option>
              <option value="all">All Time</option>
            </select>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-80">
                <div className="space-y-3">
                  {filterDate === 'specific-date' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Select Date</label>
                      <input
                        type="date"
                        value={filterDateRange?.start || ''}
                        onChange={e => setFilterDateRange({ start: e.target.value, end: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={filterDateRange?.start || ''}
                          onChange={e => setFilterDateRange(prev => ({ start: e.target.value, end: prev?.end || e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={filterDateRange?.end || ''}
                          onChange={e => setFilterDateRange(prev => ({ start: prev?.start || e.target.value, end: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowDatePicker(false);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setFilterDate('all');
                        setFilterDateRange(null);
                        setShowDatePicker(false);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Number</label>
            <input
              type="text"
              placeholder="Type..."
              value={filterTripNumber}
              onChange={e => setFilterTripNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rider's Name</label>
            <input
              type="text"
              placeholder="Type here..."
              value={filterRiderName}
              onChange={e => setFilterRiderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-Show</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Driver</label>
              <select
                value={filterDriver}
                onChange={e => setFilterDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Drivers</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
              </select>
            </div>
          )}

          {isMHMRUser && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Classification</label>
              <select
                value={filterClassification}
                onChange={e => setFilterClassification(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All</option>
                <option value="child & family">Child & Family</option>
                <option value="rapp">RAPP</option>
                <option value="bh">BH</option>
              </select>
            </div>
          )}

          {isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Clinic</label>
              <select
                value={filterClinic}
                onChange={e => setFilterClinic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Clinics</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Trip(s)</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Import Trips</span>
            </button>
            {canAssignDrivers && (
              <button
                onClick={handleSmartAutoAssign}
                disabled={safeSelectedTrips.size === 0 || isAutoAssigning}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${safeSelectedTrips.size > 0 && !isAutoAssigning
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                title={safeSelectedTrips.size === 0 ? 'Select trips to auto-assign' : 'Automatically assign drivers based on availability, workload, and ratings'}
              >
                {isAutoAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Smart Auto-Assign</span>
                    {safeSelectedTrips.size > 0 && (
                      <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-bold">
                        {safeSelectedTrips.size}
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                <span>Export</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[150px]">
                  <button
                    onClick={() => {
                      const tripsToExport = safeSelectedTrips.size > 0
                        ? filteredTrips.filter(t => safeSelectedTrips.has(t.id))
                        : filteredTrips;

                      const stats = {
                        totalTrips: tripsToExport.length,
                        completedTrips: tripsToExport.filter(t => t.status === 'completed').length,
                        totalRevenue: tripsToExport.reduce((sum, t) => sum + t.fare, 0),
                        avgFare: tripsToExport.length > 0 ? tripsToExport.reduce((sum, t) => sum + t.fare, 0) / tripsToExport.length : 0,
                        totalDistance: tripsToExport.reduce((sum, t) => sum + t.distance, 0),
                        completionRate: tripsToExport.length > 0 ? Math.round((tripsToExport.filter(t => t.status === 'completed').length / tripsToExport.length) * 100) : 0,
                      };
                      exportToPDF(tripsToExport, drivers, stats, filterDate, undefined, clinics, visibleColumns);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm font-medium text-gray-700 first:rounded-t-lg"
                  >
                    Export as PDF {safeSelectedTrips.size > 0 && `(${safeSelectedTrips.size} selected)`}
                  </button>
                  <button
                    onClick={() => {
                      const tripsToExport = safeSelectedTrips.size > 0
                        ? filteredTrips.filter(t => safeSelectedTrips.has(t.id))
                        : filteredTrips;

                      const stats = {
                        totalTrips: tripsToExport.length,
                        completedTrips: tripsToExport.filter(t => t.status === 'completed').length,
                        totalRevenue: tripsToExport.reduce((sum, t) => sum + t.fare, 0),
                        avgFare: tripsToExport.length > 0 ? tripsToExport.reduce((sum, t) => sum + t.fare, 0) / tripsToExport.length : 0,
                        totalDistance: tripsToExport.reduce((sum, t) => sum + t.distance, 0),
                        completionRate: tripsToExport.length > 0 ? Math.round((tripsToExport.filter(t => t.status === 'completed').length / tripsToExport.length) * 100) : 0,
                      };
                      exportToCSV(tripsToExport, drivers, stats, filterDate, clinics, visibleColumns);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm font-medium text-gray-700 last:rounded-b-lg border-t border-gray-200"
                  >
                    Export as CSV {safeSelectedTrips.size > 0 && `(${safeSelectedTrips.size} selected)`}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                //console.log('Refresh button clicked - reloading data from database...');
                setIsRefreshing(true);
                try {
                  await refreshData();
                  //console.log('Refresh completed successfully');
                  //console.log('Updated trips count:', trips.length);
                  showToast('Trip list refreshed', 'success');
                } catch (error) {
                  console.error('Refresh failed:', error);
                  showToast('Failed to refresh trip list', 'error');
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Refreshing...</span>
                </>
              ) : (
                <span>Refresh List</span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Columns</span>
              </button>
              {showColumnSettings && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900">Customize Columns</h3>
                      <button
                        onClick={() => setShowColumnSettings(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">Select which columns to display in the table</p>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Presets</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(COLUMN_PRESETS).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => applyColumnPreset(key as keyof typeof COLUMN_PRESETS)}
                            className="px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Available Columns</h4>
                      <div className="space-y-2">
                        {AVAILABLE_COLUMNS.filter(col => !col.adminOnly || isAdmin).map(column => {
                          const isVisible = isColumnVisible(column.id);
                          const isRequired = column.required;

                          return (
                            <button
                              key={column.id}
                              onClick={() => !isRequired && toggleColumn(column.id)}
                              disabled={isRequired}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${isRequired
                                ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                : isVisible
                                  ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-center space-x-3">
                                {isVisible ? (
                                  <Eye className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                )}
                                <div className="text-left">
                                  <div className="text-sm font-medium text-gray-900">
                                    {column.label}
                                    {isRequired && <span className="ml-2 text-xs text-gray-500">(Required)</span>}
                                  </div>
                                  <div className="text-xs text-gray-500">{column.description}</div>
                                </div>
                              </div>
                              <div className={`w-10 h-5 rounded-full transition-colors ${isVisible ? 'bg-blue-600' : 'bg-gray-300'
                                } ${isRequired ? 'opacity-50' : ''}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${isVisible ? 'translate-x-5' : 'translate-x-0.5'
                                  } mt-0.5`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => setShowColumnSettings(false)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Save & Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {safeSelectedTrips.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {canAssignDrivers && (
                <>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Assign Driver
                  </button>
                  <button
                    onClick={handleBulkUnassign}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Un-Assign Driver
                  </button>
                </>
              )}
              <button
                onClick={handleUpdateWillCall}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Update Will Call
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                Send Text
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                Actions
              </button>
              <span className="text-sm text-gray-600 ml-4">{safeSelectedTrips.size} trips selected</span>
            </div>
          </div>
        )}
      </div>

      {safeSelectedTrips.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-blue-900">{safeSelectedTrips.size} trip(s) selected</span>
            <button
              onClick={() => setSelectedTrips(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('pending')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-semibold"
            >
              Mark Pending
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('in-progress')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('completed')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
            >
              Mark Completed
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('cancelled')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
            >
              Mark Cancelled
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('no-show')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-semibold"
            >
              Mark No-Show
            </button>
            <button
              onClick={handleBulkReinstate}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
            >
              Reinstate
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isColumnVisible('checkbox') && (
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={safeSelectedTrips.size === filteredTrips.length && filteredTrips.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                )}
                {isColumnVisible('tripNumber') && <SortableHeader column="id" label="Trip Number" />}
                {isMHMRUser && isColumnVisible('clinicNote') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Clinic Code
                  </th>
                )}
                {isColumnVisible('status') && <SortableHeader column="status" label="Status" />}
                {isColumnVisible('confirmation') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Passenger Confirmation
                  </th>
                )}
                {isColumnVisible('customerName') && <SortableHeader column="customerName" label="Passenger Name" />}
                {isColumnVisible('serviceLevel') && <SortableHeader column="serviceLevel" label="Service Level" />}
                {isColumnVisible('classification') && <SortableHeader column="classification" label="Classification" />}
                {isColumnVisible('driverId') && <SortableHeader column="driverId" label="Driver Name" />}
                {isColumnVisible('scheduledTime') && <SortableHeader column="scheduledTime" label="Scheduled Pickup Time" />}
                {isColumnVisible('appointmentTime') && <SortableHeader column="appointmentTime" label="Appt Time" />}
                {isColumnVisible('actualPickupTime') && <SortableHeader column="actualPickupTime" label="Actual PU" />}
                {isColumnVisible('actualDropoffTime') && <SortableHeader column="actualDropoffTime" label="Actual DO" />}
                {isColumnVisible('passengerSignature') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Pickup Signature
                  </th>
                )}
                {isColumnVisible('pickupLocation') && <SortableHeader column="pickupLocation" label="Pickup Address" />}
                {isColumnVisible('dropoffLocation') && <SortableHeader column="dropoffLocation" label="Drop off Address" />}
                {isColumnVisible('distance') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Mileage (mi)
                  </th>
                )}
                {isColumnVisible('fare') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Contractor
                  </th>
                )}
                {isColumnVisible('driverPayout') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Driver Rate
                  </th>
                )}
                {isAdmin && isColumnVisible('clinic') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Clinic
                  </th>
                )}
                {isColumnVisible('actions') && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTrips.map(trip => {
                const scheduledTime = new Date(trip.scheduledTime);
                const now = new Date();
                const minutesUntilPickup = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
                const isUrgent = minutesUntilPickup <= 30 && minutesUntilPickup > 0 && !trip.driverId && trip.status === 'pending';
                const isPast = minutesUntilPickup < 0 && !trip.driverId && trip.status === 'pending';

                return (
                  <tr
                    key={trip.id}
                    className={`hover:bg-gray-50 transition-colors text-sm ${isUrgent ? 'bg-red-50 border-l-4 border-l-red-500' :
                      isPast ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                      }`}
                    title={trip.notes || ''}
                  >
                    {isColumnVisible('checkbox') && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={safeSelectedTrips.has(trip.id)}
                          onChange={() => handleSelectTrip(trip.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {isColumnVisible('tripNumber') && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenModal(trip)}
                          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
                          title="Click to edit trip"
                        >
                          {trip.tripNumber || trip.id.slice(0, 8).toUpperCase()}
                        </button>
                        {trip.dispatcherName && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            By: {trip.dispatcherName}
                          </div>
                        )}
                      </td>
                    )}
                    {isMHMRUser && isColumnVisible('clinicNote') && (
                      <td className="px-4 py-3 text-gray-600">
                        {trip.clinicNote || '-'}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-4 py-3">
                        <StatusBadge status={trip.status} size="sm" />
                      </td>
                    )}
                    {isColumnVisible('confirmation') && (
                      <td className="px-4 py-3">
                        {renderConfirmationStatus(trip)}
                      </td>
                    )}
                    {isColumnVisible('customerName') && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPatientHistoryModal({
                            isOpen: true,
                            patientName: trip.customerName,
                            patientPhone: trip.customerPhone
                          })}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                        >
                          {trip.firstName && trip.lastName
                            ? `${trip.firstName} ${trip.lastName}`
                            : trip.customerName || 'Unknown'}
                        </button>
                      </td>
                    )}
                    {isColumnVisible('serviceLevel') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-gray-900">
                          {trip.serviceLevel === 'wheelchair' && (
                            <span title="Wheelchair">♿</span>
                          )}
                          <span className="capitalize">{trip.serviceLevel}</span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('classification') && (
                      <td className="px-4 py-3 text-gray-900">
                        <span className="capitalize">{trip.classification || '-'}</span>
                      </td>
                    )}
                    {isColumnVisible('driverId') && (
                      <td className="px-4 py-3 text-gray-900">
                        {trip.status !== 'completed' && trip.status !== 'cancelled' && trip.status !== 'no-show' ? (
                          <select
                            value={trip.driverId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                assignDriver(trip.id, e.target.value);
                              }
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 w-full min-w-[120px]"
                          >
                            <option value="">Select Driver</option>
                            {drivers
                              .filter(d => d.status === 'available')
                              .map(driver => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span>{getDriverName(trip.driverId)}</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('scheduledTime') && (
                      <td className="px-4 py-3 text-gray-900">
                        {trip.willCall ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            WILL CALL
                          </span>
                        ) : (
                          <EditableTimeField tripId={trip.id} field="scheduledTime" value={trip.scheduledTime} />
                        )}
                      </td>
                    )}
                    {isColumnVisible('appointmentTime') && (
                      <td className="px-4 py-3 text-gray-900">
                        <EditableTimeField tripId={trip.id} field="appointmentTime" value={trip.appointmentTime} />
                      </td>
                    )}
                    {isColumnVisible('actualPickupTime') && (
                      <td className="px-4 py-3 text-gray-900">
                        {trip.willCall && !trip.actualPickupTime ? (
                          <div
                            onClick={() => setEditingTimeField({ tripId: trip.id, field: 'actualPickupTime' })}
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          >
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              WILL CALL
                            </span>
                          </div>
                        ) : (
                          <EditableTimeField tripId={trip.id} field="actualPickupTime" value={trip.actualPickupTime} />
                        )}
                      </td>
                    )}
                    {isColumnVisible('actualDropoffTime') && (
                      <td className="px-4 py-3 text-gray-900">
                        <EditableTimeField tripId={trip.id} field="actualDropoffTime" value={trip.actualDropoffTime} />
                      </td>
                    )}
                    {isColumnVisible('passengerSignature') && (
                      <td className="px-4 py-3">
                        {tripSignatures.has(trip.id) && tripSignatures.get(trip.id)?.pickup ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                const sig = tripSignatures.get(trip.id)?.pickup;
                                if (sig) {
                                  const modal = document.createElement('div');
                                  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999';
                                  modal.innerHTML = `
                                  <div style="background:white;padding:20px;border-radius:8px;max-width:500px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                                      <h3 style="font-size:18px;font-weight:600;">Pickup Signature</h3>
                                      <button onclick="this.closest('div[style*=fixed]').remove()" style="font-size:24px;cursor:pointer;border:none;background:none;">&times;</button>
                                    </div>
                                    <img src="${sig.signature_data}" style="border:1px solid #ccc;border-radius:4px;width:100%;" />
                                    <div style="margin-top:10px;font-size:12px;color:#666;">
                                      <div><strong>Pickup Signature</strong></div>
                                      <div>Signed by: ${sig.signer_name || 'N/A'}</div>
                                      <div>Signed at: ${new Date(sig.signed_at).toLocaleString()}</div>
                                    </div>
                                  </div>
                                `;
                                  document.body.appendChild(modal);
                                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                                }
                              }}
                              className="text-xs text-green-600 hover:text-green-800 underline font-medium"
                            >
                              📝 View Signature
                            </button>
                            <span className="text-xs text-gray-500">
                              {new Date(tripSignatures.get(trip.id)!.pickup!.signed_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not signed yet</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('pickupLocation') && (
                      <td className="px-4 py-3 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-semibold">📍</span>
                          <span className="text-green-700 font-medium">{trip.pickupLocation}</span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('dropoffLocation') && (
                      <td className="px-4 py-3 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-semibold">🏥</span>
                          <span className="text-blue-700 font-medium">{trip.dropoffLocation}</span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('distance') && (
                      <td className="px-4 py-3 text-gray-900">
                        {trip.journeyType === 'roundtrip' ? (
                          <div>
                            <div className="font-medium">{Math.ceil(trip.distance || 0)} mi</div>
                            <div className="text-xs text-gray-500">
                              {trip.tripNumber?.endsWith('A') ? 'Leg A (Outbound)' : 'Leg B (Return)'}
                            </div>
                          </div>
                        ) : (
                          Math.ceil(trip.distance || 0)
                        )}
                      </td>
                    )}
                    {isColumnVisible('fare') && (
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-medium" title={getContractorName(trip.contractorId)}>
                          {getContractorDisplay(trip.contractorId)}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('driverPayout') && (
                      <td className="px-4 py-3">
                        <EditableDriverPayoutField tripId={trip.id} driverPayout={calculateDriverPayoutAmount(trip)} />
                      </td>
                    )}
                    {isAdmin && isColumnVisible('clinic') && (
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-medium">
                          {getClinicName(trip.clinicId)}
                        </span>
                      </td>
                    )}
                    {isAdmin && isColumnVisible('contractorId') && (
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-medium">
                          {getContractorName(trip.contractorId)}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('actions') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-1 relative">
                          <button
                            onClick={() => handleOpenModal(trip)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleActionMenu(trip.id);
                              }}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="More Actions"
                            >
                              <span className="text-lg font-bold">...</span>
                            </button>
                            {openActionMenu === trip.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => handleOpenModal(trip)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDuplicateTrip(trip);
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Duplicate</span>
                                  </button>
                                  {trip.customerPhone && trip.status !== 'cancelled' && trip.status !== 'no-show' && (
                                    <button
                                      onClick={() => handleSendManualReminder(trip)}
                                      className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                                      title="Send SMS reminder to patient"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      <span>Send SMS Reminder</span>
                                    </button>
                                  )}
                                  {trip.status === 'completed' && (
                                    <button
                                      onClick={() => {
                                        setPlaybackTrip(trip);
                                        setShowPlaybackViewer(true);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                    >
                                      <Play className="w-4 h-4" />
                                      <span>View History</span>
                                    </button>
                                  )}
                                  {trip.status !== 'cancelled' && trip.status !== 'no-show' && (
                                    <>
                                      {trip.status !== 'completed' && (
                                        <button
                                          onClick={() => handleCompleteTrip(trip.id)}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          Complete
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleCancelTrip(trip.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleNoShow(trip.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        No-Show
                                      </button>
                                    </>
                                  )}
                                  {(trip.status === 'cancelled' || trip.status === 'no-show' || trip.status === 'completed') && (
                                    <button
                                      onClick={() => handleReinstateTrip(trip.id)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Reinstate
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTrips.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No trips found</p>
            <p className="text-sm">Create a new trip to get started</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTrip ? 'Edit Trip' : 'Create New Trip'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rider & Payer Section - Redesigned Flow */}
          <CollapsibleSection
            title="Rider Details"
            icon={<User className="w-5 h-5" />}
            colorClass="bg-blue-50 border-blue-200 text-blue-800"
            defaultOpen={true}
          >
            <div className="space-y-6">
              {/* Toggle Mode */}
              <div className="flex p-1 bg-gray-100 rounded-lg w-full max-w-sm mb-4">
                <button
                  type="button"
                  onClick={() => setRiderMode('search')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${riderMode === 'search'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Search Existing
                </button>
                <button
                  type="button"
                  onClick={() => setRiderMode('new')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${riderMode === 'new'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    New Rider
                  </span>
                </button>
              </div>

              {riderMode === 'search' ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <RiderAutocomplete
                    trips={trips}
                    onSelect={(rider) => {
                      setFormData(prev => ({
                        ...prev,
                        firstName: rider.firstName,
                        lastName: rider.lastName,
                        customerName: rider.customerName,
                        customerPhone: rider.customerPhone,
                        customerEmail: '',
                        pickupLocation: rider.pickupLocation || prev.pickupLocation,
                        dropoffLocation: rider.dropoffLocation || prev.dropoffLocation,
                        serviceLevel: rider.serviceLevel || prev.serviceLevel,
                        notes: rider.notes || prev.notes,
                        patientId: rider.id || '',
                      }));
                    }}
                  />

                  {/* Editable confirmation fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        required
                        value={formData.customerPhone}
                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Simplified New Rider Form - Only essential fields */}
                  
                  {/* Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* DOB and Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={patientForm.dateOfBirth}
                        onChange={e => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        required
                        value={formData.customerPhone}
                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Account Number and Level of Service */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={patientForm.accountNumber}
                        onChange={e => setPatientForm({ ...patientForm, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Level of Service</label>
                      <select
                        value={patientForm.defaultLevelOfService}
                        onChange={e => setPatientForm({ ...patientForm, defaultLevelOfService: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Level</option>
                        <option value="ambulatory">Ambulatory</option>
                        <option value="wheelchair">Wheelchair</option>
                        <option value="stretcher">Stretcher</option>
                      </select>
                    </div>
                  </div>

                  {/* Rider Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Rider Notes</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter any notes about this rider..."
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Schedule & Service Section */}
          <CollapsibleSection
            title="Schedule & Service"
            icon={<Clock className="w-5 h-5" />}
            colorClass="bg-green-50 border-green-200 text-green-800"
            defaultOpen={true}
          >
            <div className="space-y-6">
              {/* Trip Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {['one-way', 'roundtrip', 'multi-stop', 'recurring'].map((type) => (
                    <label key={type} className={`
                      flex-1 relative flex items-center justify-center px-4 py-3 cursor-pointer rounded-lg border-2 transition-all
                      ${formData.journeyType === type
                        ? 'border-green-600 bg-green-50 text-green-800 font-bold'
                        : 'border-gray-200 hover:border-green-200 text-gray-600'}
                    `}>
                      <input
                        type="radio"
                        name="journeyType"
                        value={type}
                        checked={formData.journeyType === type}
                        onChange={e => setFormData({ ...formData, journeyType: e.target.value as Trip['journeyType'] })}
                        className="sr-only"
                      />
                      <span className="capitalize">{type.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Row 1: Contractor, Assistance, Classification, Clinic Code */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.contractorId}
                    onChange={e => setFormData({ ...formData, contractorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="">Select Client Account</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assistance Level
                  </label>
                  <select
                    value={formData.levelOfAssistance}
                    onChange={e => setFormData({ ...formData, levelOfAssistance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="">Select Level</option>
                    <option value="door-to-door">Door-to-Door</option>
                    <option value="curb-to-curb">Curb-to-Curb</option>
                    <option value="hand-to-hand">Hand-to-Hand</option>
                    <option value="bed-to-bed">Bed-to-Bed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trip Classification
                  </label>
                  <select
                    value={formData.classification}
                    onChange={e => setFormData({ ...formData, classification: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="">Select classification</option>
                    <option value="discharge">Discharge</option>
                    <option value="dialysis">Dialysis</option>
                    <option value="appointment">Doctor Appointment</option>
                    <option value="transfer">Facility Transfer</option>
                    <option value="child & family">Child & Family</option>
                    <option value="rapp">RAPP</option>
                    <option value="bh">BH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facility Code
                  </label>
                  <input
                    type="text"
                    value={formData.clinicNote || ''} // Using clinicNote as temporary field for Facility Code
                    onChange={e => setFormData({ ...formData, clinicNote: e.target.value })}
                    placeholder="4-digit number"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-blue-500/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all hover:bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Level of Service, Date, Times */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Level of Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.serviceLevel}
                    onChange={e => setFormData({ ...formData, serviceLevel: e.target.value as Trip['serviceLevel'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="ambulatory">Ambulatory</option>
                    <option value="wheelchair">Wheelchair</option>
                    <option value="stretcher">Stretcher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trip Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={e => {
                      const newDate = e.target.value;
                      setFormData({ ...formData, scheduledDate: newDate });
                      if (formData.scheduledPickupTime) {
                        setFormData(prev => ({
                          ...prev,
                          scheduledDate: newDate,
                          scheduledTime: `${newDate}T${prev.scheduledPickupTime}`
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Appointment Time
                  </label>
                  <input
                    type="time"
                    value={formData.appointmentTime ? new Date(formData.appointmentTime).toTimeString().slice(0, 5) : ''}
                    onChange={e => {
                      const timeValue = e.target.value;
                      if (formData.scheduledDate) {
                        setFormData({ ...formData, appointmentTime: `${formData.scheduledDate}T${timeValue}` });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scheduled Pickup <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledPickupTime}
                    onChange={e => {
                      const timeValue = e.target.value;
                      setFormData({ ...formData, scheduledPickupTime: timeValue });
                      if (formData.scheduledDate) {
                        setFormData(prev => ({
                          ...prev,
                          scheduledPickupTime: timeValue,
                          scheduledTime: `${prev.scheduledDate}T${timeValue}`
                        }));
                      }
                    }}
                    disabled={formData.willCall && formData.journeyType === 'one-way'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {formData.journeyType === 'one-way' && (
                    <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.willCall}
                        onChange={e => setFormData({ ...formData, willCall: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Will Call</span>
                    </label>
                  )}
                </div>
              </div>

              {formData.journeyType === 'recurring' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
                  <h4 className="font-semibold text-gray-800 mb-4">Recurring Trip Settings</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Days</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const days = recurringDays || [];
                              const newDays = days.includes(day)
                                ? days.filter(d => d !== day)
                                : [...days, day];
                              setRecurringDays(newDays);
                            }}
                            className={`
                              w-10 h-10 rounded-full text-xs font-semibold transition-all
                              ${recurringDays.includes(day)
                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}
                            `}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={recurringEndDate}
                        onChange={e => setRecurringEndDate(e.target.value)}
                        min={formData.scheduledDate}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>


          </CollapsibleSection>

          {/* Pickup & Drop-Off Section - Side by Side */}
          <CollapsibleSection
            title="Route & Stops"
            icon={<MapPin className="w-5 h-5" />}
            colorClass="bg-purple-50 border-purple-200 text-purple-800"
            defaultOpen={true}
          >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Vertical Line Divider (Desktop only) */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-purple-200" />

              {/* LEFT: PICKUP */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-100">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">A</div>
                  <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Pickup Location
                  </label>
                </div>

                <AddressAutocomplete
                  key="pickup-address"
                  label=""
                  value={formData.pickupLocation}
                  onChange={(value) => setFormData(prev => ({ ...prev, pickupLocation: value }))}
                  placeholder="Enter pickup address"
                  required
                  icon={<MapPin className="w-5 h-5 text-green-600" />}
                />
              </div>

              {/* RIGHT: DROPOFF */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">B</div>
                  <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Drop-off Location
                  </label>
                </div>

                <AddressAutocomplete
                  key="dropoff-address"
                  label=""
                  value={formData.dropoffLocation}
                  onChange={(value) => setFormData(prev => ({ ...prev, dropoffLocation: value }))}
                  placeholder="Enter dropoff address"
                  required
                  icon={<Navigation className="w-5 h-5 text-red-600" />}
                />
              </div>
            </div>

            {formData.journeyType === 'roundtrip' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Trip Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Return Time
                      {formData.willCall && <span className="text-sm text-gray-500 ml-2">(Disabled - Will Call selected)</span>}
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.returnTime}
                      onChange={e => setFormData({ ...formData, returnTime: e.target.value })}
                      disabled={formData.willCall}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.willCall}
                        onChange={e => setFormData({ ...formData, willCall: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Will Call?</span>
                    </label>
                    <div className="ml-2 group relative">
                      <span className="text-gray-400 text-sm cursor-help">ⓘ</span>
                      <div className="hidden group-hover:block absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                        Return time will be determined by patient when ready for pickup
                      </div>
                    </div>
                  </div>
                </div>

                <AddressAutocomplete
                  key="return-pickup-address"
                  label="Return Pickup Address"
                  value={formData.returnPickupLocation}
                  onChange={(value) => setFormData(prev => ({ ...prev, returnPickupLocation: value }))}
                  placeholder="Enter return pickup address"
                  icon={<MapPin className="w-5 h-5" />}
                />

                <div className="mt-4">
                  <AddressAutocomplete
                    key="return-dropoff-address"
                    label="Return Drop-off Address"
                    value={formData.returnDropoffLocation}
                    onChange={(value) => setFormData(prev => ({ ...prev, returnDropoffLocation: value }))}
                    placeholder="Enter return dropoff address"
                    icon={<Navigation className="w-5 h-5" />}
                  />
                </div>
              </div>
            )}

            {formData.journeyType === 'multi-stop' && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Trips</h3>
                  <button
                    type="button"
                    onClick={() => setAdditionalStops([...additionalStops, { pickupLocation: '', dropoffLocation: '' }])}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Stop</span>
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  The first trip uses the Pickup and Drop-off locations above. Add additional stops below - each stop has its own pickup and drop-off.
                </p>

                {additionalStops.map((stop, index) => (
                  <div key={index} className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 2}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900">Stop {index + 2}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdditionalStops(additionalStops.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AddressAutocomplete
                        label="Pickup Location"
                        value={stop.pickupLocation}
                        onChange={(value) => {
                          const updated = [...additionalStops];
                          updated[index].pickupLocation = value;
                          setAdditionalStops(updated);
                        }}
                        placeholder="Enter pickup address"
                        required
                        icon={<MapPin className="w-5 h-5" />}
                      />
                      <AddressAutocomplete
                        label="Drop-off Location"
                        value={stop.dropoffLocation}
                        onChange={(value) => {
                          const updated = [...additionalStops];
                          updated[index].dropoffLocation = value;
                          setAdditionalStops(updated);
                        }}
                        placeholder="Enter drop-off address"
                        required
                        icon={<Navigation className="w-5 h-5" />}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editingTrip && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Actual Pickup Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.actualPickupTime}
                    onChange={e => setFormData({ ...formData, actualPickupTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Actual Dropoff Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.actualDropoffTime}
                    onChange={e => setFormData({ ...formData, actualDropoffTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

          </CollapsibleSection>
          <CollapsibleSection
            title="Mileage & Notes"
            icon={<Car className="w-5 h-5" />}
            colorClass="bg-yellow-50 border-yellow-200 text-yellow-800"
            defaultOpen={true}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Total Miles</h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => calculateMileage(false)}
                    disabled={isCalculatingMileage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                  >
                    <Navigation className={`w-4 h-4 ${isCalculatingMileage ? 'animate-spin' : ''}`} />
                    <span>{isCalculatingMileage ? 'Calculating...' : 'Calculate Mileage'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, distance: '' });
                      setMileageBreakdown(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-lg"
                  >
                    Manual
                  </button>
                </div>
              </div>

              {mileageBreakdown && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Outbound:</span>
                      <span className="font-semibold">{mileageBreakdown.leg1} mi</span>
                    </div>
                    {mileageBreakdown.leg2 && (
                      <div className="flex justify-between">
                        <span>Return:</span>
                        <span className="font-semibold">{mileageBreakdown.leg2} mi</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-300 font-bold">
                      <span>Total:</span>
                      <span>{formData.distance} mi</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.distance}
                    onChange={e => setFormData({ ...formData, distance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    placeholder="Miles"
                    readOnly={mileageBreakdown !== null}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Enter any trip or passenger information here..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Trip History Section (only for editing existing trips) */}
          {editingTrip && (
            <CollapsibleSection
              title="Trip History"
              icon={<Clock className="w-5 h-5" />}
              colorClass="bg-gray-50 border-gray-200 text-gray-800"
              defaultOpen={true}
            >
              <TripHistory
                tripId={editingTrip.id}
                createdAt={editingTrip.createdAt}
                createdBy={editingTrip.createdBy}
                updatedAt={editingTrip.updatedAt}
                dispatcherName={editingTrip.dispatcherName || user?.fullName}
              />

              {editingTrip.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Trip Notes</h4>
                  <p className="text-sm text-gray-700">{editingTrip.notes}</p>
                </div>
              )}
            </CollapsibleSection>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {editingTrip ? 'Update Trip' : 'Create Trip'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedTripId(null);
        }}
        title={safeSelectedTrips.size > 0 ? `Assign Driver (${safeSelectedTrips.size} trips)` : "Assign Driver"}
        size="lg"
      >
        {selectedTripId && !showDispatchSuggestions && (
          <button
            onClick={() => setShowDispatchSuggestions(true)}
            className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-semibold flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            Show AI Dispatch Suggestions
          </button>
        )}

        {selectedTripId && showDispatchSuggestions && (
          <div className="mb-4">
            <DispatchSuggestions
              trip={trips.find(t => t.id === selectedTripId)!}
              drivers={drivers}
              allTrips={trips}
              onSelectDriver={(driverId) => {
                assignDriver(selectedTripId, driverId);
                setIsAssignModalOpen(false);
                setSelectedTripId(null);
                setShowDispatchSuggestions(false);
              }}
            />
            <button
              onClick={() => setShowDispatchSuggestions(false)}
              className="mt-3 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Show All Drivers
            </button>
          </div>
        )}

        {!showDispatchSuggestions && (
          <div className="space-y-3">
            {drivers
              .filter(driver => driver.isActive)
              .sort((a, b) => {
                // Sort available drivers first
                if (a.status === 'available' && b.status !== 'available') return -1;
                if (a.status !== 'available' && b.status === 'available') return 1;
                return 0;
              })
              .map(driver => (
                <button
                  key={driver.id}
                  onClick={() => {
                    if (safeSelectedTrips.size > 0) {
                      handleBulkAssignDriver(driver.id);
                    } else if (selectedTripId) {
                      assignDriver(selectedTripId, driver.id);
                      setIsAssignModalOpen(false);
                      setSelectedTripId(null);
                    }
                  }}
                  disabled={driver.status === 'off_duty'}
                  className={`w-full p-4 border rounded-lg transition-colors text-left ${driver.status === 'off_duty'
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {driver.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{driver.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{driver.totalTrips || 0} trips</span>
                          <span>•</span>
                          <span className="text-amber-600">★ {(driver.rating || 5.0).toFixed(1)}</span>
                        </div>
                        {(() => {
                          const stats = getDriverDailyStats(driver.id);
                          return (
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                              <span className="font-medium">Today:</span>
                              <span>{stats.tripsCompleted}/{stats.totalTrips} trips</span>
                              <span>•</span>
                              <span>{stats.miles} mi</span>
                              {stats.hours > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{stats.hours}h</span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <StatusBadge status={driver.status} size="sm" />
                  </div>
                </button>
              ))}

            {drivers.filter(driver => driver.isActive).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No drivers available</p>
                <p className="text-sm mt-2">Add drivers in the Driver Management section</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellationNote('');
          setSelectedTripId(null);
        }}
        title={safeSelectedTrips.size > 1 ? `Cancel ${safeSelectedTrips.size} Trips` : "Cancel Trip"}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {safeSelectedTrips.size > 1
              ? `Please provide a reason for cancelling these ${safeSelectedTrips.size} trips:`
              : 'Please provide a reason for cancelling this trip:'
            }
          </p>
          <textarea
            value={cancellationNote}
            onChange={(e) => setCancellationNote(e.target.value)}
            placeholder="Enter cancellation reason..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirmCancel}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Confirm Cancellation
            </button>
            <button
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancellationNote('');
                setSelectedTripId(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isNoShowModalOpen}
        onClose={() => {
          setIsNoShowModalOpen(false);
          setNoShowNote('');
          setSelectedTripId(null);
        }}
        title={safeSelectedTrips.size > 1 ? `Mark ${safeSelectedTrips.size} Trips as No-Show` : "Mark as No-Show"}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {safeSelectedTrips.size > 1
              ? `Please provide details about the no-show for these ${safeSelectedTrips.size} trips:`
              : 'Please provide details about the no-show:'
            }
          </p>
          <textarea
            value={noShowNote}
            onChange={(e) => setNoShowNote(e.target.value)}
            placeholder="Enter no-show details (e.g., patient not at location, couldn't be contacted, etc.)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirmNoShow}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Confirm No-Show
            </button>
            <button
              onClick={() => {
                setIsNoShowModalOpen(false);
                setNoShowNote('');
                setSelectedTripId(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Patient History Modal */}
      <PatientHistory
        patientName={patientHistoryModal.patientName}
        patientPhone={patientHistoryModal.patientPhone}
        trips={trips}
        isOpen={patientHistoryModal.isOpen}
        onClose={() => setPatientHistoryModal({ isOpen: false, patientName: '' })}
      />

      {/* Manual Completion Modal */}
      <ManualCompletionModal
        isOpen={manualCompletionModal.isOpen}
        onClose={() => setManualCompletionModal({ isOpen: false, tripId: '', tripNumber: '', isBulk: false })}
        onConfirm={handleManualCompletionConfirm}
        tripNumber={manualCompletionModal.tripNumber}
        isBulk={manualCompletionModal.isBulk}
        tripCount={manualCompletionModal.isBulk ? safeSelectedTrips.size : 1}
      />

      {/* Toast Notification */}
      {
        toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )
      }

      {/* Trip Playback Viewer */}
      <TripPlaybackViewer
        isOpen={showPlaybackViewer}
        onClose={() => {
          setShowPlaybackViewer(false);
          setPlaybackTrip(null);
        }}
        trip={playbackTrip}
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
          setImportErrors([]);
        }}
        title="Import Trips"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Upload an Excel (.xlsx) or CSV file to bulk import trips. Download the template to see the required format.
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {importErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Errors Found:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {importErrors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {importErrors.length > 10 && (
                  <li className="text-red-600 font-medium">
                    ... and {importErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {importPreview.length > 0 && importErrors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">
                Preview: {importPreview.length} trips ready to import
              </h4>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-green-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Patient</th>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Time</th>
                      <th className="px-2 py-1 text-left">Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 20).map((row, index) => (
                      <tr key={index} className="border-t border-green-200">
                        <td className="px-2 py-1">{row['Patient Name'] || row['Rider Name']}</td>
                        <td className="px-2 py-1">{row['Pickup Date'] || row['Date']}</td>
                        <td className="px-2 py-1">{row['Pickup Time'] || row['Time']}</td>
                        <td className="px-2 py-1">{row['Service Level'] || row['Service Type']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.length > 20 && (
                  <p className="text-xs text-green-700 mt-2 text-center">
                    ... and {importPreview.length - 20} more trips
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportErrors([]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importPreview.length === 0 || importErrors.length > 0 || isProcessingImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessingImport ? 'Importing...' : 'Import Trips'}
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
};
