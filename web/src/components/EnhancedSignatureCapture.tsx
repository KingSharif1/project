import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EnhancedSignatureCaptureProps {
  tripId: string;
  signatureType: 'pickup' | 'dropoff' | 'patient' | 'driver';
  signerRole?: 'patient' | 'caregiver' | 'driver' | 'facility_staff';
  onComplete: (signatureId: string) => void;
  onCancel: () => void;
}

export const EnhancedSignatureCapture: React.FC<EnhancedSignatureCaptureProps> = ({
  tripId,
  signatureType,
  signerRole = 'patient',
  onComplete,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    if (!signerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!hasSignature) {
      alert('Please provide a signature');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);

    try {
      // Convert canvas to base64
      const signatureData = canvas.toDataURL('image/png');

      // Save to database
      const { data, error } = await supabase
        .from('signatures')
        .insert({
          trip_id: tripId,
          signature_type: signatureType,
          signature_data: signatureData,
          signer_name: signerName.trim(),
          signer_role: signerRole,
          signed_at: new Date().toISOString(),
          location_lat: location?.lat,
          location_lng: location?.lng,
          device_info: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;

      // Update trip with signature reference
      const columnName = `${signatureType}_signature_id`;
      await supabase
        .from('trips')
        .update({ [columnName]: data.id })
        .eq('id', tripId);

      onComplete(data.id);
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    switch (signatureType) {
      case 'pickup':
        return 'Pickup Signature';
      case 'dropoff':
        return 'Dropoff Signature';
      case 'patient':
        return 'Patient Signature';
      case 'driver':
        return 'Driver Signature';
      default:
        return 'Signature';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Signer Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter your full name"
              disabled={isSaving}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>

          {/* Signature Canvas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature
            </label>
            <div className="border-2 border-gray-300 rounded-lg bg-white relative" style={{ height: '300px' }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 text-lg">Sign here</p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Draw your signature using your mouse or finger
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={clearSignature}
              disabled={!hasSignature || isSaving}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={18} className="mr-2" />
              Clear
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                disabled={!signerName.trim() || !hasSignature || isSaving}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} className="mr-2" />
                    Save Signature
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> By signing, you acknowledge that the information provided is accurate and complete.
              {location && ' Your location has been recorded for verification purposes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
