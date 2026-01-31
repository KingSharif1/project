import { Trip, Driver } from '../types';

export interface DispatchSuggestion {
  driverId: string;
  driverName: string;
  score: number;
  reasons: string[];
  estimatedDistance?: number;
  estimatedTime?: number;
}

export interface DispatchFactors {
  proximityScore: number;
  availabilityScore: number;
  vehicleMatchScore: number;
  performanceScore: number;
  workloadScore: number;
}

export const generateDispatchSuggestions = (
  trip: Trip,
  drivers: Driver[],
  allTrips: Trip[]
): DispatchSuggestion[] => {
  const availableDrivers = drivers.filter(d => d.isActive && d.status !== 'off_duty');

  const suggestions = availableDrivers.map(driver => {
    const factors = calculateDispatchFactors(trip, driver, allTrips);
    const score = calculateOverallScore(factors);
    const reasons = generateReasons(factors, driver);

    return {
      driverId: driver.id,
      driverName: driver.name,
      score,
      reasons,
    };
  });

  // Sort by score descending
  return suggestions.sort((a, b) => b.score - a.score);
};

const calculateDispatchFactors = (
  trip: Trip,
  driver: Driver,
  allTrips: Trip[]
): DispatchFactors => {
  // 1. Availability Score (40% weight)
  const availabilityScore = calculateAvailabilityScore(driver, trip, allTrips);

  // 2. Vehicle Match Score (25% weight)
  const vehicleMatchScore = calculateVehicleMatchScore(trip, driver);

  // 3. Performance Score (20% weight)
  const performanceScore = calculatePerformanceScore(driver);

  // 4. Workload Score (15% weight)
  const workloadScore = calculateWorkloadScore(driver, allTrips);

  // Proximity would be 0% since we don't have real GPS data
  const proximityScore = 50; // Default neutral score

  return {
    proximityScore,
    availabilityScore,
    vehicleMatchScore,
    performanceScore,
    workloadScore,
  };
};

const calculateAvailabilityScore = (driver: Driver, trip: Trip, allTrips: Trip[]): number => {
  // Check if driver is available
  if (driver.status === 'off_duty') return 0;
  if (driver.status === 'available') return 100;

  // Check for scheduling conflicts
  const driverTrips = allTrips.filter(
    t => t.driverId === driver.id && t.status !== 'cancelled' && t.status !== 'no-show'
  );

  const tripTime = new Date(trip.scheduledTime);

  const hasConflict = driverTrips.some(t => {
    const tTime = new Date(t.scheduledTime);
    const timeDiff = Math.abs(tripTime.getTime() - tTime.getTime()) / (1000 * 60); // minutes
    return timeDiff < 60; // Less than 1 hour apart
  });

  return hasConflict ? 30 : 80;
};

const calculateVehicleMatchScore = (trip: Trip, driver: Driver): number => {
  // In a real system, you'd check vehicle capabilities vs trip requirements
  const serviceLevel = trip.serviceLevel || 'ambulatory';

  // Assume all drivers can do ambulatory
  if (serviceLevel === 'ambulatory') return 100;

  // For wheelchair/stretcher, check if driver has appropriate vehicle
  // Since we don't have vehicle data, return moderate score
  return 70;
};

const calculatePerformanceScore = (driver: Driver): number => {
  // Use driver rating as performance score
  const rating = driver.rating || 5.0;
  return (rating / 5.0) * 100;
};

const calculateWorkloadScore = (driver: Driver, allTrips: Trip[]): number => {
  // Calculate driver's trips today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysTrips = allTrips.filter(t => {
    if (t.driverId !== driver.id) return false;
    const tripDate = new Date(t.scheduledTime);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate.getTime() === today.getTime();
  });

  const tripCount = todaysTrips.length;

  // Less trips = higher score (more available capacity)
  if (tripCount === 0) return 100;
  if (tripCount <= 3) return 80;
  if (tripCount <= 6) return 60;
  if (tripCount <= 9) return 40;
  return 20;
};

const calculateOverallScore = (factors: DispatchFactors): number => {
  const weights = {
    proximity: 0.0, // Not used without GPS
    availability: 0.40,
    vehicleMatch: 0.25,
    performance: 0.20,
    workload: 0.15,
  };

  return Math.round(
    factors.proximityScore * weights.proximity +
    factors.availabilityScore * weights.availability +
    factors.vehicleMatchScore * weights.vehicleMatch +
    factors.performanceScore * weights.performance +
    factors.workloadScore * weights.workload
  );
};

const generateReasons = (factors: DispatchFactors, driver: Driver): string[] => {
  const reasons: string[] = [];

  // Availability
  if (factors.availabilityScore >= 90) {
    reasons.push('Driver is currently available');
  } else if (factors.availabilityScore >= 70) {
    reasons.push('Driver has light schedule');
  } else if (factors.availabilityScore >= 40) {
    reasons.push('Driver may have conflicts');
  } else {
    reasons.push('Driver has scheduling conflicts');
  }

  // Vehicle match
  if (factors.vehicleMatchScore === 100) {
    reasons.push('Vehicle perfectly matches requirements');
  } else if (factors.vehicleMatchScore >= 70) {
    reasons.push('Vehicle suitable for this trip');
  }

  // Performance
  const rating = driver.rating || 5.0;
  if (rating >= 4.8) {
    reasons.push(`Excellent rating (${rating.toFixed(1)}★)`);
  } else if (rating >= 4.5) {
    reasons.push(`Good rating (${rating.toFixed(1)}★)`);
  } else if (rating >= 4.0) {
    reasons.push(`Average rating (${rating.toFixed(1)}★)`);
  }

  // Workload
  if (factors.workloadScore >= 90) {
    reasons.push('Low workload today');
  } else if (factors.workloadScore >= 60) {
    reasons.push('Moderate workload today');
  } else if (factors.workloadScore < 40) {
    reasons.push('High workload today');
  }

  return reasons;
};

export const getDispatchRecommendation = (
  trip: Trip,
  drivers: Driver[],
  allTrips: Trip[]
): DispatchSuggestion | null => {
  const suggestions = generateDispatchSuggestions(trip, drivers, allTrips);
  return suggestions.length > 0 ? suggestions[0] : null;
};
