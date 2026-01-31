import { Trip } from '../types';

export interface TripConflict {
  type: 'driver_overlap' | 'vehicle_overlap';
  trip1: Trip;
  trip2: Trip;
  message: string;
}

export const detectTripConflicts = (trips: Trip[], newTrip?: Partial<Trip>): TripConflict[] => {
  const conflicts: TripConflict[] = [];

  // If checking a new trip, add it to the list temporarily
  const allTrips = newTrip && newTrip.scheduledTime
    ? [...trips, newTrip as Trip]
    : trips;

  // Only check future/pending trips (not completed, cancelled, or no-show)
  const activeTrips = allTrips.filter(
    t => t.status !== 'cancelled' && t.status !== 'no-show' && t.status !== 'completed'
  );

  // Group trips by driver
  const tripsByDriver = activeTrips.reduce((acc, trip) => {
    if (trip.driverId) {
      if (!acc[trip.driverId]) {
        acc[trip.driverId] = [];
      }
      acc[trip.driverId].push(trip);
    }
    return acc;
  }, {} as Record<string, Trip[]>);

  // Check for overlapping times for each driver
  Object.entries(tripsByDriver).forEach(([driverId, driverTrips]) => {
    for (let i = 0; i < driverTrips.length; i++) {
      for (let j = i + 1; j < driverTrips.length; j++) {
        const trip1 = driverTrips[i];
        const trip2 = driverTrips[j];

        const overlap = checkTimeOverlap(trip1, trip2);

        if (overlap) {
          conflicts.push({
            type: 'driver_overlap',
            trip1,
            trip2,
            message: `Driver has overlapping trips: ${trip1.tripNumber} and ${trip2.tripNumber}`,
          });
        }
      }
    }
  });

  return conflicts;
};

const checkTimeOverlap = (trip1: Trip, trip2: Trip): boolean => {
  // Skip Will Call trips (they don't have real scheduled times)
  if (trip1.willCall || trip2.willCall) {
    return false;
  }

  // Skip if either trip doesn't have a scheduled time
  if (!trip1.scheduledTime || !trip2.scheduledTime) {
    return false;
  }

  const start1 = new Date(trip1.scheduledTime);
  const start2 = new Date(trip2.scheduledTime);

  // Skip trips with placeholder dates (2000-01-01)
  if (start1.getFullYear() === 2000 || start2.getFullYear() === 2000) {
    return false;
  }

  // Skip if trips are on different days
  const date1 = new Date(start1);
  date1.setHours(0, 0, 0, 0);
  const date2 = new Date(start2);
  date2.setHours(0, 0, 0, 0);

  if (date1.getTime() !== date2.getTime()) {
    return false;
  }

  // Estimate trip duration (30 minutes default, or use actual time if available)
  const getDuration = (trip: Trip) => {
    if (trip.actualPickupTime && trip.actualDropoffTime) {
      const pickup = new Date(trip.actualPickupTime);
      const dropoff = new Date(trip.actualDropoffTime);
      return dropoff.getTime() - pickup.getTime();
    }
    // Default 30 minutes + buffer
    return 45 * 60 * 1000; // 45 minutes in milliseconds
  };

  const end1 = new Date(start1.getTime() + getDuration(trip1));
  const end2 = new Date(start2.getTime() + getDuration(trip2));

  // Check if times overlap
  return (start1 < end2 && end1 > start2);
};

export const getConflictWarningMessage = (conflicts: TripConflict[]): string => {
  if (conflicts.length === 0) return '';

  if (conflicts.length === 1) {
    return conflicts[0].message;
  }

  return `${conflicts.length} scheduling conflicts detected. Check driver assignments.`;
};

export const hasConflict = (trip: Trip, allTrips: Trip[]): boolean => {
  const conflicts = detectTripConflicts(allTrips, trip);
  return conflicts.some(c => c.trip1.id === trip.id || c.trip2.id === trip.id);
};
