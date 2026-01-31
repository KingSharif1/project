import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Save, AlertCircle, CheckCircle } from 'lucide-react';

const RATE_FIELDS = [
  { key: 'ambulatory_rate', label: 'Ambulatory • Base Rate ($)', type: 'currency' },
  { key: 'ambulatory_base_miles', label: 'Ambulatory • Base Miles', type: 'number' },
  { key: 'ambulatory_additional_mile_rate', label: 'Ambulatory • Additional $/mile', type: 'currency' },

  { key: 'wheelchair_rate', label: 'Wheelchair • Base Rate ($)', type: 'currency' },
  { key: 'wheelchair_base_miles', label: 'Wheelchair • Base Miles', type: 'number' },
  { key: 'wheelchair_additional_mile_rate', label: 'Wheelchair • Additional $/mile', type: 'currency' },

  { key: 'stretcher_rate', label: 'Stretcher • Base Rate ($)', type: 'currency' },
  { key: 'stretcher_base_miles', label: 'Stretcher • Base Miles', type: 'number' },
  { key: 'stretcher_additional_mile_rate', label: 'Stretcher • Additional $/mile', type: 'currency' },
] as const;

type RateKeys = typeof RATE_FIELDS[number]['key'];
type Driver = { id: string; name?: string } & Partial<Record<RateKeys, number | null>>;

interface DriverRateConfigProps {
  driverId: string;
  driverName?: string;
}

export const DriverRateConfig: React.FC<DriverRateConfigProps> = ({ driverId, driverName }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<RateKeys, boolean>>({} as any);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriver();
  }, [driverId]);

  const loadDriver = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(RATE_FIELDS.map(f => f.key).join(',') + ',id,name')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      setDriver(data as Driver);
    } catch (err) {
      console.error('Error loading driver rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load driver rates');
    } finally {
      setLoading(false);
    }
  };

  const canSave = useMemo(
    () => !!driver && Object.values(dirty).some(Boolean),
    [driver, dirty]
  );

  const updateLocal = (key: RateKeys, value: string) => {
    if (!driver) return;

    const v = value === '' ? null : Number(value);
    const numValue = isNaN(Number(v)) ? (driver[key] ?? null) : (v as number | null);

    setDriver({ ...driver, [key]: numValue });
    setDirty({ ...dirty, [key]: true });
    setSuccess(false);
  };

  const saveAll = async () => {
    if (!driver || !canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Build patch only for fields we touched
      const patch: Partial<Record<RateKeys, number | null>> = {};
      for (const f of RATE_FIELDS) {
        if (dirty[f.key]) {
          patch[f.key] = (driver as any)[f.key] ?? null;
        }
      }

      const { error } = await supabase
        .from('drivers')
        .update(patch)
        .eq('id', driver.id);

      if (error) throw error;

      setDirty({} as any);
      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving driver rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to save driver rates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading driver rates...</span>
        </div>
      </div>
    );
  }

  if (error && !driver) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-gray-600">Driver not found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Driver Rate Configuration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure base rates and additional mileage charges for {driverName || driver.name || 'driver'}
            </p>
          </div>
          <Calculator className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Ambulatory Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
            Ambulatory
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RATE_FIELDS.filter(f => f.key.startsWith('ambulatory')).map(({ key, label, type }) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {label.replace('Ambulatory • ', '')}
                </span>
                <div className="relative">
                  {type === 'currency' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  )}
                  <input
                    type="number"
                    step={type === 'currency' ? '0.01' : '1'}
                    min="0"
                    value={driver[key] ?? ''}
                    onChange={(e) => updateLocal(key, e.target.value)}
                    className={`w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      type === 'currency' ? 'pl-7' : ''
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Wheelchair Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
            Wheelchair
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RATE_FIELDS.filter(f => f.key.startsWith('wheelchair')).map(({ key, label, type }) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {label.replace('Wheelchair • ', '')}
                </span>
                <div className="relative">
                  {type === 'currency' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  )}
                  <input
                    type="number"
                    step={type === 'currency' ? '0.01' : '1'}
                    min="0"
                    value={driver[key] ?? ''}
                    onChange={(e) => updateLocal(key, e.target.value)}
                    className={`w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      type === 'currency' ? 'pl-7' : ''
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Stretcher Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-orange-50">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <span className="w-3 h-3 bg-orange-600 rounded-full mr-2"></span>
            Stretcher
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RATE_FIELDS.filter(f => f.key.startsWith('stretcher')).map(({ key, label, type }) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {label.replace('Stretcher • ', '')}
                </span>
                <div className="relative">
                  {type === 'currency' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  )}
                  <input
                    type="number"
                    step={type === 'currency' ? '0.01' : '1'}
                    min="0"
                    value={driver[key] ?? ''}
                    onChange={(e) => updateLocal(key, e.target.value)}
                    className={`w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      type === 'currency' ? 'pl-7' : ''
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <LivePreview driver={driver} />

        {/* Save Button and Messages */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            disabled={!canSave || saving}
            onClick={saveAll}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              canSave
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Rates'}
          </button>

          {canSave && !success && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              You have unsaved changes
            </span>
          )}

          {success && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Rates saved successfully!
            </span>
          )}

          {error && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function LivePreview({ driver }: { driver: Driver }) {
  const [miles, setMiles] = useState(15);
  const [level, setLevel] = useState<'ambulatory' | 'wheelchair' | 'stretcher'>('ambulatory');

  const result = useMemo(() => {
    const r = (k: RateKeys) => Number(driver[k] ?? 0);
    const round = Math.round(miles);

    const baseRate =
      level === 'ambulatory' ? r('ambulatory_rate') :
      level === 'wheelchair' ? r('wheelchair_rate') :
      r('stretcher_rate');

    const baseMiles =
      level === 'ambulatory' ? r('ambulatory_base_miles') :
      level === 'wheelchair' ? r('wheelchair_base_miles') :
      r('stretcher_base_miles');

    const addlRate =
      level === 'ambulatory' ? r('ambulatory_additional_mile_rate') :
      level === 'wheelchair' ? r('wheelchair_additional_mile_rate') :
      r('stretcher_additional_mile_rate');

    const addlMiles = Math.max(round - baseMiles, 0);
    const total = baseRate + addlMiles * addlRate;

    return { round, baseRate, baseMiles, addlMiles, addlRate, total };
  }, [driver, miles, level]);

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Live Rate Calculator</h4>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Service Level</span>
          <select
            className="border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
          >
            <option value="ambulatory">Ambulatory</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="stretcher">Stretcher</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Trip Miles</span>
          <input
            className="border border-gray-300 rounded-lg p-2.5 w-32 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            type="number"
            step="0.1"
            min="0"
            value={miles}
            onChange={(e) => setMiles(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="bg-white rounded-lg p-4 space-y-2 text-sm border border-gray-200">
        <div className="flex justify-between">
          <span className="text-gray-600">Miles (rounded):</span>
          <span className="font-semibold text-gray-900">{result.round} miles</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Base Rate:</span>
          <span className="font-semibold text-gray-900">
            ${result.baseRate.toFixed(2)} <span className="text-xs text-gray-500">(first {result.baseMiles} miles)</span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Additional Miles:</span>
          <span className="font-semibold text-gray-900">
            {result.addlMiles} miles × ${result.addlRate.toFixed(2)}/mi = ${(result.addlMiles * result.addlRate).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t-2 border-gray-300">
          <span className="font-bold text-gray-900">Total Driver Payout:</span>
          <span className="text-xl font-bold text-blue-600">${result.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
