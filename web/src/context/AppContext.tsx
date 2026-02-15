import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Driver, Trip, DashboardStats, Clinic, Patient, Contractor, TripSource, AddContractorData } from '../types';
import { useAuth } from './AuthContext';
import { parseAddress } from '../utils/addressParser';
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
  // Contractors
  contractors: Contractor[];
  addContractor: (contractor: AddContractorData) => void;
  updateContractor: (id: string, updates: Partial<Contractor>) => void;
  deleteContractor: (id: string) => void;
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
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [tripSources, setTripSources] = useState<TripSource[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // All dispatchers can see all drivers (drivers are shared across contractors)
  const drivers = allDrivers;
  // Dispatchers only see trips for their contractor/clinic - memoized to prevent infinite re-renders
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
        contractorsRes,
        tripSourcesRes
      ] = await Promise.all([
        api.getDrivers().catch(() => ({ data: [] })),
        api.getTrips().catch(() => ({ data: [] })),
        api.getClinics().catch(() => ({ data: [] })),
        api.getPatients().catch(() => ({ data: [] })),
        api.getContractors().catch(() => ({ data: [] })),
        api.getTripSources().catch(() => ({ data: [] }))
      ]);

      // Set drivers from API response
      setAllDrivers(driversRes.data || []);

      // Set trips from API response
      setAllTrips(tripsRes.data || []);

      // Set clinics from API response
      setClinics(clinicsRes.data || []);

      // Set patients from API response
      setPatients(patientsRes.data || []);

      // Set contractors from API response
      setContractors(contractorsRes.data || []);

      // Set trip sources from API response (already formatted by backend)
      setTripSources(tripSourcesRes.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setAllTrips([]);
      setAllDrivers([]);
      setClinics([]);
      setPatients([]);
      setContractors([]);
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
      .reduce((sum, trip) => sum + (trip.fare || 0), 0);

    setDashboardStats({
      todaysTrips: todaysTrips.length,
      activeDrivers,
      completedToday,
      totalRevenue,
    });
  }, [trips, drivers]);

  const addDriver = async (driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'totalTrips' | 'rating'>) => {
    const result = await api.createDriver({
      email: driverData.email,
      firstName: driverData.firstName,
      lastName: driverData.lastName,
      dateOfBirth: driverData.dateOfBirth,
      phone: driverData.phone,
      password: driverData.temporaryPassword,
      licenseNumber: driverData.licenseNumber,
      clinicId: user?.clinicId,
      rates: driverData.rates || {},
    });

    // Reload drivers to get the full formatted data from backend
    const driversRes = await api.getDrivers().catch(() => ({ data: [] }));
    setAllDrivers(driversRes.data || []);

    return result;
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    await api.updateDriver(id, updates);

    setAllDrivers(prev =>
      prev.map(driver =>
        driver.id === id
          ? { ...driver, ...updates, updatedAt: new Date().toISOString() }
          : driver
      )
    );
  };

  const deleteDriver = async (id: string) => {
    await api.deleteDriver(id);

    setAllDrivers(prev => prev.filter(driver => driver.id !== id));
    setAllTrips(prev =>
      prev.map(trip =>
        trip.driverId === id ? { ...trip, driverId: undefined, status: 'pending' as const } : trip
      )
    );
  };

  const addTrip = async (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const isReturnTrip = tripData.isReturnTrip || false;
      const tripNumber = tripData.tripNumber || generateTripNumber(isReturnTrip);

      const pickupAddress = parseAddress(tripData.pickupLocation || '');
      const dropoffAddress = parseAddress(tripData.dropoffLocation || '');

      // Send frontend field names — backend POST handler maps them to DB columns
      await api.createTrip({
        tripNumber,
        patientId: tripData.patientId,
        driverId: tripData.driverId,
        vehicleId: tripData.vehicleId,
        contractorId: tripData.contractorId,
        clinicId: tripData.clinicId,
        // Passenger info — backend maps customerName→rider, customerPhone→phone
        customerName: `${tripData.firstName || ''} ${tripData.lastName || ''}`.trim(),
        customerPhone: tripData.customerPhone,
        // Locations
        pickupLocation: tripData.pickupLocation,
        pickupCity: tripData.pickupCity || pickupAddress.city || '',
        pickupState: tripData.pickupState || pickupAddress.state || 'TX',
        pickupZip: tripData.pickupZip || pickupAddress.zip || '',
        dropoffLocation: tripData.dropoffLocation,
        dropoffCity: tripData.dropoffCity || dropoffAddress.city || '',
        dropoffState: tripData.dropoffState || dropoffAddress.state || 'TX',
        dropoffZip: tripData.dropoffZip || dropoffAddress.zip || '',
        // Time
        scheduledPickupTime: tripData.scheduledTime,
        scheduledDate: tripData.scheduledTime ? new Date(tripData.scheduledTime).toISOString().split('T')[0] : null,
        appointmentTime: tripData.appointmentTime,
        actualPickupTime: tripData.actualPickupTime,
        actualDropoffTime: tripData.actualDropoffTime,
        // Type & status
        status: tripData.status || 'pending',
        serviceLevel: tripData.serviceLevel || 'ambulatory',
        levelOfAssistance: tripData.levelOfAssistance,
        isReturnTrip: isReturnTrip,
        willCall: tripData.willCall || false,
        classification: tripData.classification,
        // Financial & distance — backend maps distance→mileage, fare→revenue
        distance: tripData.distance || 0,
        fare: tripData.fare || 0,
        driverPayout: tripData.driverPayout || 0,
        // Other
        notes: tripData.notes,
        clinicNote: tripData.clinicNote,
        tripSourceId: tripData.tripSourceId,
      });

      // Reload all trips from server to get properly transformed data
      await loadInitialData();

    } catch (error) {
      console.error('Error adding trip:', error);
      const message = error instanceof Error ? error.message : 'Failed to add trip. Please try again.';
      alert(message);
    }
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    try {
      // Build customerName from firstName+lastName if provided, so backend writes to 'rider' column
      const enrichedUpdates = { ...updates };
      if (updates.firstName !== undefined || updates.lastName !== undefined) {
        const currentTrip = allTrips.find(t => t.id === id);
        const fn = updates.firstName ?? currentTrip?.firstName ?? '';
        const ln = updates.lastName ?? currentTrip?.lastName ?? '';
        enrichedUpdates.customerName = `${fn} ${ln}`.trim();
      }

      // Send update through backend API — backend PUT handler maps frontend field names to DB columns
      await api.updateTrip(id, enrichedUpdates);

      // Check if this is an outbound trip (A trip) and if we need to update the return trip (B trip)
      const currentTrip = allTrips.find(t => t.id === id);
      if (currentTrip?.tripNumber && currentTrip.tripNumber.toUpperCase().endsWith('A')) {
        const baseTripNumber = currentTrip.tripNumber.slice(0, -1);
        const returnTripNumber = `${baseTripNumber}B`;
        const returnTrip = allTrips.find(t => t.tripNumber === returnTripNumber);

        if (returnTrip) {
          const returnUpdates: Partial<Trip> = {};
          if (enrichedUpdates.customerName !== undefined) returnUpdates.customerName = enrichedUpdates.customerName;
          if (updates.customerPhone !== undefined) returnUpdates.customerPhone = updates.customerPhone;
          if (updates.driverId !== undefined) returnUpdates.driverId = updates.driverId;
          if (updates.vehicleId !== undefined) returnUpdates.vehicleId = updates.vehicleId;

          if (Object.keys(returnUpdates).length > 0) {
            try {
              await api.updateTrip(returnTrip.id, returnUpdates);
            } catch (returnError) {
              console.error('Error updating return trip:', returnError);
            }
          }
        }
      }

      // Refresh data from database to ensure we have the latest state
      await loadInitialData();

    } catch (error) {
      console.error('Error updating trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update trip: ${errorMessage}`);
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      await api.deleteTrip(id);
      setAllTrips(prev => prev.filter(trip => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const assignDriver = async (tripId: string, driverId: string) => {
    try {
      const trip = allTrips.find(t => t.id === tripId);
      let driverPayout = 0;

      if (trip) {
        try {
          const { calculateDriverPayout } = await import('../utils/rateCalculator');
          const distanceMiles = trip.distance || 0;
          const serviceLevel = (trip.serviceLevel || 'ambulatory') as 'ambulatory' | 'wheelchair' | 'stretcher';
          const payoutCalc = await calculateDriverPayout(driverId, serviceLevel, distanceMiles);
          driverPayout = payoutCalc.payout;
        } catch (_) {
          // Driver may not have rates configured — use 0
        }
      }

      // Use the dedicated assign endpoint — it sets status to 'assigned' in DB
      await api.assignDriverToTrip(tripId, driverId);

      // Also save driver payout if calculated
      if (driverPayout > 0) {
        await api.updateTrip(tripId, { driverPayout }).catch(() => {});
      }

      // Reload from server to get properly transformed data
      await loadInitialData();

      // Trigger driver assignment enhancements (tracking link, notifications)
      // These are non-critical — don't block on errors
      setAllTrips(prev =>
        prev.map(t =>
          t.id === tripId
            ? {
              ...t,
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
      await api.createClinic({
        name: clinicData.name,
        address: clinicData.address,
        phone: clinicData.phone,
        email: clinicData.email,
        ambulatoryRate: clinicData.ambulatoryRate || 0,
        wheelchairRate: clinicData.wheelchairRate || 0,
        stretcherRate: clinicData.stretcherRate || 0,
      });

      // Reload clinics to get properly formatted data
      const clinicsRes = await api.getClinics().catch(() => ({ data: [] }));
      setClinics(clinicsRes.data || []);
    } catch (error) {
      console.error('Error adding clinic:', error);
      alert('Failed to add clinic. Please try again.');
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

      // Reinstate to scheduled status (or pending if no driver)
      const newStatus = trip.driverId ? 'scheduled' : 'pending';

      await api.updateTrip(tripId, {
        status: newStatus,
        cancellationReason: undefined,
        statusChangeReason: `Trip reinstated from ${trip.status} to ${newStatus}`,
      });

      setAllTrips(prev =>
        prev.map(t =>
          t.id === tripId
            ? {
              ...t,
              status: newStatus as Trip['status'],
              cancellationReason: undefined,
              cancelledAt: undefined,
              updatedAt: new Date().toISOString(),
            }
            : t
        )
      );
    } catch (error) {
      console.error('Error reinstating trip:', error);
      alert('Failed to reinstate trip. Please try again.');
    }
  };

  const addContractor = async (contractorData: AddContractorData) => {
    try {
      await api.createContractor({
        name: contractorData.name,
        address: contractorData.address,
        city: contractorData.city || 'Fort Worth',
        state: contractorData.state || 'TX',
        zipCode: contractorData.zipCode || '76036',
        phone: contractorData.phone,
        email: contractorData.email,
        contactPerson: contractorData.contactPerson,
        notes: contractorData.notes,
        clinicId: contractorData.clinicId || user?.clinicId,
        rate_tiers: (contractorData as any).rate_tiers || contractorData.rateTiers || {},
      });

      // Reload contractors to get properly formatted data
      const contractorsRes = await api.getContractors().catch(() => ({ data: [] }));
      setContractors(contractorsRes.data || []);
    } catch (error: any) {
      console.error('Error adding contractor:', error);
      throw error;
    }
  };

  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    try {
      await api.updateContractor(id, updates);
      // Reload contractors to get properly transformed data from backend
      const contractorsRes = await api.getContractors().catch(() => ({ data: [] }));
      setContractors(contractorsRes.data || []);
    } catch (error: any) {
      console.error('Error updating contractor:', error);
      throw error;
    }
  };

  const deleteContractor = async (id: string) => {
    try {
      await api.deleteContractor(id);
      setContractors(prev => prev.filter(contractor => contractor.id !== id));
    } catch (error: any) {
      console.error('Error deleting contractor:', error);
      throw error;
    }
  };

  // Patient CRUD functions
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await api.createPatient({
        ...patientData,
        clinicId: patientData.clinicId || user?.clinicId,
      });
      // Reload patients to get properly transformed data from backend
      const patientsRes = await api.getPatients().catch(() => ({ data: [] }));
      setPatients(patientsRes.data || []);
    } catch (error: any) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      await api.updatePatient(id, updates);
      // Reload patients to get properly transformed data from backend
      const patientsRes = await api.getPatients().catch(() => ({ data: [] }));
      setPatients(patientsRes.data || []);
    } catch (error: any) {
      console.error('Error updating patient:', error);
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
    contractors,
    addContractor,
    updateContractor,
    deleteContractor,
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
