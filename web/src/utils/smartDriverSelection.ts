import { Driver, Trip } from '../types';

interface DriverScore {
  driver: Driver;
  score: number;
  reasons: string[];
  distance?: number;
  matchDetails: {
    vehicleMatch: boolean;
    availabilityMatch: boolean;
    proximityScore: number;
    performanceScore: number;
    workloadScore: number;
  };
}

interface TripLocation {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse address to get approximate coordinates (simplified version)
 * In production, this would use Google Maps Geocoding API
 */
function approximateCoordinates(address: string): TripLocation | null {
  // This is a simplified version - in production you'd use geocoding
  // For now, return null if we can't determine location
  return null;
}

/**
 * Calculate proximity score based on distance
 */
function calculateProximityScore(distance: number | undefined): number {
  if (!distance) return 50; // Neutral score if distance unknown

  // Closer = better score
  if (distance < 2) return 100;
  if (distance < 5) return 90;
  if (distance < 10) return 75;
  if (distance < 20) return 50;
  if (distance < 30) return 30;
  return 10;
}

/**
 * Calculate performance score based on driver metrics
 */
function calculatePerformanceScore(driver: Driver, allTrips: Trip[]): number {
  const driverTrips = allTrips.filter(t => t.driverId === driver.id);

  if (driverTrips.length === 0) return 70; // Neutral score for new drivers

  let score = 70;

  // Completed trips bonus
  const completedTrips = driverTrips.filter(t => t.status === 'completed').length;
  const completionRate = completedTrips / driverTrips.length;
  score += completionRate * 20;

  // No-show penalty
  const noShows = driverTrips.filter(t => t.status === 'no-show').length;
  if (noShows > 0) {
    score -= (noShows / driverTrips.length) * 30;
  }

  // Cancellation penalty
  const cancelled = driverTrips.filter(t => t.status === 'cancelled').length;
  if (cancelled > 0) {
    score -= (cancelled / driverTrips.length) * 20;
  }

  // Experience bonus
  if (driverTrips.length > 50) score += 5;
  if (driverTrips.length > 100) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate workload score - prefer drivers with fewer active trips
 */
function calculateWorkloadScore(driver: Driver, allTrips: Trip[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTrips = allTrips.filter(t =>
    t.driverId === driver.id &&
    ['scheduled', 'assigned', 'arrived', 'on-way', 'in_progress'].includes(t.status) &&
    new Date(t.scheduledTime) >= today
  ).length;

  // Fewer active trips = higher score
  if (activeTrips === 0) return 100;
  if (activeTrips === 1) return 85;
  if (activeTrips === 2) return 70;
  if (activeTrips === 3) return 50;
  if (activeTrips === 4) return 30;
  return 10;
}

/**
 * Check if driver's vehicle type matches trip requirements
 */
function checkVehicleMatch(driver: Driver, trip: Trip): boolean {
  if (!driver.vehicleType) return true; // No restriction

  const vehicleType = driver.vehicleType.toLowerCase();
  const serviceLevel = trip.serviceLevel?.toLowerCase() || '';

  // Vehicle type mapping
  if (serviceLevel === 'stretcher') {
    return vehicleType.includes('van') || vehicleType.includes('ambulance');
  }

  if (serviceLevel === 'wheelchair') {
    return vehicleType.includes('van') ||
           vehicleType.includes('suv') ||
           vehicleType.includes('wheelchair');
  }

  // Ambulatory can use any vehicle
  return true;
}

/**
 * Check if driver is available at the trip's scheduled time
 */
function checkAvailability(driver: Driver, trip: Trip, allTrips: Trip[]): boolean {
  if (driver.status !== 'available') return false;

  const tripTime = new Date(trip.scheduledTime);
  const tripEndEstimate = new Date(tripTime.getTime() + 2 * 60 * 60 * 1000); // Assume 2-hour trip

  // Check for conflicting trips
  const conflictingTrips = allTrips.filter(t =>
    t.driverId === driver.id &&
    t.id !== trip.id &&
    ['scheduled', 'assigned', 'arrived', 'on-way', 'in_progress'].includes(t.status)
  );

  for (const existingTrip of conflictingTrips) {
    const existingTime = new Date(existingTrip.scheduledTime);
    const existingEnd = new Date(existingTime.getTime() + 2 * 60 * 60 * 1000);

    // Check for time overlap
    if (
      (tripTime >= existingTime && tripTime <= existingEnd) ||
      (tripEndEstimate >= existingTime && tripEndEstimate <= existingEnd) ||
      (tripTime <= existingTime && tripEndEstimate >= existingEnd)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Generate reasons for why a driver is recommended
 */
function generateReasons(score: DriverScore, trip: Trip): string[] {
  const reasons: string[] = [];

  if (score.matchDetails.vehicleMatch) {
    reasons.push('✓ Vehicle type matches requirements');
  }

  if (score.matchDetails.availabilityMatch) {
    reasons.push('✓ Available at scheduled time');
  }

  if (score.distance !== undefined && score.distance < 5) {
    reasons.push(`✓ Only ${score.distance.toFixed(1)} miles from pickup`);
  }

  if (score.matchDetails.performanceScore >= 85) {
    reasons.push('✓ Excellent performance history');
  }

  if (score.matchDetails.workloadScore >= 85) {
    reasons.push('✓ Light current workload');
  }

  if (score.matchDetails.proximityScore >= 90) {
    reasons.push('✓ Very close to pickup location');
  }

  // Add warnings
  if (!score.matchDetails.vehicleMatch) {
    reasons.push('⚠ Vehicle may not be ideal for this trip');
  }

  if (score.matchDetails.workloadScore < 40) {
    reasons.push('⚠ Currently handling multiple trips');
  }

  if (score.matchDetails.performanceScore < 50) {
    reasons.push('⚠ Performance could be improved');
  }

  return reasons;
}

/**
 * Main function: Rank all drivers for a specific trip
 */
export function rankDriversForTrip(
  trip: Trip,
  allDrivers: Driver[],
  allTrips: Trip[]
): DriverScore[] {
  const scores: DriverScore[] = [];

  for (const driver of allDrivers) {
    // Skip inactive drivers
    if (driver.status === 'inactive') continue;

    // Check vehicle match
    const vehicleMatch = checkVehicleMatch(driver, trip);

    // Check availability
    const availabilityMatch = checkAvailability(driver, trip, allTrips);

    // Calculate distance (if we have location data)
    let distance: number | undefined;
    const tripLocation = approximateCoordinates(trip.pickupLocation);
    if (tripLocation && driver.currentLocation) {
      distance = calculateDistance(
        driver.currentLocation.lat,
        driver.currentLocation.lng,
        tripLocation.lat,
        tripLocation.lng
      );
    }

    // Calculate individual scores
    const proximityScore = calculateProximityScore(distance);
    const performanceScore = calculatePerformanceScore(driver, allTrips);
    const workloadScore = calculateWorkloadScore(driver, allTrips);

    // Calculate total score with weights
    let totalScore = 0;

    // Vehicle match is critical
    totalScore += vehicleMatch ? 25 : 0;

    // Availability is critical
    totalScore += availabilityMatch ? 25 : 0;

    // Proximity (20% weight)
    totalScore += proximityScore * 0.20;

    // Performance (15% weight)
    totalScore += performanceScore * 0.15;

    // Workload (15% weight)
    totalScore += workloadScore * 0.15;

    const driverScore: DriverScore = {
      driver,
      score: totalScore,
      reasons: [],
      distance,
      matchDetails: {
        vehicleMatch,
        availabilityMatch,
        proximityScore,
        performanceScore,
        workloadScore
      }
    };

    driverScore.reasons = generateReasons(driverScore, trip);
    scores.push(driverScore);
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

/**
 * Get top 3 driver recommendations
 */
export function getTopDriverRecommendations(
  trip: Trip,
  allDrivers: Driver[],
  allTrips: Trip[]
): DriverScore[] {
  const rankedDrivers = rankDriversForTrip(trip, allDrivers, allTrips);
  return rankedDrivers.slice(0, 3);
}

/**
 * Get explanation for why no good drivers are available
 */
export function getNoDriversExplanation(
  trip: Trip,
  allDrivers: Driver[],
  allTrips: Trip[]
): string {
  const activeDrivers = allDrivers.filter(d => d.status !== 'inactive');

  if (activeDrivers.length === 0) {
    return 'No active drivers in the system.';
  }

  const availableDrivers = activeDrivers.filter(d =>
    checkAvailability(d, trip, allTrips)
  );

  if (availableDrivers.length === 0) {
    return 'All drivers are busy at the scheduled time. Consider rescheduling or adding more drivers.';
  }

  const matchingVehicles = availableDrivers.filter(d =>
    checkVehicleMatch(d, trip)
  );

  if (matchingVehicles.length === 0) {
    return `No available vehicles match the ${trip.serviceLevel} service level requirement.`;
  }

  return 'Some drivers are available but may not be optimal for this trip.';
}
