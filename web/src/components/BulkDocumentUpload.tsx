import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Check, X, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkDocumentUploadProps {
  drivers: any[];
  onUpdateMultiple: (updates: Array<{ driverId: string; updates: any }>) => void;
  onClose: () => void;
}

export const BulkDocumentUpload: React.FC<BulkDocumentUploadProps> = ({
  drivers,
  onUpdateMultiple,
  onClose
}) => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Driver ID': 'example-id-1',
        'Driver Name': 'John Doe',
        'License Expiry': '2025-12-31',
        'Insurance Expiry': '2025-11-30',
        'Registration Expiry': '2025-10-31',
        'Medical Cert Expiry': '2025-09-30',
        'Background Check Expiry': '2025-08-31'
      },
      {
        'Driver ID': 'example-id-2',
        'Driver Name': 'Jane Smith',
        'License Expiry': '2025-06-30',
        'Insurance Expiry': '2025-05-31',
        'Registration Expiry': '2025-04-30',
        'Medical Cert Expiry': '2025-03-31',
        'Background Check Expiry': '2025-02-28'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Driver Documents');
    XLSX.writeFile(wb, 'driver_documents_template.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setUploadedData(jsonData);
      validateData(jsonData);
      setShowPreview(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = (data: any[]) => {
    const results = data.map((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Find driver by ID or name
      const driver = drivers.find(d =>
        d.id === row['Driver ID'] ||
        d.name.toLowerCase() === row['Driver Name']?.toLowerCase()
      );

      if (!driver) {
        errors.push('Driver not found in system');
      }

      // Validate date formats
      const dateFields = [
        'License Expiry',
        'Insurance Expiry',
        'Registration Expiry',
        'Medical Cert Expiry',
        'Background Check Expiry'
      ];

      dateFields.forEach(field => {
        if (row[field]) {
          const date = new Date(row[field]);
          if (isNaN(date.getTime())) {
            errors.push(`Invalid date format for ${field}`);
          } else if (date < new Date()) {
            warnings.push(`${field} is in the past`);
          }
        }
      });

      return {
        rowIndex: index + 1,
        driver: driver || null,
        data: row,
        errors,
        warnings,
        isValid: errors.length === 0
      };
    });

    setValidationResults(results);
  };

  const handleImport = async () => {
    setIsProcessing(true);

    const updates = validationResults
      .filter(result => result.isValid && result.driver)
      .map(result => ({
        driverId: result.driver.id,
        updates: {
          license_expiry_date: result.data['License Expiry'] || null,
          insurance_expiry_date: result.data['Insurance Expiry'] || null,
          registration_expiry_date: result.data['Registration Expiry'] || null,
          medical_cert_expiry_date: result.data['Medical Cert Expiry'] || null,
          background_check_expiry_date: result.data['Background Check Expiry'] || null
        }
      }));

    await onUpdateMultiple(updates);
    setIsProcessing(false);
    onClose();
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const errorCount = validationResults.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bulk Document Upload</h2>
              <p className="text-blue-100 mt-1">Upload driver document dates from spreadsheet</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm mr-2">1</span>
                  Download Template
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Download the Excel template with the correct format. Fill in your driver document dates and save the file.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel Template</span>
                </button>
              </div>
              <FileSpreadsheet className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-2">2</span>
                  Upload Filled Template
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Upload the completed Excel file. The system will validate the data before importing.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Excel File</span>
                </button>
              </div>
              <Upload className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </div>

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Validation Results
                  </h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {showPreview ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{uploadedData.length}</div>
                    <div className="text-sm text-gray-600">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{validCount}</div>
                    <div className="text-sm text-gray-600">Valid</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>
              </div>

              {showPreview && (
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {validationResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.isValid
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {result.isValid ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-semibold text-gray-900">
                            Row {result.rowIndex}: {result.data['Driver Name'] || 'Unknown'}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          result.isValid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.isValid ? 'Valid' : 'Error'}
                        </span>
                      </div>

                      {result.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.errors.map((error, i) => (
                            <div key={i} className="text-sm text-red-700 flex items-center space-x-2">
                              <X className="w-3.5 h-3.5" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.warnings.map((warning, i) => (
                            <div key={i} className="text-sm text-amber-700 flex items-center space-x-2">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Driver ID or Driver Name must match existing drivers in the system</li>
              <li>Date format: YYYY-MM-DD (e.g., 2025-12-31)</li>
              <li>Leave date fields empty to skip updating that document</li>
              <li>All dates will be validated before importing</li>
              <li>Only valid rows will be imported</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {validCount > 0 && (
              <span className="text-green-600 font-semibold">
                {validCount} driver{validCount !== 1 ? 's' : ''} ready to update
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import {validCount} Driver{validCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
