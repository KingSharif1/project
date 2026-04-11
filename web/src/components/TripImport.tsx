import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// CSV column headers from the template (0-indexed)
const CSV_COLUMNS = [
  'TripId', 'FirstName', 'LastName', 'RiderPhone', 'DOB',
  'PickupStreet', 'PickupCity', 'PickupState', 'PickupZip',
  'DropoffStreet', 'DropoffCity', 'DropoffState', 'DropoffZip',
  'AppointmentTime', 'PUDate', 'PUTime', 'FacilityPhone',
  'LOS', 'TripType', 'AdditionalPassengers', 'PatientNotes',
  'Miles', 'Comments', 'TripNum',
];

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  errors: { row: number; error: string }[];
  skipped: number;
}

interface TripImportProps {
  onClose: () => void;
  onImportComplete?: () => void;
}

export const TripImport: React.FC<TripImportProps> = ({ onClose, onImportComplete }) => {
  const { contractors } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'conflicts' | 'importing' | 'result'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [contractorId, setContractorId] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [duplicateTripNumbers, setDuplicateTripNumbers] = useState<any[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'update' | 'keep' | 'skip'>>({});

  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // First line is header — skip it
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const row: ParsedRow = {};
      CSV_COLUMNS.forEach((col, idx) => {
        row[col] = (values[idx] || '').trim();
      });
      rows.push(row);
    }

    return rows;
  }, []);

  // Handle CSV values with commas inside quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      alert('Please select a CSV file.');
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      alert('No valid data rows found in the CSV file.');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleValidate = async () => {
    if (parsedRows.length === 0) return;

    setStep('importing');

    try {
      const validation = await api.validateTripImport({
        trips: parsedRows,
      });

      if (validation.hasConflicts) {
        setConflicts(validation.conflicts || []);
        setDuplicateTripNumbers(validation.duplicateTripNumbers || []);
        setStep('conflicts');
      } else {
        // No conflicts, proceed directly to import
        await handleImport();
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || 'Validation failed',
        created: 0,
        errors: [{ row: 0, error: error.message || 'Unknown error' }],
        skipped: 0,
      });
      setStep('result');
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setStep('importing');

    try {
      const result = await api.importTrips({
        trips: parsedRows,
        contractorId: contractorId || undefined,
        conflictResolutions: Object.keys(conflictResolutions).length > 0 ? conflictResolutions : undefined,
      });

      setImportResult(result);
      setStep('result');

      if (result.created > 0 && onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || 'Import failed',
        created: 0,
        errors: [{ row: 0, error: error.message || 'Unknown error' }],
        skipped: 0,
      });
      setStep('result');
    }
  };

  const handleResolveConflict = (memberId: string, resolution: 'update' | 'keep' | 'skip') => {
    setConflictResolutions(prev => ({ ...prev, [memberId]: resolution }));
  };

  const handleResolveAllConflicts = (resolution: 'update' | 'keep' | 'skip') => {
    const newResolutions: Record<string, 'update' | 'keep' | 'skip'> = {};
    conflicts.forEach(c => {
      newResolutions[c.memberId] = resolution;
    });
    setConflictResolutions(newResolutions);
  };

  const handleDownloadTemplate = () => {
    const header = 'TripId,FirstName,LastName,RIDER PHONE,DOB,Street,City,State,Zipcode,Steet,City,State,Zipcode,APPOINTMENT TIME,PU Date,PU Time,FACILITY_PHONE,LOS,tripType,additionalPassengersCount,Patient Notes,Miles,Comments,Trip Num';
    const sample = '12345,John,Doe,555-123-4567,01/15/1970,123 Main St,Fort Worth,TX,76102,456 Oak Ave,Dallas,TX,75201,2:00 PM,3/15/2026,1:00 PM,555-987-6543,wheelchair,roundtrip,0,Needs assistance,25,Bring to front door,T-001';
    const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayRows = showAllRows ? parsedRows : parsedRows.slice(0, 5);
  const roundtripCount = parsedRows.filter(r => ['roundtrip', 'round_trip', 'round-trip'].includes((r.TripType || '').toLowerCase())).length;
  const onewayCount = parsedRows.length - roundtripCount;
  const totalTripsToCreate = onewayCount + (roundtripCount * 2);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import Trips</h2>
              <p className="text-sm text-gray-500">Upload a CSV file to bulk-create trips</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                  ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">Drop your CSV file here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">CSV Format Requirements</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>First row must be the header row</li>
                      <li>Dates: M/D/YYYY format (e.g., 3/15/2026)</li>
                      <li>Times: H:MM AM/PM format (e.g., 2:00 PM)</li>
                      <li>TripType: "roundtrip" creates 2 trips (A + B leg), "oneway" creates 1</li>
                      <li>Patients are auto-matched by name + DOB, or created if new</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* File info + contractor picker */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{fileName}</span>
                    <span className="text-gray-400">({parsedRows.length} rows)</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Contractor (optional)</label>
                  <select
                    value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None — No contractor</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {(c as any).contractorCode ? `[${(c as any).contractorCode}] ` : ''}{c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{parsedRows.length}</p>
                  <p className="text-xs text-blue-600">CSV Rows</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{totalTripsToCreate}</p>
                  <p className="text-xs text-green-600">Trips to Create</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{roundtripCount}</p>
                  <p className="text-xs text-purple-600">Roundtrips (×2)</p>
                </div>
              </div>

              {/* Data preview table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Preview</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-2 py-2 text-left font-medium text-gray-600">#</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Trip ID</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Patient</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Date</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">PU Time</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Appt</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Pickup</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Dropoff</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">LOS</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Type</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600">Miles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-2 py-1.5 font-mono">{row.TripId || row.TripNum || '—'}</td>
                          <td className="px-2 py-1.5 font-medium">{row.FirstName} {row.LastName}</td>
                          <td className="px-2 py-1.5">{row.PUDate}</td>
                          <td className="px-2 py-1.5">{row.PUTime}</td>
                          <td className="px-2 py-1.5">{row.AppointmentTime}</td>
                          <td className="px-2 py-1.5 max-w-[120px] truncate">{row.PickupStreet}, {row.PickupCity}</td>
                          <td className="px-2 py-1.5 max-w-[120px] truncate">{row.DropoffStreet}, {row.DropoffCity}</td>
                          <td className="px-2 py-1.5">{row.LOS}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              ['roundtrip', 'round_trip', 'round-trip'].includes((row.TripType || '').toLowerCase())
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {row.TripType || 'oneway'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">{row.Miles}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedRows.length > 5 && (
                  <button
                    onClick={() => setShowAllRows(!showAllRows)}
                    className="flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showAllRows ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showAllRows ? 'Show less' : `Show all ${parsedRows.length} rows`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Conflicts */}
          {step === 'conflicts' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Conflicts Detected</p>
                    <p className="text-amber-700">
                      {conflicts.length} patient{conflicts.length !== 1 ? 's' : ''} with member ID already exist but have different information.
                      {duplicateTripNumbers.length > 0 && ` Also, ${duplicateTripNumbers.length} duplicate trip number${duplicateTripNumbers.length !== 1 ? 's' : ''} found.`}
                    </p>
                  </div>
                </div>
              </div>

              {duplicateTripNumbers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Duplicate Trip Numbers (Will Be Skipped)</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg divide-y divide-red-100 max-h-32 overflow-y-auto">
                    {duplicateTripNumbers.map((dup, i) => (
                      <div key={i} className="px-4 py-2 text-sm text-red-700">
                        Row {dup.row}: Trip #{dup.tripNumber} already exists
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conflicts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Patient Information Conflicts</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveAllConflicts('update')}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-300"
                      >
                        Update All
                      </button>
                      <button
                        onClick={() => handleResolveAllConflicts('keep')}
                        className="px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded border border-green-300"
                      >
                        Keep All
                      </button>
                      <button
                        onClick={() => handleResolveAllConflicts('skip')}
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-300"
                      >
                        Skip All
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {conflicts.map((conflict, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">Row {conflict.row}: {conflict.patientName}</p>
                            <p className="text-xs text-gray-500">Member ID: {conflict.memberId}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveConflict(conflict.memberId, 'update')}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                conflictResolutions[conflict.memberId] === 'update'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-blue-600 hover:bg-blue-50 border border-blue-300'
                              }`}
                            >
                              Update
                            </button>
                            <button
                              onClick={() => handleResolveConflict(conflict.memberId, 'keep')}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                conflictResolutions[conflict.memberId] === 'keep'
                                  ? 'bg-green-600 text-white'
                                  : 'text-green-600 hover:bg-green-50 border border-green-300'
                              }`}
                            >
                              Keep Existing
                            </button>
                            <button
                              onClick={() => handleResolveConflict(conflict.memberId, 'skip')}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                conflictResolutions[conflict.memberId] === 'skip'
                                  ? 'bg-red-600 text-white'
                                  : 'text-red-600 hover:bg-red-50 border border-red-300'
                              }`}
                            >
                              Skip Trip
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="font-medium text-gray-600">Field</div>
                          <div className="font-medium text-gray-600">CSV Value</div>
                          <div className="font-medium text-gray-600">Database Value</div>
                          {conflict.differences.map((diff: any, j: number) => (
                            <React.Fragment key={j}>
                              <div className="text-gray-700">{diff.field}</div>
                              <div className="text-blue-700 font-medium">{diff.csvValue}</div>
                              <div className="text-gray-700">{diff.dbValue}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">Importing {totalTripsToCreate} trips...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
            </div>
          )}

          {/* Step 5: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-5">
              {/* Success/failure banner */}
              <div className={`rounded-lg p-5 ${importResult.created > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {importResult.created > 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-semibold ${importResult.created > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {importResult.message}
                    </p>
                    <div className="flex gap-6 mt-2 text-sm">
                      <span className="text-green-700">✓ {importResult.created} created</span>
                      {importResult.errors.length > 0 && (
                        <span className="text-red-600">✗ {importResult.errors.length} errors</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error details */}
              {importResult.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Errors</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg divide-y divide-red-100 max-h-48 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="px-4 py-2 text-sm">
                        <span className="font-medium text-red-700">Row {err.row}:</span>{' '}
                        <span className="text-red-600">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
          <div>
            {step === 'preview' && (
              <button
                onClick={() => { setStep('upload'); setParsedRows([]); setFileName(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ← Choose Different File
              </button>
            )}
            {step === 'conflicts' && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ← Back to Preview
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {step === 'result' ? 'Close' : 'Cancel'}
            </button>

            {step === 'preview' && (
              <button
                onClick={handleValidate}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {totalTripsToCreate} Trips
              </button>
            )}

            {step === 'conflicts' && (
              <button
                onClick={handleImport}
                disabled={conflicts.some(c => !conflictResolutions[c.memberId])}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Proceed with Import
              </button>
            )}

            {step === 'result' && importResult && importResult.created > 0 && (
              <button
                onClick={() => { onClose(); }}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
