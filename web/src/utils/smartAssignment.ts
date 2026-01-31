import { Driver, Trip } from '../types';

interface DriverScore {
  driver: Driver;
  score: number;
  reasons: string[];
}

export function calculateDriverScore(
  driver: Driver,
  tripType: string,
  currentTrips: Trip[]
): DriverScore {
  let score = 100;
  const reasons: string[] = [];

  if (driver.status !== 'available') {
    score -= 100;
    reasons.push('Driver not available');
    return { driver, score, reasons };
  }

  const driverTripsToday = currentTrips.filter(
    t => t.driverId === driver.id &&
    new Date(t.scheduledPickupTime).toDateString() === new Date().toDateString()
  );

  const tripCount = driverTripsToday.length;
  if (tripCount > 5) {
    score -= 20;
    reasons.push(`Already has ${tripCount} trips today`);
  }

  if (driver.rating >= 4.5) {
    score += 15;
    reasons.push(`High rating (${driver.rating.toFixed(1)})`);
  } else if (driver.rating < 3.5) {
    score -= 10;
    reasons.push(`Lower rating (${driver.rating.toFixed(1)})`);
  }

  reasons.push(`Experience: ${driver.totalTrips} trips`);

  return { driver, score, reasons };
}

export function suggestBestDriver(
  drivers: Driver[],
  tripType: string,
  currentTrips: Trip[]
): DriverScore[] {
  const scoredDrivers = drivers
    .filter(d => d.isActive)
    .map(driver => calculateDriverScore(driver, tripType, currentTrips))
    .sort((a, b) => b.score - a.score);

  return scoredDrivers.slice(0, 3);
}
