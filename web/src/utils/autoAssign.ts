import { Trip, Driver } from '../types';

export interface AssignmentSuggestion {
  tripId: string;
  tripNumber: string;
  driverId: string;
  driverName: string;
  score: number;
  reasons: string[];
  customerName: string;
  pickupLocation: string;
  scheduledTime: string;
}

export interface AutoAssignResult {
  suggestions: AssignmentSuggestion[];
  unassignedTrips: Trip[];
  availableDrivers: Driver[];
  stats: {
    totalUnassigned: number;
    totalAvailable: number;
    suggestionsGenerated: number;
    unmatchedTrips: number;
  };
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getMockCoordinates = (location: string): { lat: number; lng: number } => {
  const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    lat: 29.7 + (hash % 50) / 100,
    lng: -95.4 + (hash % 50) / 100
  };
};

const calculateAssignmentScore = (
  trip: Trip,
  driver: Driver,
  tripCoords: { lat: number; lng: number },
  driverCoords: { lat: number; lng: number }
): { score: number; reasons: string[] } => {
  let score = 100;
  const reasons: string[] = [];

  const distance = calculateDistance(
    tripCoords.lat,
    tripCoords.lng,
    driverCoords.lat,
    driverCoords.lng
  );

  if (distance < 2) {
    score += 30;
    reasons.push('Very close proximity (< 2 miles)');
  } else if (distance < 5) {
    score += 20;
    reasons.push('Close proximity (< 5 miles)');
  } else if (distance < 10) {
    score += 10;
    reasons.push('Reasonable distance (< 10 miles)');
  } else {
    score -= 10;
    reasons.push(`Distant location (${distance.toFixed(1)} miles)`);
  }

  if (trip.serviceLevel === 'wheelchair' && driver.vehicleType === 'wheelchair') {
    score += 25;
    reasons.push('Perfect vehicle match (Wheelchair)');
  } else if (trip.serviceLevel === 'stretcher' && driver.vehicleType === 'ambulance') {
    score += 25;
    reasons.push('Perfect vehicle match (Stretcher/Ambulance)');
  } else if (trip.serviceLevel === 'ambulatory' && driver.vehicleType === 'sedan') {
    score += 15;
    reasons.push('Good vehicle match (Ambulatory/Sedan)');
  } else if (driver.vehicleType === 'wheelchair' || driver.vehicleType === 'ambulance') {
    score += 10;
    reasons.push('Compatible vehicle (can accommodate)');
  } else {
    score -= 5;
    reasons.push('Vehicle type mismatch');
  }

  if (driver.rating && driver.rating >= 4.5) {
    score += 10;
    reasons.push(`Excellent rating (${driver.rating.toFixed(1)} ⭐)`);
  } else if (driver.rating && driver.rating >= 4.0) {
    score += 5;
    reasons.push(`Good rating (${driver.rating.toFixed(1)} ⭐)`);
  }

  const currentLoad = driver.totalTrips || 0;
  if (currentLoad < 3) {
    score += 15;
    reasons.push('Low current workload');
  } else if (currentLoad < 5) {
    score += 8;
    reasons.push('Moderate workload');
  } else {
    score -= 5;
    reasons.push('High workload');
  }

  if (driver.availability === 'available') {
    score += 20;
    reasons.push('Currently available');
  } else {
    score -= 20;
    reasons.push('Not currently available');
  }

  return { score, reasons };
};

export const generateAutoAssignments = (
  trips: Trip[],
  drivers: Driver[]
): AutoAssignResult => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const unassignedTrips = trips.filter(trip => {
    if (trip.driverId) return false;
    if (trip.status !== 'pending' && trip.status !== 'scheduled') return false;

    if (trip.scheduledTime) {
      const scheduledDate = new Date(trip.scheduledTime);
      return scheduledDate >= today && scheduledDate < tomorrow;
    }

    return false;
  });

  const availableDrivers = drivers.filter(driver => {
    if (!driver.isActive) return false;
    if (driver.status !== 'active' && driver.status !== 'available') return false;
    return true;
  });

  const suggestions: AssignmentSuggestion[] = [];
  const assignedDrivers = new Set<string>();

  unassignedTrips.forEach(trip => {
    const tripCoords = getMockCoordinates(trip.pickupLocation || trip.pickupAddress || '');

    const driverScores = availableDrivers
      .filter(driver => !assignedDrivers.has(driver.id))
      .map(driver => {
        const driverLocation = `${driver.firstName} ${driver.lastName}`;
        const driverCoords = getMockCoordinates(driverLocation);
        const { score, reasons } = calculateAssignmentScore(trip, driver, tripCoords, driverCoords);

        return {
          driver,
          score,
          reasons
        };
      })
      .sort((a, b) => b.score - a.score);

    if (driverScores.length > 0) {
      const bestMatch = driverScores[0];

      suggestions.push({
        tripId: trip.id,
        tripNumber: trip.tripNumber || 'N/A',
        driverId: bestMatch.driver.id,
        driverName: `${bestMatch.driver.firstName} ${bestMatch.driver.lastName}`,
        score: bestMatch.score,
        reasons: bestMatch.reasons,
        customerName: trip.customerName || `${trip.firstName} ${trip.lastName}`,
        pickupLocation: trip.pickupLocation || trip.pickupAddress || 'Unknown',
        scheduledTime: trip.scheduledTime || 'Unknown'
      });

      assignedDrivers.add(bestMatch.driver.id);
    }
  });

  suggestions.sort((a, b) => b.score - a.score);

  return {
    suggestions,
    unassignedTrips,
    availableDrivers,
    stats: {
      totalUnassigned: unassignedTrips.length,
      totalAvailable: availableDrivers.length,
      suggestionsGenerated: suggestions.length,
      unmatchedTrips: unassignedTrips.length - suggestions.length
    }
  };
};
