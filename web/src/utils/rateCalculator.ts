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
      const firstTier = tiers[0];
      const flatRate = firstTier.rate || 0;
      return {
        rate: Math.round(flatRate * 100) / 100,
        breakdown: `${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} rate: $${flatRate.toFixed(2)} (${firstTier.fromMiles}-${firstTier.toMiles} mi)`
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

    const baseRate = applicableTier[2];
    const baseMiles = applicableTier[1];

    let totalPayout = baseRate;
    let breakdown = `Tier: $${baseRate.toFixed(2)} (${applicableTier[0]}-${applicableTier[1]} mi)`;

    if (roundedMiles > baseMiles && additionalRate > 0) {
      const extra = roundedMiles - baseMiles;
      totalPayout += extra * additionalRate;
      breakdown += ` + ${extra}mi × $${additionalRate.toFixed(2)}`;
    }

    // Apply deductions [rental, insurance, %]
    const deductions = rates.deductions;
    let totalDeductions = 0;
    let dedBreakdown = '';

    if (deductions && Array.isArray(deductions)) {
      const [rental, insurance, percentage] = deductions;
      if (rental && rental > 0) { totalDeductions += rental; dedBreakdown += ` - Rental: $${rental.toFixed(2)}`; }
      if (insurance && insurance > 0) { totalDeductions += insurance; dedBreakdown += ` - Ins: $${insurance.toFixed(2)}`; }
      if (percentage && percentage > 0) { const pd = totalPayout * (percentage / 100); totalDeductions += pd; dedBreakdown += ` - ${percentage}%: $${pd.toFixed(2)}`; }
    }

    const finalPayout = Math.max(0, totalPayout - totalDeductions);
    breakdown += dedBreakdown ? dedBreakdown + ` = $${finalPayout.toFixed(2)}` : ` = $${totalPayout.toFixed(2)}`;

    return { payout: Math.round(finalPayout * 100) / 100, breakdown };
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
