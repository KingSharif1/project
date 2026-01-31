import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Driver, Trip, DashboardStats, Clinic, Patient, Facility, TripSource, AddFacilityData } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { parseAddress } from '../utils/addressParser';
import { logAudit } from '../utils/auditLog';
import { generateTripNumber } from '../utils/tripNumberGenerator';
import * as api from '../services/api';


interface AppContextType {
  drivers: Driver[];
  trips: Trip[];
  patients: Patient[];
  clinics: Clinic[];
  dashboardStats: DashboardStats;
  addDriver: (driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'totalTrips' | 'rating'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  assignDriver: (tripId: string, driverId: string) => void;
  reinstateTrip: (tripId: string) => void;
  addClinic: (clinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClinic: (id: string, updates: Partial<Clinic>) => void;
  deleteClinic: (id: string) => void;
  // Facilities
  facilities: Facility[];
  addFacility: (facility: AddFacilityData) => void;
  updateFacility: (id: string, updates: Partial<Facility>) => void;
  deleteFacility: (id: string) => void;
  // Trip Sources
  tripSources: TripSource[];
  // Patients
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [tripSources, setTripSources] = useState<TripSource[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // All dispatchers can see all drivers (drivers are shared across facilities)
  const drivers = allDrivers;
  // Dispatchers only see trips for their facility - memoized to prevent infinite re-renders
  const trips = useMemo(() => {
    return isAdmin ? allTrips : allTrips.filter(t => t.clinicId === user?.clinicId);
  }, [isAdmin, allTrips, user?.clinicId]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todaysTrips: 0,
    activeDrivers: 0,
    completedToday: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load all data via backend API
      const [
        driversRes,
        tripsRes,
        clinicsRes,
        patientsRes,
        facilitiesRes,
        tripSourcesRes
      ] = await Promise.all([
        api.getDrivers().catch(() => ({ data: [] })),
        api.getTrips().catch(() => ({ data: [] })),
        api.getClinics().catch(() => ({ data: [] })),
        api.getPatients().catch(() => ({ data: [] })),
        api.getFacilities().catch(() => ({ data: [] })),
        // Trip sources still from Supabase for now (no API route yet)
        supabase.from('trip_sources').select('*').order('created_at', { ascending: false })
      ]);

      // Set drivers from API response
      setAllDrivers(driversRes.data || []);

      // Set trips from API response
      setAllTrips(tripsRes.data || []);

      // Set clinics from API response
      setClinics(clinicsRes.data || []);

      // Set patients from API response
      setPatients(patientsRes.data || []);

      // Set facilities from API response
      setFacilities(facilitiesRes.data || []);

      // Process trip sources (still from Supabase)
      const tripSourcesResult = tripSourcesRes as any;
      const { data: tripSourcesData, error: tripSourcesError } = tripSourcesResult;
      if (tripSourcesError) {
        console.error('Error loading trip sources:', tripSourcesError);
        setTripSources([]);
      } else {
        const formattedTripSources = (tripSourcesData || []).map((source: any) => ({
          id: source.id,
          name: source.name,
          type: source.type,
          phone: source.phone,
          email: source.contact_email,
          contactEmail: source.contact_email,
          address: source.address,
          billingAddress: source.billing_address,
          clinicId: source.clinic_id,
          createdAt: source.created_at,
          updatedAt: source.updated_at,
        }));
        setTripSources(formattedTripSources);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setAllTrips([]);
      setAllDrivers([]);
      setClinics([]);
      setPatients([]);
      setFacilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTrips = trips.filter(trip => {
      const tripDate = new Date(trip.scheduledTime);
      tripDate.setHours(0, 0, 0, 0);
      return tripDate.getTime() === today.getTime();
    });

    const completedToday = todaysTrips.filter(trip => trip.status === 'completed').length;
    const activeDrivers = drivers.filter(driver => driver.status !== 'offline').length;
    const totalRevenue = todaysTrips
      .filter(trip => trip.status === 'completed')
      .reduce((sum, trip) => sum + trip.fare, 0);

    setDashboardStats({
      todaysTrips: todaysTrips.length,
      activeDrivers,
      completedToday,
      totalRevenue,
    });
  }, [trips, drivers]);

  const addDriver = async (driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'totalTrips' | 'rating'>) => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          name: driverData.name,
          first_name: driverData.firstName,
          last_name: driverData.lastName,
          date_of_birth: driverData.dateOfBirth,
          email: driverData.email,
          phone: driverData.phone,
          license_number: driverData.licenseNumber,
          license_expiry: driverData.licenseExpiry,
          certification_expiry: driverData.certificationExpiry,
          temporary_password: driverData.temporaryPassword,
          status: driverData.status || 'available',
          rating: 5.0,
          total_trips: 0,
          is_active: true,
          notes: driverData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newDriver: Driver = {
        id: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        dateOfBirth: data.date_of_birth,
        email: data.email || '',
        phone: data.phone,
        licenseNumber: data.license_number || '',
        licenseExpiry: data.license_expiry,
        certificationExpiry: data.certification_expiry,
        temporaryPassword: data.temporary_password,
        status: data.status,
        rating: Number(data.rating) || 5.0,
        totalTrips: data.total_trips || 0,
        ambulatoryRate: Number(data.ambulatory_rate) || 0,
        ambulatoryBaseMiles: Number(data.ambulatory_base_miles) || 0,
        ambulatoryAdditionalMileRate: Number(data.ambulatory_additional_mile_rate) || 0,
        wheelchairRate: Number(data.wheelchair_rate) || 0,
        wheelchairBaseMiles: Number(data.wheelchair_base_miles) || 0,
        wheelchairAdditionalMileRate: Number(data.wheelchair_additional_mile_rate) || 0,
        stretcherRate: Number(data.stretcher_rate) || 0,
        stretcherBaseMiles: Number(data.stretcher_base_miles) || 0,
        stretcherAdditionalMileRate: Number(data.stretcher_additional_mile_rate) || 0,
        isActive: data.is_active,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setAllDrivers(prev => [...prev, newDriver]);
    } catch (error) {
      console.error('Error adding driver:', error);
      alert('Failed to add driver. Please try again.');
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      await api.updateDriver(id, updates);

      setAllDrivers(prev =>
        prev.map(driver =>
          driver.id === id
            ? { ...driver, ...updates, updatedAt: new Date().toISOString() }
            : driver
        )
      );
    } catch (error: any) {
      console.error('Error updating driver:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to update driver: ${errorMessage}`);
      throw error;
    }
  };

  const deleteDriver = async (id: string) => {
    try {
      await api.deleteDriver(id);

      setAllDrivers(prev => prev.filter(driver => driver.id !== id));
      setAllTrips(prev =>
        prev.map(trip =>
          trip.driverId === id ? { ...trip, driverId: undefined, status: 'pending' as const } : trip
        )
      );
    } catch (error: any) {
      console.error('Error deleting driver:', error);
      alert(`Failed to delete driver: ${error?.message || 'Unknown error'}`);
    }
  };

  const addTrip = async (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Generate trip number with A/B suffix
      // Return trips get B suffix, all others get A suffix
      const isReturnTrip = tripData.isReturnTrip || false;
      const tripNumber = tripData.tripNumber || generateTripNumber(isReturnTrip);

      const pickupAddress = parseAddress(tripData.pickupLocation || '');
      const dropoffAddress = parseAddress(tripData.dropoffLocation || '');

      // Calculate fare from facility rates if not provided
      let calculatedFare = tripData.fare || 0;

      // Determine which ID to use for rate calculation
      const rateSourceId = tripData.facilityId || tripData.clinicId;

      if (rateSourceId && !tripData.fare) {
        // Check facilities first, then clinics
        let rateSource: any = facilities.find(f => f.id === rateSourceId);
        if (!rateSource) {
          rateSource = clinics.find(c => c.id === rateSourceId);
        }

        if (rateSource) {
          switch (tripData.serviceLevel) {
            case 'ambulatory':
              calculatedFare = rateSource.ambulatoryRate || 0;
              break;
            case 'wheelchair':
              calculatedFare = rateSource.wheelchairRate || 0;
              break;
            case 'stretcher':
              calculatedFare = rateSource.stretcherRate || 0;
              break;
          }
        }
      }

      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Only use user ID if it's a valid UUID, otherwise set to null
      const validUserId = isValidUUID(user?.id) ? user?.id : null;

      const dbTrip = {
        trip_number: tripNumber,
        patient_id: tripData.patientId || null,
        driver_id: tripData.driverId || null,
        vehicle_id: tripData.vehicleId || null,
        facility_id: tripData.facilityId || null,
        clinic_id: tripData.clinicId || null,
        passenger_first_name: tripData.firstName || null,
        passenger_last_name: tripData.lastName || null,
        passenger_phone: tripData.customerPhone || null,
        passenger_email: tripData.customerEmail || null,
        pickup_address: tripData.pickupLocation || pickupAddress.street || 'Unknown',
        pickup_city: tripData.pickupCity || pickupAddress.city || 'Unknown',
        pickup_state: tripData.pickupState || pickupAddress.state || 'TX',
        pickup_zip: tripData.pickupZip || pickupAddress.zip || '00000',
        dropoff_address: tripData.dropoffLocation || dropoffAddress.street || 'Unknown',
        dropoff_city: tripData.dropoffCity || dropoffAddress.city || 'Unknown',
        dropoff_state: tripData.dropoffState || dropoffAddress.state || 'TX',
        dropoff_zip: tripData.dropoffZip || dropoffAddress.zip || '00000',
        scheduled_pickup_time: tripData.willCall ? null : tripData.scheduledTime,
        scheduled_dropoff_time: tripData.scheduledDropoffTime || null,
        appointment_time: tripData.appointmentTime || null,
        actual_pickup_time: tripData.actualPickupTime || null,
        actual_dropoff_time: tripData.actualDropoffTime || null,
        trip_type: tripData.serviceLevel || 'ambulatory',
        service_level: tripData.serviceLevel || 'ambulatory',
        journey_type: tripData.journeyType || 'one-way',
        status: tripData.status || 'pending',
        distance_miles: tripData.distance || 0,
        wait_time_minutes: tripData.waitTimeMinutes || 0,
        rate: calculatedFare,
        wait_time_charge: tripData.waitTimeCharge || 0,
        total_charge: calculatedFare,
        driver_payout: tripData.driverPayout || 0,
        is_return_trip: tripData.isReturnTrip || false,
        linked_trip_id: tripData.linkedTripId || null,
        recurring_trip_id: tripData.recurringTripId || null,
        notes: tripData.notes || null,
        clinic_note: tripData.clinicNote || null,
        classification: tripData.classification || null,
        cancellation_reason: tripData.cancellationReason || null,
        created_by: validUserId,
        dispatcher_id: validUserId,
        dispatcher_name: user?.fullName || null,
        dispatcher_assigned_at: new Date().toISOString(),
        will_call: tripData.willCall || false,
        leg1_miles: tripData.leg1Miles || 0,
        leg1_miles: tripData.leg1Miles || 0,
        leg2_miles: tripData.leg2Miles || 0,
        trip_source_id: tripData.tripSourceId || null,
        level_of_assistance: tripData.levelOfAssistance || null,
      };

      const { data, error } = await supabase
        .from('trips')
        .insert(dbTrip)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        console.error('Trip data that failed:', dbTrip);

        if (error.message.includes('violates not-null constraint')) {
          const field = error.message.match(/column "(\w+)"/)?.[1];
          throw new Error(`Missing required field: ${field || 'unknown'}. Please fill in all required information.`);
        }

        if (error.message.includes('violates check constraint')) {
          throw new Error(`Invalid data: ${error.message}. Please check your input.`);
        }

        // Provide more detailed error message
        throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
      }

      const newTrip: Trip = {
        id: data.id,
        tripNumber: data.trip_number,
        patientId: data.patient_id,
        driverId: data.driver_id,
        vehicleId: data.vehicle_id,
        facilityId: data.facility_id,
        customerName: tripData.customerName,
        firstName: tripData.firstName,
        lastName: tripData.lastName,
        customerPhone: tripData.customerPhone,
        customerEmail: tripData.customerEmail,
        pickupLocation: data.pickup_address,
        pickupAddress: data.pickup_address,
        pickupCity: data.pickup_city,
        pickupState: data.pickup_state,
        pickupZip: data.pickup_zip,
        dropoffLocation: data.dropoff_address,
        dropoffAddress: data.dropoff_address,
        dropoffCity: data.dropoff_city,
        dropoffState: data.dropoff_state,
        dropoffZip: data.dropoff_zip,
        scheduledTime: data.scheduled_pickup_time,
        scheduledPickupTime: data.scheduled_pickup_time,
        scheduledDropoffTime: data.scheduled_dropoff_time,
        actualPickupTime: data.actual_pickup_time,
        actualDropoffTime: data.actual_dropoff_time,
        status: data.status as Trip['status'],
        tripType: tripData.tripType,
        journeyType: tripData.journeyType,
        serviceLevel: data.trip_type as Trip['serviceLevel'],
        fare: Number(data.total_charge) || 0,
        distance: Number(data.distance_miles) || 0,
        distanceMiles: Number(data.distance_miles) || 0,
        leg1Miles: Number(data.leg1_miles) || 0,
        leg2Miles: Number(data.leg2_miles) || 0,
        rate: Number(data.rate) || 0,
        totalCharge: Number(data.total_charge) || 0,
        driverPayout: Number(data.driver_payout) || 0,
        waitTimeMinutes: data.wait_time_minutes || 0,
        waitTimeCharge: Number(data.wait_time_charge) || 0,
        isReturnTrip: data.is_return_trip || false,
        linkedTripId: data.linked_trip_id,
        recurringTripId: data.recurring_trip_id,
        notes: data.notes,
        clinicNote: data.clinic_note,
        classification: data.classification,
        cancellationReason: data.cancellation_reason,
        levelOfAssistance: data.level_of_assistance,
        tripSourceId: data.trip_source_id,
        clinicId: data.clinic_id || '',
        createdBy: data.created_by,
        dispatcherId: data.dispatcher_id,
        dispatcherName: data.dispatcher_name,
        willCall: data.will_call || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      //console.log('Trip added successfully:', newTrip);
      //console.log('User clinicId:', user?.clinicId);
      //console.log('Trip clinicId:', newTrip.clinicId);
      //console.log('Trip facilityId:', newTrip.facilityId);
      //console.log('Is Admin:', isAdmin);
      //console.log('Current trips count before adding:', allTrips.length);
      setAllTrips(prev => {
        const updated = [newTrip, ...prev];
        //console.log('Updated trips count:', updated.length);
        //console.log('Filtered trips for user:', isAdmin ? updated.length : updated.filter(t => t.clinicId === user?.clinicId).length);
        return updated;
      });

      // Log trip creation to change history (non-blocking)
      try {
        // Only log if validUserId is a valid UUID
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (validUserId && UUID_REGEX.test(validUserId)) {
          await supabase.from('trip_change_history').insert({
            trip_id: newTrip.id,
            change_type: 'created',
            changed_by_id: validUserId,
            changed_by_name: user?.fullName || null,
            change_description: `Trip ${newTrip.tripNumber} created`,
          });
        }
      } catch (historyError) {
        //console.log('Could not log to change history:', historyError);
      }

      // Log to audit trail (non-blocking)
      try {
        await logAudit({
          userId: user?.id,
          clinicId: user?.clinicId,
          action: 'create',
          entityType: 'trip',
          entityId: newTrip.id,
          details: {
            tripNumber: newTrip.tripNumber,
            customerName: newTrip.customerName,
            pickupLocation: newTrip.pickupLocation,
            dropoffLocation: newTrip.dropoffLocation,
            scheduledTime: newTrip.scheduledTime,
          }
        });
      } catch (auditError) {
        //console.log('Could not log to audit trail:', auditError);
      }

      // Schedule automated reminders for the trip
      if (newTrip.patientId && newTrip.scheduledTime) {
        try {
          const { scheduleRemindersForTrip } = await import('../utils/reminderService');

          // Get patient reminder preferences
          const { data: preferences } = await supabase
            .from('patient_reminder_preferences')
            .select('*')
            .eq('patient_id', newTrip.patientId)
            .maybeSingle();

          const reminderSettings = preferences ? {
            enabled: preferences.enabled,
            smsEnabled: preferences.sms_enabled,
            emailEnabled: preferences.email_enabled,
            reminderTimes: preferences.reminder_times || [24, 2, 0.5],
            includeDriverInfo: preferences.include_driver_info,
            includeTrackingLink: preferences.include_tracking_link,
          } : undefined;

          await scheduleRemindersForTrip(newTrip, reminderSettings);
          //console.log('Reminders scheduled for trip:', newTrip.tripNumber);
        } catch (reminderError) {
          console.error('Error scheduling reminders:', reminderError);
          // Don't fail the trip creation if reminders fail
        }
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      const message = error instanceof Error ? error.message : 'Failed to add trip. Please try again.';
      alert(message);
    }
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    try {
      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const validUserId = isValidUUID(user?.id) ? user?.id : null;

      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
        last_modified_by_id: validUserId,
        last_modified_by_name: user?.fullName || null,
      };

      // Basic passenger info
      if (updates.firstName !== undefined) dbUpdates.passenger_first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.passenger_last_name = updates.lastName;
      if (updates.customerPhone !== undefined) dbUpdates.passenger_phone = updates.customerPhone;
      if (updates.customerEmail !== undefined) dbUpdates.passenger_email = updates.customerEmail;

      // Trip identifiers
      // NEVER update trip_number - it's set once during creation and should never change
      // if (updates.tripNumber !== undefined) dbUpdates.trip_number = updates.tripNumber;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.driverId !== undefined) dbUpdates.driver_id = updates.driverId;
      if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
      if (updates.facilityId !== undefined) dbUpdates.facility_id = updates.facilityId;
      if (updates.clinicId !== undefined) dbUpdates.clinic_id = updates.clinicId;

      // Trip details
      if (updates.tripType !== undefined) dbUpdates.trip_type = updates.tripType;
      if (updates.serviceLevel !== undefined) {
        dbUpdates.service_level = updates.serviceLevel;
        dbUpdates.trip_type = updates.serviceLevel; // Keep both in sync
      }
      if (updates.journeyType !== undefined) dbUpdates.journey_type = updates.journeyType;
      // Location data - handle both full address and parsed components
      if (updates.pickupLocation !== undefined) {
        dbUpdates.pickup_address = updates.pickupLocation;
        // Parse if it's a full address string
        if (updates.pickupLocation && !updates.pickupAddress) {
          const parsed = parseAddress(updates.pickupLocation);
          dbUpdates.pickup_city = parsed.city;
          dbUpdates.pickup_state = parsed.state;
          dbUpdates.pickup_zip = parsed.zip;
        }
      }
      if (updates.pickupAddress !== undefined) dbUpdates.pickup_address = updates.pickupAddress;
      if (updates.pickupCity !== undefined) dbUpdates.pickup_city = updates.pickupCity;
      if (updates.pickupState !== undefined) dbUpdates.pickup_state = updates.pickupState;
      if (updates.pickupZip !== undefined) dbUpdates.pickup_zip = updates.pickupZip;

      if (updates.dropoffLocation !== undefined) {
        dbUpdates.dropoff_address = updates.dropoffLocation;
        // Parse if it's a full address string
        if (updates.dropoffLocation && !updates.dropoffAddress) {
          const parsed = parseAddress(updates.dropoffLocation);
          dbUpdates.dropoff_city = parsed.city;
          dbUpdates.dropoff_state = parsed.state;
          dbUpdates.dropoff_zip = parsed.zip;
        }
      }
      if (updates.dropoffAddress !== undefined) dbUpdates.dropoff_address = updates.dropoffAddress;
      if (updates.dropoffCity !== undefined) dbUpdates.dropoff_city = updates.dropoffCity;
      if (updates.dropoffState !== undefined) dbUpdates.dropoff_state = updates.dropoffState;
      if (updates.dropoffZip !== undefined) dbUpdates.dropoff_zip = updates.dropoffZip;

      // Time fields
      if (updates.scheduledTime !== undefined) dbUpdates.scheduled_pickup_time = updates.scheduledTime;
      if (updates.appointmentTime !== undefined) dbUpdates.appointment_time = updates.appointmentTime;
      if (updates.scheduledPickupTime !== undefined) dbUpdates.scheduled_pickup_time = updates.scheduledPickupTime;
      if (updates.scheduledDropoffTime !== undefined) dbUpdates.scheduled_dropoff_time = updates.scheduledDropoffTime;
      if (updates.actualPickupTime !== undefined) {
        dbUpdates.actual_pickup_time = updates.actualPickupTime;
        dbUpdates.actual_pickup_at = updates.actualPickupTime;
      }
      if (updates.actualDropoffTime !== undefined) {
        dbUpdates.actual_dropoff_time = updates.actualDropoffTime;
        dbUpdates.actual_dropoff_at = updates.actualDropoffTime;
      }
      if (updates.cancelledAt !== undefined) dbUpdates.cancelled_at = updates.cancelledAt;

      // Financial fields
      if (updates.fare !== undefined) {
        dbUpdates.rate = updates.fare;
        dbUpdates.total_charge = updates.fare; // Keep total_charge in sync with fare
      }
      if (updates.distance !== undefined) dbUpdates.distance_miles = updates.distance;
      if (updates.distanceMiles !== undefined) dbUpdates.distance_miles = updates.distanceMiles;
      if (updates.leg1Miles !== undefined) dbUpdates.leg1_miles = updates.leg1Miles;
      if (updates.leg2Miles !== undefined) dbUpdates.leg2_miles = updates.leg2Miles;
      if (updates.waitTimeMinutes !== undefined) dbUpdates.wait_time_minutes = updates.waitTimeMinutes;
      if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
      if (updates.waitTimeCharge !== undefined) dbUpdates.wait_time_charge = updates.waitTimeCharge;
      if (updates.totalCharge !== undefined) dbUpdates.total_charge = updates.totalCharge;
      if (updates.driverPayout !== undefined) dbUpdates.driver_payout = updates.driverPayout;

      // Other fields
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.clinicNote !== undefined) dbUpdates.clinic_note = updates.clinicNote;
      if (updates.classification !== undefined) dbUpdates.classification = updates.classification;
      if (updates.cancellationReason !== undefined) dbUpdates.cancellation_reason = updates.cancellationReason;
      if (updates.isReturnTrip !== undefined) dbUpdates.is_return_trip = updates.isReturnTrip;
      if (updates.isReturnTrip !== undefined) dbUpdates.is_return_trip = updates.isReturnTrip;
      if (updates.willCall !== undefined) dbUpdates.will_call = updates.willCall;
      if (updates.tripSourceId !== undefined) dbUpdates.trip_source_id = updates.tripSourceId;
      if (updates.levelOfAssistance !== undefined) dbUpdates.level_of_assistance = updates.levelOfAssistance;

      //console.log('Updating trip with ID:', id);
      //console.log('DB Updates:', dbUpdates);

      const { data: updatedTripData, error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw new Error(error.message || 'Failed to update trip in database');
      }

      //console.log('Trip updated successfully in database:', updatedTripData);

      // Get old trip for comparison
      const oldTrip = allTrips.find(t => t.id === id);

      // Log status history if status changed
      if (updates.status && oldTrip && oldTrip.status !== updates.status) {
        await supabase.from('trip_status_history').insert({
          trip_id: id,
          old_status: oldTrip.status,
          new_status: updates.status,
          changed_by_id: validUserId,
          changed_by_name: user?.fullName || null,
          reason: updates.cancellationReason || null,
        });

        // Also log to change history
        await supabase.from('trip_change_history').insert({
          trip_id: id,
          change_type: 'status_changed',
          field_name: 'status',
          old_value: oldTrip.status,
          new_value: updates.status,
          changed_by_id: validUserId,
          changed_by_name: user?.fullName || null,
        });
      }

      // Log driver assignment changes
      if (updates.driverId !== undefined && oldTrip && oldTrip.driverId !== updates.driverId) {
        const changeType = oldTrip.driverId ? 'driver_reassigned' : 'driver_assigned';
        await supabase.from('trip_change_history').insert({
          trip_id: id,
          change_type: changeType,
          field_name: 'driver_id',
          old_value: oldTrip.driverId || 'None',
          new_value: updates.driverId || 'None',
          changed_by_id: validUserId,
          changed_by_name: user?.fullName || null,
        });
      }

      // Log ALL field changes (comprehensive tracking)
      if (oldTrip) {
        const allFields = [
          { key: 'scheduledTime', label: 'Scheduled Time' },
          { key: 'scheduledPickupTime', label: 'Scheduled Pickup Time' },
          { key: 'scheduledDropoffTime', label: 'Scheduled Dropoff Time' },
          { key: 'appointmentTime', label: 'Appointment Time' },
          { key: 'actualPickupTime', label: 'Actual Pickup Time' },
          { key: 'actualDropoffTime', label: 'Actual Dropoff Time' },
          { key: 'pickupLocation', label: 'Pickup Location' },
          { key: 'pickupAddress', label: 'Pickup Address' },
          { key: 'pickupCity', label: 'Pickup City' },
          { key: 'pickupState', label: 'Pickup State' },
          { key: 'pickupZip', label: 'Pickup ZIP' },
          { key: 'dropoffLocation', label: 'Dropoff Location' },
          { key: 'dropoffAddress', label: 'Dropoff Address' },
          { key: 'dropoffCity', label: 'Dropoff City' },
          { key: 'dropoffState', label: 'Dropoff State' },
          { key: 'dropoffZip', label: 'Dropoff ZIP' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'customerPhone', label: 'Phone' },
          { key: 'customerEmail', label: 'Email' },
          { key: 'fare', label: 'Fare' },
          { key: 'distance', label: 'Distance' },
          { key: 'distanceMiles', label: 'Distance Miles' },
          { key: 'leg1Miles', label: 'Leg 1 Miles' },
          { key: 'leg2Miles', label: 'Leg 2 Miles' },
          { key: 'serviceLevel', label: 'Service Level' },
          { key: 'journeyType', label: 'Journey Type' },
          { key: 'tripType', label: 'Trip Type' },
          { key: 'waitTimeMinutes', label: 'Wait Time (minutes)' },
          { key: 'waitTimeCharge', label: 'Wait Time Charge' },
          { key: 'notes', label: 'Notes' },
          { key: 'clinicNote', label: 'Clinic Code' },
          { key: 'classification', label: 'Classification' },
          { key: 'vehicleId', label: 'Vehicle' },
          { key: 'facilityId', label: 'Facility' },
          { key: 'willCall', label: 'Will Call' },
          { key: 'isReturnTrip', label: 'Is Return Trip' },
        ];

        for (const field of allFields) {
          const oldValue = (oldTrip as any)[field.key];
          const newValue = (updates as any)[field.key];

          if (newValue !== undefined && oldValue !== newValue) {
            await supabase.from('trip_change_history').insert({
              trip_id: id,
              change_type: 'field_updated',
              field_name: field.key,
              old_value: String(oldValue || ''),
              new_value: String(newValue || ''),
              changed_by_id: validUserId,
              changed_by_name: user?.fullName || null,
              change_description: `${field.label} updated`,
            });
          }
        }
      }

      // Check if this is an outbound trip (A trip) and if we need to update the return trip (B trip)
      const currentTrip = allTrips.find(t => t.id === id);
      if (currentTrip?.tripNumber && currentTrip.tripNumber.toUpperCase().endsWith('A')) {
        // This is an outbound trip, check if there's a return trip
        const baseTripNumber = currentTrip.tripNumber.slice(0, -1);
        const returnTripNumber = `${baseTripNumber}B`;
        const returnTrip = allTrips.find(t => t.tripNumber === returnTripNumber);

        if (returnTrip) {
          //console.log('Found return trip to update:', returnTripNumber);

          // Prepare updates for return trip
          const returnTripUpdates: any = {
            updated_at: new Date().toISOString(),
            last_modified_by_id: validUserId,
            last_modified_by_name: user?.fullName || null,
          };

          // Update date/time fields for return trip
          if (updates.scheduledTime !== undefined || updates.scheduledPickupTime !== undefined) {
            const scheduledTime = updates.scheduledTime || updates.scheduledPickupTime;
            if (scheduledTime) {
              // Keep the same time for return trip
              returnTripUpdates.scheduled_pickup_time = scheduledTime;
            }
          }

          // Update passenger info
          if (updates.firstName !== undefined) returnTripUpdates.passenger_first_name = updates.firstName;
          if (updates.lastName !== undefined) returnTripUpdates.passenger_last_name = updates.lastName;
          if (updates.customerPhone !== undefined) returnTripUpdates.passenger_phone = updates.customerPhone;
          if (updates.customerEmail !== undefined) returnTripUpdates.passenger_email = updates.customerEmail;

          // Update driver assignment
          if (updates.driverId !== undefined) returnTripUpdates.driver_id = updates.driverId;
          if (updates.vehicleId !== undefined) returnTripUpdates.vehicle_id = updates.vehicleId;

          // Only update appointment time if return trip is NOT a will call trip
          // Will call trips should not have an appointment time set automatically
          if (updates.appointmentTime !== undefined && !returnTrip.willCall) {
            returnTripUpdates.appointment_time = updates.appointmentTime;
          }

          // Update return trip in database
          const { error: returnError } = await supabase
            .from('trips')
            .update(returnTripUpdates)
            .eq('id', returnTrip.id);

          if (returnError) {
            console.error('Error updating return trip:', returnError);
          } else {
            //console.log('Successfully updated return trip:', returnTripNumber);
          }
        }
      }

      // Refresh data from database to ensure we have the latest state
      await loadInitialData();

      if (updates.status === 'completed' && updates.driverId) {
        setAllDrivers(prev =>
          prev.map(driver =>
            driver.id === updates.driverId
              ? {
                ...driver,
                totalTrips: driver.totalTrips + 1,
                updatedAt: new Date().toISOString(),
              }
              : driver
          )
        );
      }
    } catch (error) {
      console.error('Error updating trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      alert(`Failed to update trip: ${errorMessage}`);
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAllTrips(prev => prev.filter(trip => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const assignDriver = async (tripId: string, driverId: string) => {
    try {
      //console.log('Assigning driver:', { tripId, driverId, userId: user?.id });

      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const validUserId = isValidUUID(user?.id) ? user?.id : null;

      // Get the trip to calculate driver payout
      const trip = allTrips.find(t => t.id === tripId);
      let driverPayout = 0;

      if (trip) {
        // Calculate driver payout based on distance and service level
        const { calculateDriverPayout } = await import('../utils/rateCalculator');
        const distanceMiles = trip.distance || trip.distanceMiles || 0;
        const serviceLevel = trip.serviceLevel || 'ambulatory';

        try {
          const payoutCalc = await calculateDriverPayout(driverId, serviceLevel, distanceMiles);
          driverPayout = payoutCalc.payout;
          //console.log('Calculated driver payout:', driverPayout, payoutCalc.breakdown);
        } catch (error) {
          console.error('Error calculating driver payout:', error);
        }
      }

      // Allow reassignment: Only set status to 'scheduled' if trip is pending or unassigned
      // Keep existing status for already assigned trips (allows reassignment)
      const shouldUpdateStatus = trip?.status === 'pending' || !trip?.driverId;

      const updateData: any = {
        driver_id: driverId,
        driver_payout: driverPayout,
        updated_at: new Date().toISOString(),
        last_modified_by_id: validUserId,
        last_modified_by_name: user?.fullName || null,
      };

      // Only update status if it's a new assignment
      if (shouldUpdateStatus) {
        updateData.status = 'scheduled';
      }

      const { data, error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', tripId)
        .select();

      if (error) {
        console.error('Supabase error assigning driver:', error);
        throw error;
      }

      //console.log('Driver assigned successfully:', data);

      setAllTrips(prev =>
        prev.map(t =>
          t.id === tripId
            ? {
              ...t,
              driverId,
              driverPayout,
              // Only update status to 'scheduled' if it's a new assignment
              status: (t.status === 'pending' || !t.driverId ? 'scheduled' : t.status) as const,
              assignedBy: user?.id,
              lastModifiedById: user?.id,
              lastModifiedByName: user?.fullName,
              updatedAt: new Date().toISOString()
            }
            : t
        )
      );

      // Drivers stay 'available' - no status change needed
      // They can handle multiple assignments

      // Enhanced features: SMS notifications and tracking links
      const driver = allDrivers.find(d => d.id === driverId);

      if (trip && driver) {
        // Import enhancement utilities dynamically
        import('../utils/tripEnhancements').then(({ enhanceTripOnAssignment }) => {
          enhanceTripOnAssignment(tripId, driverId, trip, driver).catch(err => {
            console.error('Error applying trip enhancements:', err);
          });
        }).catch(err => {
          console.error('Error loading enhancements:', err);
        });
      }
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to assign driver: ${errorMessage}\n\nPlease check console for details.`);
    }
  };

  const addClinic = async (clinicData: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const addressParts = clinicData.address.split(',').map(s => s.trim());

      const { data, error } = await supabase
        .from('clinics')
        .insert({
          name: clinicData.name,
          address: addressParts[0] || clinicData.address,
          city: addressParts[1] || 'Fort Worth',
          state: 'TX',
          zip_code: addressParts[2]?.match(/\d{5}/)?.[0] || '76036',
          phone: clinicData.phone,
          contact_email: clinicData.email,
          ambulatory_rate: clinicData.ambulatoryRate || 0,
          wheelchair_rate: clinicData.wheelchairRate || 0,
          stretcher_rate: clinicData.stretcherRate || 0,
          cancellation_rate: clinicData.cancellationRate || null,
          no_show_rate: clinicData.noShowRate || null,
          payment_terms: clinicData.paymentTerms || 'Net 30',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newClinic: Clinic = {
        id: data.id,
        name: data.name,
        address: clinicData.address,
        phone: data.phone,
        email: data.contact_email || '',
        isActive: data.is_active,
        ambulatoryRate: Number(data.ambulatory_rate) || 0,
        wheelchairRate: Number(data.wheelchair_rate) || 0,
        stretcherRate: Number(data.stretcher_rate) || 0,
        cancellationRate: data.cancellation_rate ? Number(data.cancellation_rate) : undefined,
        noShowRate: data.no_show_rate ? Number(data.no_show_rate) : undefined,
        paymentTerms: data.payment_terms,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setClinics(prev => [...prev, newClinic]);
    } catch (error) {
      console.error('Error adding clinic:', error);
      alert('Failed to add facility. Please try again.');
    }
  };

  const updateClinic = async (id: string, updates: Partial<Clinic>) => {
    try {
      await api.updateClinic(id, updates);
      setClinics(prev =>
        prev.map(clinic =>
          clinic.id === id
            ? { ...clinic, ...updates, updatedAt: new Date().toISOString() }
            : clinic
        )
      );
    } catch (error: any) {
      console.error('Error updating clinic:', error);
      alert(`Failed to update clinic: ${error?.message || 'Unknown error'}`);
    }
  };

  const deleteClinic = async (id: string) => {
    try {
      await api.deleteClinic(id);
      setClinics(prev => prev.filter(clinic => clinic.id !== id));
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      alert(`Failed to delete clinic: ${error?.message || 'Unknown error'}`);
    }
  };

  const reinstateTrip = async (tripId: string) => {
    try {
      const trip = allTrips.find(t => t.id === tripId);
      if (!trip) return;

      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const validUserId = isValidUUID(user?.id) ? user?.id : null;

      // Reinstate to scheduled status (or in-progress if driver was assigned)
      const newStatus = trip.driverId ? 'scheduled' : 'pending';

      const { error } = await supabase
        .from('trips')
        .update({
          status: newStatus,
          cancellation_reason: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
          last_modified_by_id: validUserId,
          last_modified_by_name: user?.fullName || null,
        })
        .eq('id', tripId);

      if (error) throw error;

      setAllTrips(prev =>
        prev.map(t =>
          t.id === tripId
            ? {
              ...t,
              status: newStatus as Trip['status'],
              cancellationReason: undefined,
              cancelledAt: undefined,
              updatedAt: new Date().toISOString(),
              lastModifiedById: user?.id,
              lastModifiedByName: user?.fullName,
            }
            : t
        )
      );

      // Log to change history
      try {
        if (validUserId) {
          await supabase.from('trip_change_history').insert({
            trip_id: tripId,
            change_type: 'status_changed',
            old_value: trip.status,
            new_value: newStatus,
            changed_by_id: validUserId,
            changed_by_name: user?.fullName || null,
            change_description: `Trip reinstated from ${trip.status} to ${newStatus}`,
          });
        }
      } catch (historyError) {
        //console.log('Could not log to change history:', historyError);
      }
    } catch (error) {
      console.error('Error reinstating trip:', error);
      alert('Failed to reinstate trip. Please try again.');
    }
  };

  const addFacility = async (facilityData: AddFacilityData) => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .insert({
          name: facilityData.name,
          address: facilityData.address,
          city: facilityData.city || 'Fort Worth',
          state: facilityData.state || 'TX',
          zip_code: facilityData.zipCode || '76036',
          phone: facilityData.phone,
          contact_email: facilityData.email,
          contact_person: facilityData.contactPerson,
          notes: facilityData.notes,
          clinic_id: facilityData.clinicId || user?.clinicId,
          ambulatory_rate: facilityData.ambulatoryRate || 0,
          wheelchair_rate: facilityData.wheelchairRate || 0,
          stretcher_rate: facilityData.stretcherRate || 0,
          cancellation_rate: facilityData.cancellationRate || null,
          no_show_rate: facilityData.noShowRate || null,
          payment_terms: facilityData.paymentTerms || 'Net 30',
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Handle Facility User Auto-Creation
      if (facilityData.username) {
        const targetClinicId = facilityData.clinicId || user?.clinicId;
        const clinic = clinics.find(c => c.id === targetClinicId);

        if (clinic?.companyCode) {
          try {
            const { error: fnError } = await supabase.functions.invoke('create-facility-user', {
              body: {
                username: facilityData.username,
                companyCode: clinic.companyCode,
                facilityId: data.id,
                clinicId: targetClinicId,
              },
            });

            if (fnError) {
              console.error('Error creating facility user:', fnError);
              alert('Facility created, but failed to create dispatcher user. Please create manually.');
            }
          } catch (err) {
            console.error('Edge function invocation failed:', err);
            // Non-blocking error for facility creation
            alert('Facility created, but failed to create dispatcher user.');
          }
        } else {
          console.warn('Cannot create facility user: Company code not found for clinic.');
        }
      }

      const newFacility: Facility = {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        phone: data.phone,
        email: data.contact_email || '',
        contactPerson: data.contact_person,
        notes: data.notes,
        clinicId: data.clinic_id,
        isActive: true,
        ambulatoryRate: Number(data.ambulatory_rate) || 0,
        wheelchairRate: Number(data.wheelchair_rate) || 0,
        stretcherRate: Number(data.stretcher_rate) || 0,
        cancellationRate: data.cancellation_rate ? Number(data.cancellation_rate) : undefined,
        noShowRate: data.no_show_rate ? Number(data.no_show_rate) : undefined,
        paymentTerms: data.payment_terms,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setFacilities(prev => [...prev, newFacility]);
    } catch (error: any) {
      console.error('Error adding facility:', error);
      throw error;
    }
  };

  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    try {
      await api.updateFacility(id, updates);
      setFacilities(prev =>
        prev.map(facility =>
          facility.id === id
            ? { ...facility, ...updates, updatedAt: new Date().toISOString() }
            : facility
        )
      );
    } catch (error: any) {
      console.error('Error updating facility:', error);
      alert(`Failed to update facility: ${error?.message || 'Unknown error'}`);
    }
  };

  const deleteFacility = async (id: string) => {
    try {
      await api.deleteFacility(id);
      setFacilities(prev => prev.filter(facility => facility.id !== id));
    } catch (error: any) {
      console.error('Error deleting facility:', error);
      throw error;
    }
  };

  // Patient CRUD functions
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.createPatient({
        ...patientData,
        clinicId: patientData.clinicId || user?.clinicId,
      });
      setPatients(prev => [response.data, ...prev]);
    } catch (error: any) {
      console.error('Error adding patient:', error);
      alert(`Failed to add patient: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      await api.updatePatient(id, updates);
      setPatients(prev =>
        prev.map(patient =>
          patient.id === id
            ? { ...patient, ...updates, updatedAt: new Date().toISOString() }
            : patient
        )
      );
    } catch (error: any) {
      console.error('Error updating patient:', error);
      alert(`Failed to update patient: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      await api.deletePatient(id);
      setPatients(prev => prev.filter(patient => patient.id !== id));
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      alert(`Failed to delete patient: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  const value: AppContextType = {
    drivers,
    trips,
    patients,
    clinics,
    dashboardStats,
    addDriver,
    updateDriver,
    deleteDriver,
    addTrip,
    updateTrip,
    deleteTrip,
    assignDriver,
    reinstateTrip,
    addClinic,
    updateClinic,
    deleteClinic,
    facilities,
    addFacility,
    updateFacility,
    deleteFacility,
    // Patients
    addPatient,
    updatePatient,
    deletePatient,
    // Trip Sources
    tripSources,
    refreshData: loadInitialData,
    isLoading,
  };



  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
