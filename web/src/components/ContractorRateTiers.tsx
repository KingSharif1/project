import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import * as api from '../services/api';

// Local interface for rate tier structure
interface RateTier {
  fromMiles: number;
  toMiles: number;
  rate: number;
}

// JSONB structure for rate_tiers column
interface RateTiersJson {
  ambulatory?: RateTier[];
  wheelchair?: RateTier[];
  stretcher?: RateTier[];
  ambulatoryAdditionalRate?: number;
  wheelchairAdditionalRate?: number;
  stretcherAdditionalRate?: number;
}

interface ContractorRateTiersProps {
  contractorId: string;
  onClose: () => void;
}

export const ContractorRateTiers: React.FC<ContractorRateTiersProps> = ({ contractorId, onClose }) => {
  const [ambulatoryTiers, setAmbulatoryTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 14 }
  ]);
  const [ambulatoryAdditionalRate, setAmbulatoryAdditionalRate] = useState(0);

  const [wheelchairTiers, setWheelchairTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 28 }
  ]);
  const [wheelchairAdditionalRate, setWheelchairAdditionalRate] = useState(0);

  const [stretcherTiers, setStretcherTiers] = useState<RateTier[]>([
    { fromMiles: 1, toMiles: 5, rate: 35 }
  ]);
  const [stretcherAdditionalRate, setStretcherAdditionalRate] = useState(0);

  const [cancellationRate, setCancellationRate] = useState(0);
  const [noShowRate, setNoShowRate] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRateTiers();
  }, [contractorId]);

  const loadRateTiers = async () => {
    try {
      // Load all data via backend API
      const result = await api.getContractorRates(contractorId);
      const contractorData = result.data;

      if (contractorData) {
        // Parse rate_tiers JSONB
        const rateTiers = contractorData.rate_tiers as RateTiersJson || {};

        if (rateTiers.ambulatory?.length) {
          setAmbulatoryTiers(rateTiers.ambulatory);
        }
        if (rateTiers.wheelchair?.length) {
          setWheelchairTiers(rateTiers.wheelchair);
        }
        if (rateTiers.stretcher?.length) {
          setStretcherTiers(rateTiers.stretcher);
        }

        // Load additional rates from JSONB
        if (rateTiers.ambulatoryAdditionalRate) setAmbulatoryAdditionalRate(rateTiers.ambulatoryAdditionalRate);
        if (rateTiers.wheelchairAdditionalRate) setWheelchairAdditionalRate(rateTiers.wheelchairAdditionalRate);
        if (rateTiers.stretcherAdditionalRate) setStretcherAdditionalRate(rateTiers.stretcherAdditionalRate);

        // Load cancellation and no-show rates
        if (contractorData.cancellation_rate !== null) setCancellationRate(Number(contractorData.cancellation_rate));
        if (contractorData.no_show_rate !== null) setNoShowRate(Number(contractorData.no_show_rate));
      }
    } catch (error) {
      console.error('Error loading contractor rates:', error);
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
      fromMiles: lastTier ? lastTier.toMiles + 1 : 1,
      toMiles: lastTier ? lastTier.toMiles + 5 : 5,
      rate: lastTier ? lastTier.rate + 5 : 15
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
      // Build the rate_tiers JSONB object with all tiers and additional rates
      const rateTiersUpdate: RateTiersJson = {
        ambulatory: ambulatoryTiers,
        wheelchair: wheelchairTiers,
        stretcher: stretcherTiers,
        ambulatoryAdditionalRate,
        wheelchairAdditionalRate,
        stretcherAdditionalRate
      };

      // Update via backend API
      await api.updateContractorRates(contractorId, { rate_tiers: rateTiersUpdate });

      alert(`${serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1)} rates saved successfully!`);
    } catch (error) {
      console.error('Error saving rates:', error);
      alert('Failed to save rates. Please try again.');
    }
  };

  const saveSpecialRates = async () => {
    try {
      await api.updateContractorRates(contractorId, {
        cancellation_rate: cancellationRate,
        no_show_rate: noShowRate,
      });

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contractor Rate Configuration</h2>
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
        <h3 className="text-lg font-bold text-gray-900 mb-4">Special Fees</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set fees for cancelled and no-show trips.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cancellation Fee ($):
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              No-Show Fee ($):
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
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveSpecialRates}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Save Fees</span>
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
