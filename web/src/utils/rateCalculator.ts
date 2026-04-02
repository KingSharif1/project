import { Trip, Driver, Clinic, Contractor } from '../types';
import * as api from '../services/api';

interface RateCalculation {
  contractorRate: number;
  driverPayout: number;
  contractorBreakdown: string;
  driverBreakdown: string;
}

/**
 * Calculate contractor rate based on clinic configuration
 * Uses FLAT RATES configured in the contractor/clinic settings
 */
export const calculateContractorRate = (
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
  distanceMiles: number,
  clinic?: Clinic | Contractor
): { rate: number; breakdown: string } => {
  if (!clinic) {
    // Default per-mile rates if no clinic configured
    const defaultRates = {
      ambulatory: 3.5,
      wheelchair: 5.0,
      stretcher: 6.0
    };
    const baseRate = defaultRates[serviceLevel] * distanceMiles;
    return {
      rate: baseRate,
      breakdown: `${distanceMiles.toFixed(1)} miles × $${defaultRates[serviceLevel]}/mi = $${baseRate.toFixed(2)}`
    };
  }

  // Check if this source uses rateTiers JSONB (contractors) or flat fields (clinics)
  const rt = (clinic as any).rateTiers;
  if (rt && typeof rt === 'object') {
    // Contractor: read from rateTiers JSONB
    const tiers = rt[serviceLevel];
    if (Array.isArray(tiers) && tiers.length > 0) {
      const roundedMiles = Math.round(distanceMiles);
      const label = serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1);

      // Find the tier that matches the mileage
      let matchedTier = tiers.find((t: any) => roundedMiles >= t.fromMiles && roundedMiles <= t.toMiles);
      // If no tier matches (miles exceed all tiers), use the last/highest tier
      if (!matchedTier) matchedTier = tiers[tiers.length - 1];

      const lastTier = tiers[tiers.length - 1];
      const maxBaseMiles = lastTier.toMiles; // e.g. 10
      const tierRate = matchedTier.rate || 0;
      let totalRate = tierRate;
      let breakdown = `${label}: $${tierRate.toFixed(2)} (${matchedTier.fromMiles}-${matchedTier.toMiles} mi)`;

      // Additional mileage kicks in after the LAST tier's max (e.g. after mile 10)
      const additionalKey = `${serviceLevel}AdditionalRate`;
      const additionalRate = rt[additionalKey] || 0;
      if (roundedMiles > maxBaseMiles && additionalRate > 0) {
        const extraMiles = roundedMiles - maxBaseMiles;
        const extraCharge = extraMiles * additionalRate;
        totalRate += extraCharge;
        breakdown += ` + ${extraMiles}mi × $${additionalRate.toFixed(2)}/mi = $${totalRate.toFixed(2)}`;
      }

      return {
        rate: Math.round(totalRate * 100) / 100,
        breakdown
      };
    }
  }

  // Clinic: use flat rate fields
  let flatRate = 0;
  switch (serviceLevel) {
    case 'ambulatory':
      flatRate = (clinic as any).ambulatoryRate || 35;
      break;
    case 'wheelchair':
      flatRate = (clinic as any).wheelchairRate || 50;
      break;
    case 'stretcher':
      flatRate = (clinic as any).stretcherRate || 65;
      break;
  }

  return {
    rate: Math.round(flatRate * 100) / 100,
    breakdown: `${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} flat rate: $${flatRate.toFixed(2)}`
  };
};

// Compact rates JSONB format:
// { ambulatory: [...[from,to,rate], additionalRate], wheelchair: [...], stretcher: [...], deductions: [rental, insurance, %] }

/**
 * Calculate driver payout based on driver's compact rates JSONB
 */
export const calculateDriverPayout = async (
  driverId: string,
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
  distanceMiles: number,
  tripStatus?: string
): Promise<{ payout: number; breakdown: string }> => {
  try {
    // Fetch driver rates via backend API (returns the single rates JSONB)
    const result = await api.getDriverRates(driverId);
    const rates = result.data || {};

    // For cancelled or no-show trips, driver gets $0
    if (tripStatus === 'cancelled' || tripStatus === 'no-show') {
      return { payout: 0, breakdown: `${tripStatus === 'cancelled' ? 'Cancelled' : 'No-show'}: $0.00` };
    }

    const roundedMiles = Math.round(distanceMiles);
    const serviceLevelRates = rates[serviceLevel];

    if (!serviceLevelRates || !Array.isArray(serviceLevelRates) || serviceLevelRates.length === 0) {
      return calculateDefaultDriverPayout(serviceLevel, distanceMiles);
    }

    // Parse compact format: [...[from,to,rate], additionalRate]
    const additionalRate = typeof serviceLevelRates[serviceLevelRates.length - 1] === 'number' && !Array.isArray(serviceLevelRates[serviceLevelRates.length - 1])
      ? serviceLevelRates[serviceLevelRates.length - 1]
      : 0;
    const tiers = serviceLevelRates.filter((item: any) => Array.isArray(item));

    if (tiers.length === 0) {
      return calculateDefaultDriverPayout(serviceLevel, distanceMiles);
    }

    // Find applicable tier [from, to, rate]
    let applicableTier = tiers.find((t: number[]) => roundedMiles >= t[0] && roundedMiles <= t[1]);
    if (!applicableTier) applicableTier = tiers[tiers.length - 1];

    // Last tier defines the max base miles (e.g. 10)
    const lastTier = tiers[tiers.length - 1];
    const maxBaseMiles = lastTier[1];

    const baseRate = applicableTier[2];
    let totalPayout = baseRate;
    let breakdown = `$${baseRate.toFixed(2)} (${applicableTier[0]}-${applicableTier[1]} mi)`;

    // Additional mileage kicks in after the LAST tier's max
    if (roundedMiles > maxBaseMiles && additionalRate > 0) {
      const extra = roundedMiles - maxBaseMiles;
      totalPayout += extra * additionalRate;
      breakdown += ` + ${extra}mi × $${additionalRate.toFixed(2)} = $${totalPayout.toFixed(2)}`;
    }

    // NOTE: Deductions (rental, insurance, %) are applied per PAY PERIOD in the payout export,
    // NOT per trip. See DriverProfilePage payout export modal for deduction logic.

    return { payout: Math.round(totalPayout * 100) / 100, breakdown };
  } catch (error) {
    console.error('Error calculating driver payout:', error);
    return calculateDefaultDriverPayout(serviceLevel, distanceMiles);
  }
};

/**
 * Calculate default driver payout when no tiers configured
 */
const calculateDefaultDriverPayout = (
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
  distanceMiles: number
): { payout: number; breakdown: string } => {
  // Round mileage for rate calculation purposes
  const roundedMiles = Math.round(distanceMiles);

  const defaultTiers = {
    ambulatory: { base: 14, baseMiles: 5, additional: 1.2 },
    wheelchair: { base: 28, baseMiles: 5, additional: 2.0 },
    stretcher: { base: 35, baseMiles: 5, additional: 2.5 }
  };

  const tier = defaultTiers[serviceLevel];
  let payout = tier.base;
  let breakdown = `Base: $${tier.base.toFixed(2)} (1-${tier.baseMiles} miles)`;

  if (roundedMiles > tier.baseMiles) {
    const additionalMiles = roundedMiles - tier.baseMiles;
    const additionalCharge = additionalMiles * tier.additional;
    payout += additionalCharge;
    breakdown += ` + ${additionalMiles} miles × $${tier.additional}/mi = $${payout.toFixed(2)}`;
  }

  return {
    payout: Math.round(payout * 100) / 100,
    breakdown
  };
};

/**
 * Calculate both contractor rate and driver payout for a trip
 */
export const calculateTripRates = async (
  trip: Partial<Trip>,
  driver?: Driver,
  clinic?: Clinic | Contractor
): Promise<RateCalculation> => {
  const serviceLevel = trip.serviceLevel || 'ambulatory';
  const distanceMiles = trip.distanceMiles || trip.distance || 0;

  // Calculate contractor rate
  const contractorCalc = calculateContractorRate(serviceLevel, distanceMiles, clinic);

  // Calculate driver payout
  let driverCalc = { payout: 0, breakdown: 'No driver assigned' };
  if (driver?.id || trip.driverId) {
    const driverId = driver?.id || trip.driverId!;
    driverCalc = await calculateDriverPayout(driverId, serviceLevel, distanceMiles, trip.status);
  }

  // Apply no-show or cancellation rates if applicable
  let finalContractorRate = contractorCalc.rate;
  let contractorBreakdown = contractorCalc.breakdown;

  // Check rateTiers JSONB first (contractors), then flat fields (clinics)
  const rt = (clinic as any)?.rateTiers;
  const nsRate = rt?.noShowRate ?? (clinic as any)?.noShowRate;
  const cnRate = rt?.cancellationRate ?? (clinic as any)?.cancellationRate;

  if (trip.status === 'no-show' && nsRate) {
    finalContractorRate = nsRate;
    contractorBreakdown = `No-show rate: $${nsRate.toFixed(2)}`;
  } else if (trip.status === 'cancelled' && cnRate) {
    finalContractorRate = cnRate;
    contractorBreakdown = `Cancellation rate: $${cnRate.toFixed(2)}`;
  }

  return {
    contractorRate: finalContractorRate,
    driverPayout: driverCalc.payout,
    contractorBreakdown,
    driverBreakdown: driverCalc.breakdown
  };
};

/**
 * Apply calculated rates to a trip
 */
export const applyCalculatedRates = async (
  trip: Trip,
  driver?: Driver,
  clinic?: Clinic | Contractor
): Promise<Partial<Trip>> => {
  const rates = await calculateTripRates(trip, driver, clinic);

  return {
    fare: rates.contractorRate,
    driverPayout: rates.driverPayout,
    rate: rates.contractorRate,
    totalCharge: rates.contractorRate
  };
};

/**
 * Calculate wait time charges
 */
export const calculateWaitTimeCharge = (
  waitTimeMinutes: number,
  ratePerMinute: number = 0.5
): number => {
  // First 5 minutes free, then charge per minute
  const chargeableMinutes = Math.max(0, waitTimeMinutes - 5);
  return Math.round(chargeableMinutes * ratePerMinute * 100) / 100;
};
