import * as api from '../services/api';

interface Driver {
  id: string;
  rates?: any; // Compact JSONB: { ambulatory: [...[from,to,rate], additionalRate], ..., deductions: [rental, insurance, %] }
}

interface Trip {
  id: string;
  driver_id: string;
  trip_type: string;
  distance_miles: number;
  wait_time_minutes?: number;
  rate: number;
  total_charge: number;
}

export const calculateDriverEarnings = (driver: Driver, trip: Trip) => {
  let baseFare = 0;
  let mileagePay = 0;
  const waitTimePay = 0;
  let bonus = 0;
  let deductionTotal = 0;

  const tripType = trip.trip_type?.toLowerCase() || 'ambulatory';
  const distance = trip.distance_miles || 0;
  const roundedMiles = Math.round(distance);

  const rates = driver.rates || {};
  const serviceLevelRates = rates[tripType] || rates['ambulatory'];

  if (serviceLevelRates && Array.isArray(serviceLevelRates) && serviceLevelRates.length > 0) {
    // Parse compact format: [...[from,to,rate], additionalRate]
    const additionalRate = typeof serviceLevelRates[serviceLevelRates.length - 1] === 'number' && !Array.isArray(serviceLevelRates[serviceLevelRates.length - 1])
      ? serviceLevelRates[serviceLevelRates.length - 1]
      : 0;
    const tiers = serviceLevelRates.filter((item: any) => Array.isArray(item));

    // Find applicable tier [from, to, rate]
    let applicableTier = tiers.find((t: number[]) => roundedMiles >= t[0] && roundedMiles <= t[1]);
    if (!applicableTier && tiers.length > 0) applicableTier = tiers[tiers.length - 1];

    if (applicableTier) {
      baseFare = applicableTier[2];
      const baseMiles = applicableTier[1];
      if (roundedMiles > baseMiles && additionalRate > 0) {
        mileagePay = (roundedMiles - baseMiles) * additionalRate;
      }
    }

    // Apply deductions [rental, insurance, %]
    const deductions = rates.deductions;
    if (deductions && Array.isArray(deductions)) {
      const [rental, insurance, percentage] = deductions;
      if (rental) deductionTotal += rental;
      if (insurance) deductionTotal += insurance;
      if (percentage) deductionTotal += (baseFare + mileagePay) * (percentage / 100);
    }
  } else {
    // Default rates if no tiers configured
    const defaults: Record<string, { base: number; baseMiles: number; additional: number }> = {
      ambulatory: { base: 35, baseMiles: 5, additional: 2 },
      wheelchair: { base: 50, baseMiles: 5, additional: 2.5 },
      stretcher: { base: 75, baseMiles: 5, additional: 3 },
    };
    const d = defaults[tripType] || defaults['ambulatory'];
    baseFare = d.base;
    if (distance > d.baseMiles) {
      mileagePay = (distance - d.baseMiles) * d.additional;
    }
  }

  if (distance > 50) bonus = 10;

  const totalEarnings = Math.max(0, baseFare + mileagePay + waitTimePay + bonus - deductionTotal);

  return {
    base_fare: baseFare,
    mileage_pay: mileagePay,
    wait_time_pay: waitTimePay,
    bonus,
    total_earnings: Math.round(totalEarnings * 100) / 100,
  };
};

export const createDriverEarning = async (tripId: string, driverId: string) => {
  try {
    // Create earnings via backend API
    const result = await api.createDriverEarning(tripId, driverId);
    if (result.success) {
      console.log('Driver earnings created:', result.data);
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('Error in createDriverEarning:', error);
    return null;
  }
};

export const getDriverEarningsSummary = async (driverId: string, startDate?: string, endDate?: string) => {
  try {
    const result = await api.getDriverEarnings(driverId, startDate, endDate);
    const data = result.data || [];

    const summary = {
      totalEarnings: data.reduce((sum: number, e: any) => sum + e.total_earnings, 0),
      pendingEarnings: data.filter((e: any) => e.payment_status === 'pending').reduce((sum: number, e: any) => sum + e.total_earnings, 0),
      paidEarnings: data.filter((e: any) => e.payment_status === 'paid').reduce((sum: number, e: any) => sum + e.total_earnings, 0),
      tripCount: data.length,
      totalBaseFare: data.reduce((sum: number, e: any) => sum + e.base_fare, 0),
      totalMileagePay: data.reduce((sum: number, e: any) => sum + e.mileage_pay, 0),
      totalWaitTimePay: data.reduce((sum: number, e: any) => sum + e.wait_time_pay, 0),
      totalBonus: data.reduce((sum: number, e: any) => sum + e.bonus, 0),
    };

    return summary;
  } catch (error) {
    console.error('Error in getDriverEarningsSummary:', error);
    return null;
  }
};

export const markEarningsAsPaid = async (earningIds: string[], paymentMethod: string = 'direct_deposit') => {
  try {
    const result = await api.markEarningsAsPaid(earningIds, paymentMethod);
    return result.success;
  } catch (error) {
    console.error('Error in markEarningsAsPaid:', error);
    return false;
  }
};

export const getAllDriversEarningsSummary = async (startDate?: string, endDate?: string) => {
  try {
    const result = await api.getAllDriversEarnings(startDate, endDate);
    const data = result.data || [];

    // Group by driver
    const driverEarnings = new Map();

    data?.forEach((earning: any) => {
      const driverId = earning.driver_id;
      if (!driverEarnings.has(driverId)) {
        driverEarnings.set(driverId, {
          driverId,
          driverName: earning.drivers?.name || `${earning.drivers?.first_name || ''} ${earning.drivers?.last_name || ''}`.trim(),
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          tripCount: 0,
        });
      }

      const summary = driverEarnings.get(driverId);
      summary.totalEarnings += earning.total_earnings;
      summary.tripCount += 1;

      if (earning.payment_status === 'pending') {
        summary.pendingEarnings += earning.total_earnings;
      } else if (earning.payment_status === 'paid') {
        summary.paidEarnings += earning.total_earnings;
      }
    });

    return Array.from(driverEarnings.values());
  } catch (error) {
    console.error('Error in getAllDriversEarningsSummary:', error);
    return [];
  }
};
