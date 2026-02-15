import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import * as api from '../services/api';

// Local interface for rate tier structure
interface RateTier {
  fromMiles: number;
  toMiles: number;
  rate: number;
}

// Rates are stored as a single compact JSONB:
// { ambulatory: [...[from,to,rate], additionalRate], wheelchair: [...], stretcher: [...], deductions: [rental, insurance, %] }

interface DriverRateTiersProps {
  driverId: string;
  onClose: () => void;
}

export const DriverRateTiers: React.FC<DriverRateTiersProps> = ({ driverId, onClose }) => {
  const [ambulatoryTiers, setAmbulatoryTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 14 }
  ]);
  const [ambulatoryAdditionalRate, setAmbulatoryAdditionalRate] = useState(1.2);

  const [wheelchairTiers, setWheelchairTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 28 }
  ]);
  const [wheelchairAdditionalRate, setWheelchairAdditionalRate] = useState(2);

  const [stretcherTiers, setStretcherTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 35 }
  ]);
  const [stretcherAdditionalRate, setStretcherAdditionalRate] = useState(2.5);

  // Deductions (instead of cancellation/no-show for drivers)
  const [vehicleRentalDeduction, setVehicleRentalDeduction] = useState(0);
  const [insuranceDeduction, setInsuranceDeduction] = useState(0);
  const [percentageDeduction, setPercentageDeduction] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRateTiers();
  }, [driverId]);

  const loadRateTiers = async () => {
    try {
      // Load single rates JSONB via backend API
      const result = await api.getDriverRates(driverId);
      const rates = result.data || {};

      // Parse compact format: each service level is [...[from,to,rate], additionalRate]
      const parseServiceLevel = (arr: any[]) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
        const additionalRate = typeof arr[arr.length - 1] === 'number' && !Array.isArray(arr[arr.length - 1]) ? arr[arr.length - 1] : 0;
        const tierArrays = arr.filter(item => Array.isArray(item));
        const tiers = tierArrays.map((t: number[]) => ({ fromMiles: t[0], toMiles: t[1], rate: t[2] }));
        return { tiers, additionalRate };
      };

      if (rates.ambulatory) {
        const parsed = parseServiceLevel(rates.ambulatory);
        if (parsed?.tiers.length) setAmbulatoryTiers(parsed.tiers);
        if (parsed) setAmbulatoryAdditionalRate(parsed.additionalRate);
      }
      if (rates.wheelchair) {
        const parsed = parseServiceLevel(rates.wheelchair);
        if (parsed?.tiers.length) setWheelchairTiers(parsed.tiers);
        if (parsed) setWheelchairAdditionalRate(parsed.additionalRate);
      }
      if (rates.stretcher) {
        const parsed = parseServiceLevel(rates.stretcher);
        if (parsed?.tiers.length) setStretcherTiers(parsed.tiers);
        if (parsed) setStretcherAdditionalRate(parsed.additionalRate);
      }
      if (rates.deductions && Array.isArray(rates.deductions)) {
        setVehicleRentalDeduction(rates.deductions[0] || 0);
        setInsuranceDeduction(rates.deductions[1] || 0);
        setPercentageDeduction(rates.deductions[2] || 0);
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
    const newTier: RateTier = {
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

  // Build compact rates JSONB and save all at once
  const buildCompactRates = () => ({
    ambulatory: [...ambulatoryTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), ambulatoryAdditionalRate],
    wheelchair: [...wheelchairTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), wheelchairAdditionalRate],
    stretcher: [...stretcherTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), stretcherAdditionalRate],
    deductions: [vehicleRentalDeduction, insuranceDeduction, percentageDeduction],
  });

  const saveRates = async (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher') => {
    try {
      await api.updateDriverRates(driverId, { rates: buildCompactRates() });
      alert(`${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} rates saved successfully!`);
    } catch (error) {
      console.error('Error saving rates:', error);
      alert('Failed to save rates. Please try again.');
    }
  };

  const saveDeductions = async () => {
    try {
      await api.updateDriverRates(driverId, { rates: buildCompactRates() });
      alert('Deductions saved successfully!');
    } catch (error) {
      console.error('Error saving deductions:', error);
      alert('Failed to save deductions. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const renderTierSection = (
    title: string,
    serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher',
    tiers: RateTier[],
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
        <h3 className="text-lg font-bold text-gray-900 mb-4">Deductions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set deductions that will be applied after calculating the driver's total payout.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Vehicle Rental ($):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={vehicleRentalDeduction}
              onChange={e => setVehicleRentalDeduction(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Fixed amount deducted for vehicle rental</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Insurance ($):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={insuranceDeduction}
              onChange={e => setInsuranceDeduction(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Fixed amount deducted for insurance</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Percentage (%):
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentageDeduction}
              onChange={e => setPercentageDeduction(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Percentage deducted from total payout</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveDeductions}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Save Deductions</span>
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
