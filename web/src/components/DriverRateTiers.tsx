import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DriverRateTier } from '../types';
import { supabase } from '../lib/supabase';

interface DriverRateTiersProps {
  driverId: string;
  onClose: () => void;
}

export const DriverRateTiers: React.FC<DriverRateTiersProps> = ({ driverId, onClose }) => {
  const [ambulatoryTiers, setAmbulatoryTiers] = useState<DriverRateTier[]>([
    { serviceLevel: 'ambulatory', fromMiles: 1, toMiles: 5, rate: 14 }
  ]);
  const [ambulatoryAdditionalRate, setAmbulatoryAdditionalRate] = useState(1.2);

  const [wheelchairTiers, setWheelchairTiers] = useState<DriverRateTier[]>([
    { serviceLevel: 'wheelchair', fromMiles: 1, toMiles: 5, rate: 28 }
  ]);
  const [wheelchairAdditionalRate, setWheelchairAdditionalRate] = useState(2);

  const [stretcherTiers, setStretcherTiers] = useState<DriverRateTier[]>([
    { serviceLevel: 'stretcher', fromMiles: 1, toMiles: 5, rate: 35 }
  ]);
  const [stretcherAdditionalRate, setStretcherAdditionalRate] = useState(2.5);

  const [cancellationRate, setCancellationRate] = useState(0);
  const [noShowRate, setNoShowRate] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRateTiers();
  }, [driverId]);

  const loadRateTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_rate_tiers')
        .select('*')
        .eq('driver_id', driverId)
        .order('service_level', { ascending: true })
        .order('from_miles', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const ambulatory = data.filter(t => t.service_level === 'ambulatory').map(t => ({
          id: t.id,
          driverId: t.driver_id,
          serviceLevel: t.service_level as 'ambulatory',
          fromMiles: Number(t.from_miles),
          toMiles: Number(t.to_miles),
          rate: Number(t.rate)
        }));

        const wheelchair = data.filter(t => t.service_level === 'wheelchair').map(t => ({
          id: t.id,
          driverId: t.driver_id,
          serviceLevel: t.service_level as 'wheelchair',
          fromMiles: Number(t.from_miles),
          toMiles: Number(t.to_miles),
          rate: Number(t.rate)
        }));

        const stretcher = data.filter(t => t.service_level === 'stretcher').map(t => ({
          id: t.id,
          driverId: t.driver_id,
          serviceLevel: t.service_level as 'stretcher',
          fromMiles: Number(t.from_miles),
          toMiles: Number(t.to_miles),
          rate: Number(t.rate)
        }));

        if (ambulatory.length) setAmbulatoryTiers(ambulatory);
        if (wheelchair.length) setWheelchairTiers(wheelchair);
        if (stretcher.length) setStretcherTiers(stretcher);
      }

      // Load additional rates and cancellation/no-show rates from driver record
      const { data: driverData } = await supabase
        .from('drivers')
        .select('ambulatory_additional_mile_rate, wheelchair_additional_mile_rate, stretcher_additional_mile_rate, cancellation_rate, no_show_rate')
        .eq('id', driverId)
        .single();

      if (driverData) {
        if (driverData.ambulatory_additional_mile_rate) setAmbulatoryAdditionalRate(Number(driverData.ambulatory_additional_mile_rate));
        if (driverData.wheelchair_additional_mile_rate) setWheelchairAdditionalRate(Number(driverData.wheelchair_additional_mile_rate));
        if (driverData.stretcher_additional_mile_rate) setStretcherAdditionalRate(Number(driverData.stretcher_additional_mile_rate));
        if (driverData.cancellation_rate !== null) setCancellationRate(Number(driverData.cancellation_rate));
        if (driverData.no_show_rate !== null) setNoShowRate(Number(driverData.no_show_rate));
      }
    } catch (error) {
      console.error('Error loading rate tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher') => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers :
                   setStretcherTiers;

    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers :
                  stretcherTiers;

    const lastTier = tiers[tiers.length - 1];
    const newTier: DriverRateTier = {
      serviceLevel,
      fromMiles: lastTier.toMiles + 1,
      toMiles: lastTier.toMiles + 5,
      rate: lastTier.rate + 5
    };

    setter([...tiers, newTier]);
  };

  const removeTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher', index: number) => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers :
                   setStretcherTiers;

    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers :
                  stretcherTiers;

    if (tiers.length > 1) {
      setter(tiers.filter((_, i) => i !== index));
    }
  };

  const updateTier = (
    serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
    index: number,
    field: 'fromMiles' | 'toMiles' | 'rate',
    value: number
  ) => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers :
                   setStretcherTiers;

    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers :
                  stretcherTiers;

    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setter(updated);
  };

  const saveRates = async (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher') => {
    try {
      const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                    serviceLevel === 'wheelchair' ? wheelchairTiers :
                    stretcherTiers;

      const additionalRate = serviceLevel === 'ambulatory' ? ambulatoryAdditionalRate :
                             serviceLevel === 'wheelchair' ? wheelchairAdditionalRate :
                             stretcherAdditionalRate;

      // Delete existing tiers
      await supabase
        .from('driver_rate_tiers')
        .delete()
        .eq('driver_id', driverId)
        .eq('service_level', serviceLevel);

      // Insert new tiers
      const { error: insertError } = await supabase
        .from('driver_rate_tiers')
        .insert(tiers.map(tier => ({
          driver_id: driverId,
          service_level: serviceLevel,
          from_miles: tier.fromMiles,
          to_miles: tier.toMiles,
          rate: tier.rate
        })));

      if (insertError) throw insertError;

      // Update additional rate
      const updateField = `${serviceLevel}_additional_mile_rate`;
      await supabase
        .from('drivers')
        .update({ [updateField]: additionalRate })
        .eq('id', driverId);

      alert(`${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} rates saved successfully!`);
    } catch (error) {
      console.error('Error saving rates:', error);
      alert('Failed to save rates. Please try again.');
    }
  };

  const saveSpecialRates = async () => {
    try {
      await supabase
        .from('drivers')
        .update({
          cancellation_rate: cancellationRate,
          no_show_rate: noShowRate
        })
        .eq('id', driverId);

      alert('Cancellation and No-Show rates saved successfully!');
    } catch (error) {
      console.error('Error saving special rates:', error);
      alert('Failed to save rates. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const renderTierSection = (
    title: string,
    serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
    tiers: DriverRateTier[],
    additionalRate: number,
    setAdditionalRate: (value: number) => void,
    colorClass: string
  ) => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>

      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">From (mi):</label>
              <input
                type="number"
                step="0.1"
                value={tier.fromMiles}
                onChange={e => updateTier(serviceLevel, index, 'fromMiles', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">To (mi):</label>
              <input
                type="number"
                step="0.1"
                value={tier.toMiles}
                onChange={e => updateTier(serviceLevel, index, 'toMiles', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rate ($):</label>
              <input
                type="number"
                step="0.01"
                value={tier.rate}
                onChange={e => updateTier(serviceLevel, index, 'rate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2 flex justify-end pt-6">
              {tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(serviceLevel, index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove tier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Rate for miles beyond highest tier ($/mile):
          </label>
          <input
            type="number"
            step="0.01"
            value={additionalRate}
            onChange={e => setAdditionalRate(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 mt-4">
        <button
          type="button"
          onClick={() => addTier(serviceLevel)}
          className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tier</span>
        </button>
        <button
          type="button"
          onClick={() => saveRates(serviceLevel)}
          className={`flex items-center space-x-2 px-4 py-2 text-white ${colorClass} rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold`}
        >
          <Save className="w-4 h-4" />
          <span>Save {title}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-h-[80vh] overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Rate Configuration</h2>
        <p className="text-sm text-gray-600">
          Configure tiered pricing for each service level. Each tier covers a specific mile range.
        </p>
      </div>

      {renderTierSection(
        'Ambulatory Rates',
        'ambulatory',
        ambulatoryTiers,
        ambulatoryAdditionalRate,
        setAmbulatoryAdditionalRate,
        'bg-blue-600'
      )}

      {renderTierSection(
        'Wheelchair Rates',
        'wheelchair',
        wheelchairTiers,
        wheelchairAdditionalRate,
        setWheelchairAdditionalRate,
        'bg-green-600'
      )}

      {renderTierSection(
        'Stretcher Rates',
        'stretcher',
        stretcherTiers,
        stretcherAdditionalRate,
        setStretcherAdditionalRate,
        'bg-amber-600'
      )}

      <div className="mb-8 pt-6 border-t">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Special Trip Rates</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set driver payout rates for cancelled and no-show trips. Leave at $0 if drivers should not be paid for these trips.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cancellation Rate ($):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cancellationRate}
              onChange={e => setCancellationRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Driver gets this amount when trip is cancelled</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              No-Show Rate ($):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={noShowRate}
              onChange={e => setNoShowRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Driver gets this amount when patient is a no-show</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveSpecialRates}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Save Special Rates</span>
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onClose}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
