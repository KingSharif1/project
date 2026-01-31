import { Trip, Driver, Clinic, Facility } from '../types';
import { supabase } from '../lib/supabase';

interface RateCalculation {
  facilityRate: number;
  driverPayout: number;
  facilityBreakdown: string;
  driverBreakdown: string;
}

/**
 * Calculate facility rate based on clinic configuration
 * Uses FLAT RATES configured in the facility/clinic settings
 */
export const calculateFacilityRate = (
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
  distanceMiles: number,
  clinic?: Clinic | Facility
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

  // Use the configured flat rate from the clinic
  // These are flat rates per trip, NOT base rates with mileage charges
  let flatRate = 0;

  switch (serviceLevel) {
    case 'ambulatory':
      flatRate = clinic.ambulatoryRate || 35;
      break;
    case 'wheelchair':
      flatRate = clinic.wheelchairRate || 50;
      break;
    case 'stretcher':
      flatRate = clinic.stretcherRate || 65;
      break;
  }

  return {
    rate: Math.round(flatRate * 100) / 100,
    breakdown: `${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} flat rate: $${flatRate.toFixed(2)}`
  };
};

/**
 * Calculate driver payout based on driver's configured rate tiers
 */
interface DriverRateSchema {
  cancellation_rate: number | null;
  no_show_rate: number | null;
  ambulatory_rate: number | null;
  ambulatory_base_miles: number | null;
  ambulatory_additional_mile_rate: number | null;
  wheelchair_rate: number | null;
  wheelchair_base_miles: number | null;
  wheelchair_additional_mile_rate: number | null;
  stretcher_rate: number | null;
  stretcher_base_miles: number | null;
  stretcher_additional_mile_rate: number | null;
}

/**
 * Calculate driver payout based on driver's configured rate tiers
 */
export const calculateDriverPayout = async (
  driverId: string,
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
  distanceMiles: number,
  tripStatus?: string
): Promise<{ payout: number; breakdown: string }> => {
  try {
    // Fetch driver data for special rates AND base rate configuration
    const { data: rawDriverData, error } = await supabase
      .from('drivers')
      .select(`
        cancellation_rate,
        no_show_rate,
        ambulatory_rate,
        ambulatory_base_miles,
        ambulatory_additional_mile_rate,
        wheelchair_rate,
        wheelchair_base_miles,
        wheelchair_additional_mile_rate,
        stretcher_rate,
        stretcher_base_miles,
        stretcher_additional_mile_rate
      `)
      .eq('id', driverId)
      .single();

    if (error) throw error;
    const driverData = rawDriverData as unknown as DriverRateSchema;

    // Check for special status rates (cancelled or no-show)
    if (tripStatus === 'cancelled' && driverData?.cancellation_rate !== null && driverData?.cancellation_rate !== undefined) {
      const rate = Number(driverData.cancellation_rate);
      return {
        payout: rate,
        breakdown: `Cancellation rate: $${rate.toFixed(2)}`
      };
    }

    if (tripStatus === 'no-show' && driverData?.no_show_rate !== null && driverData?.no_show_rate !== undefined) {
      const rate = Number(driverData.no_show_rate);
      return {
        payout: rate,
        breakdown: `No-show rate: $${rate.toFixed(2)}`
      };
    }

    // For cancelled or no-show without custom rate, driver gets $0
    if (tripStatus === 'cancelled' || tripStatus === 'no-show') {
      return {
        payout: 0,
        breakdown: `${tripStatus === 'cancelled' ? 'Cancelled' : 'No-show'}: $0.00 (no custom rate set)`
      };
    }

    // Round mileage for rate calculation purposes
    const roundedMiles = Math.round(distanceMiles);

    // Check if driver has base rate configuration (new system)
    const baseRateField = `${serviceLevel}_rate` as keyof DriverRateSchema;
    const baseMilesField = `${serviceLevel}_base_miles` as keyof DriverRateSchema;
    const additionalRateField = `${serviceLevel}_additional_mile_rate` as keyof DriverRateSchema;

    if (driverData && driverData[baseRateField] !== null && driverData[baseRateField] !== undefined) {
      // Use new base rate system
      const baseRate = Number(driverData[baseRateField]);
      const baseMiles = Number(driverData[baseMilesField] || 0);
      const additionalRate = Number(driverData[additionalRateField] || 0);

      let totalPayout = baseRate;
      let breakdown = `Base Rate: $${baseRate.toFixed(2)} (includes ${baseMiles} miles)`;

      // Calculate additional miles charge
      if (roundedMiles > baseMiles) {
        const additionalMiles = roundedMiles - baseMiles;
        const additionalCharge = additionalMiles * additionalRate;
        totalPayout += additionalCharge;
        breakdown += ` + ${additionalMiles} miles × $${additionalRate.toFixed(2)}/mi = $${totalPayout.toFixed(2)}`;
      }

      return {
        payout: Math.round(totalPayout * 100) / 100,
        breakdown
      };
    }

    // Fall back to driver rate tiers (legacy system)
    const { data: rawTiers, error: tierError } = await supabase
      .from('driver_rate_tiers')
      .select('*')
      .eq('driver_id', driverId)
      .eq('service_level', serviceLevel)
      .order('from_miles', { ascending: true });

    if (tierError) throw tierError;
    
    // Define local interface for DB row structure
    interface DriverRateTierRow {
      driver_id: string;
      service_level: string;
      from_miles: number;
      to_miles: number;
      rate: number;
      contracted_rate?: number;
      additional_mile_rate?: number;
    }

    const tiers = rawTiers as unknown as DriverRateTierRow[];

    if (!tiers || tiers.length === 0) {
      // Use default rates if no tiers configured
      // Note: calculateDefaultDriverPayout rounds the miles internally
      return calculateDefaultDriverPayout(serviceLevel, distanceMiles);
    }

    // Find applicable tier based on distance
    let baseTier = tiers.find(t =>
      roundedMiles >= Number(t.from_miles) && roundedMiles <= Number(t.to_miles)
    );

    if (!baseTier) {
      // If distance exceeds all tiers, use the last tier
      baseTier = tiers[tiers.length - 1];
    }

    // Use contracted_rate if available, otherwise fall back to rate
    const baseRate = Number(baseTier!.contracted_rate || baseTier!.rate);
    const baseMiles = Number(baseTier!.to_miles);

    let totalPayout = baseRate;
    let breakdown = `Contracted Rate: $${baseRate.toFixed(2)} (${baseTier!.from_miles}-${baseTier!.to_miles} miles)`;

    // Calculate additional miles charge
    if (roundedMiles > baseMiles) {
      const additionalMiles = roundedMiles - baseMiles;
      const additionalRate = Number(baseTier!.additional_mile_rate || 1.0);
      const additionalCharge = additionalMiles * additionalRate;
      totalPayout += additionalCharge;
      breakdown += ` + ${additionalMiles} miles × $${additionalRate}/mi = $${totalPayout.toFixed(2)}`;
    }

    return {
      payout: Math.round(totalPayout * 100) / 100,
      breakdown
    };
  } catch (error) {
    console.error('Error calculating driver payout:', error);
    // Use distanceMiles in catch block since roundedMiles is not in scope
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
 * Calculate both facility rate and driver payout for a trip
 */
export const calculateTripRates = async (
  trip: Partial<Trip>,
  driver?: Driver,
  clinic?: Clinic | Facility
): Promise<RateCalculation> => {
  const serviceLevel = trip.serviceLevel || 'ambulatory';
  const distanceMiles = trip.distanceMiles || trip.distance || 0;

  // Calculate facility rate
  const facilityCalc = calculateFacilityRate(serviceLevel, distanceMiles, clinic);

  // Calculate driver payout
  let driverCalc = { payout: 0, breakdown: 'No driver assigned' };
  if (driver?.id || trip.driverId) {
    const driverId = driver?.id || trip.driverId!;
    driverCalc = await calculateDriverPayout(driverId, serviceLevel, distanceMiles, trip.status);
  }

  // Apply no-show or cancellation rates if applicable
  let finalFacilityRate = facilityCalc.rate;
  let facilityBreakdown = facilityCalc.breakdown;

  if (trip.status === 'no-show' && clinic?.noShowRate) {
    finalFacilityRate = clinic.noShowRate;
    facilityBreakdown = `No-show rate: $${clinic.noShowRate.toFixed(2)}`;
  } else if (trip.status === 'cancelled' && clinic?.cancellationRate) {
    finalFacilityRate = clinic.cancellationRate;
    facilityBreakdown = `Cancellation rate: $${clinic.cancellationRate.toFixed(2)}`;
  }

  return {
    facilityRate: finalFacilityRate,
    driverPayout: driverCalc.payout,
    facilityBreakdown,
    driverBreakdown: driverCalc.breakdown
  };
};

/**
 * Apply calculated rates to a trip
 */
export const applyCalculatedRates = async (
  trip: Trip,
  driver?: Driver,
  clinic?: Clinic | Facility
): Promise<Partial<Trip>> => {
  const rates = await calculateTripRates(trip, driver, clinic);

  return {
    fare: rates.facilityRate,
    driverPayout: rates.driverPayout,
    rate: rates.facilityRate,
    totalCharge: rates.facilityRate
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
