import { supabase } from '../lib/supabase';

interface Driver {
  id: string;
  ambulatory_rate?: number;
  wheelchair_rate?: number;
  stretcher_rate?: number;
  ambulatory_base_miles?: number;
  wheelchair_base_miles?: number;
  stretcher_base_miles?: number;
  ambulatory_additional_mile_rate?: number;
  wheelchair_additional_mile_rate?: number;
  stretcher_additional_mile_rate?: number;
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
  const waitTimePay = 0; // Can be customized based on wait time rate
  let bonus = 0;

  const tripType = trip.trip_type?.toLowerCase() || 'ambulatory';
  const distance = trip.distance_miles || 0;

  // Calculate base fare and mileage based on trip type and driver rates
  switch (tripType) {
    case 'wheelchair':
      baseFare = driver.wheelchair_rate || 50;
      const wheelchairBaseMiles = driver.wheelchair_base_miles || 5;
      if (distance > wheelchairBaseMiles) {
        const additionalMiles = distance - wheelchairBaseMiles;
        mileagePay = additionalMiles * (driver.wheelchair_additional_mile_rate || 2.5);
      }
      break;

    case 'stretcher':
      baseFare = driver.stretcher_rate || 75;
      const stretcherBaseMiles = driver.stretcher_base_miles || 5;
      if (distance > stretcherBaseMiles) {
        const additionalMiles = distance - stretcherBaseMiles;
        mileagePay = additionalMiles * (driver.stretcher_additional_mile_rate || 3);
      }
      break;

    case 'ambulatory':
    default:
      baseFare = driver.ambulatory_rate || 35;
      const ambulatoryBaseMiles = driver.ambulatory_base_miles || 5;
      if (distance > ambulatoryBaseMiles) {
        const additionalMiles = distance - ambulatoryBaseMiles;
        mileagePay = additionalMiles * (driver.ambulatory_additional_mile_rate || 2);
      }
      break;
  }

  // Calculate bonuses (can be customized)
  // Example: Bonus for long-distance trips
  if (distance > 50) {
    bonus = 10;
  }

  // Example: Bonus for weekend/night trips
  // This would require trip time information

  const totalEarnings = baseFare + mileagePay + waitTimePay + bonus;

  return {
    base_fare: baseFare,
    mileage_pay: mileagePay,
    wait_time_pay: waitTimePay,
    bonus,
    total_earnings: totalEarnings,
  };
};

export const createDriverEarning = async (tripId: string, driverId: string) => {
  try {
    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error('Error fetching driver:', driverError);
      return null;
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      return null;
    }

    // Check if earnings already exist for this trip
    const { data: existingEarning } = await supabase
      .from('driver_earnings')
      .select('id')
      .eq('trip_id', tripId)
      .single();

    if (existingEarning) {
      console.log('Earnings already exist for this trip');
      return existingEarning;
    }

    // Calculate earnings
    const earnings = calculateDriverEarnings(driver, trip);

    // Create earnings record
    const { data, error } = await supabase
      .from('driver_earnings')
      .insert({
        driver_id: driverId,
        trip_id: tripId,
        ...earnings,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating earnings:', error);
      return null;
    }

    console.log('Driver earnings created:', data);
    return data;
  } catch (error) {
    console.error('Error in createDriverEarning:', error);
    return null;
  }
};

export const getDriverEarningsSummary = async (driverId: string, startDate?: string, endDate?: string) => {
  try {
    let query = supabase
      .from('driver_earnings')
      .select('*')
      .eq('driver_id', driverId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching earnings:', error);
      return null;
    }

    const summary = {
      totalEarnings: data?.reduce((sum, e) => sum + e.total_earnings, 0) || 0,
      pendingEarnings: data?.filter(e => e.payment_status === 'pending').reduce((sum, e) => sum + e.total_earnings, 0) || 0,
      paidEarnings: data?.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + e.total_earnings, 0) || 0,
      tripCount: data?.length || 0,
      totalBaseFare: data?.reduce((sum, e) => sum + e.base_fare, 0) || 0,
      totalMileagePay: data?.reduce((sum, e) => sum + e.mileage_pay, 0) || 0,
      totalWaitTimePay: data?.reduce((sum, e) => sum + e.wait_time_pay, 0) || 0,
      totalBonus: data?.reduce((sum, e) => sum + e.bonus, 0) || 0,
    };

    return summary;
  } catch (error) {
    console.error('Error in getDriverEarningsSummary:', error);
    return null;
  }
};

export const markEarningsAsPaid = async (earningIds: string[], paymentMethod: string = 'direct_deposit') => {
  try {
    const { error } = await supabase
      .from('driver_earnings')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      })
      .in('id', earningIds);

    if (error) {
      console.error('Error marking earnings as paid:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markEarningsAsPaid:', error);
    return false;
  }
};

export const getAllDriversEarningsSummary = async (startDate?: string, endDate?: string) => {
  try {
    let query = supabase
      .from('driver_earnings')
      .select(`
        *,
        drivers (
          id,
          name,
          first_name,
          last_name
        )
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all earnings:', error);
      return [];
    }

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
