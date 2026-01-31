import React, { useState } from 'react';
import { Modal } from './Modal';
import { Clock, Calendar } from 'lucide-react';

interface ManualCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actualPickupAt: string, actualDropoffAt: string) => void;
  tripNumber: string;
  isBulk?: boolean;
  tripCount?: number;
}

export const ManualCompletionModal: React.FC<ManualCompletionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tripNumber,
  isBulk = false,
  tripCount = 1,
}) => {
  const [actualPickupAt, setActualPickupAt] = useState('');
  const [actualDropoffAt, setActualDropoffAt] = useState('');
  const [errors, setErrors] = useState<{ pickup?: string; dropoff?: string }>({});

  const handleSubmit = () => {
    const newErrors: { pickup?: string; dropoff?: string } = {};

    if (!actualPickupAt) {
      newErrors.pickup = 'Actual pickup time is required';
    }

    if (!actualDropoffAt) {
      newErrors.dropoff = 'Actual drop-off time is required';
    }

    if (actualPickupAt && actualDropoffAt) {
      const pickupTime = new Date(actualPickupAt).getTime();
      const dropoffTime = new Date(actualDropoffAt).getTime();

      if (dropoffTime <= pickupTime) {
        newErrors.dropoff = 'Drop-off time must be after pickup time';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm(actualPickupAt, actualDropoffAt);
    handleClose();
  };

  const handleClose = () => {
    setActualPickupAt('');
    setActualDropoffAt('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBulk ? `Complete ${tripCount} Trip${tripCount > 1 ? 's' : ''}` : `Complete Trip ${tripNumber}`}
    >
      <div className="space-y-6">
        <p className="text-gray-600">
          {isBulk
            ? `Please enter the actual pickup and drop-off times. These times will be applied to all ${tripCount} selected trip${tripCount > 1 ? 's' : ''}.`
            : 'Please enter the actual pickup and drop-off times for this completed trip.'
          }
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Actual Pickup Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={actualPickupAt}
                onChange={(e) => {
                  setActualPickupAt(e.target.value);
                  setErrors((prev) => ({ ...prev, pickup: undefined }));
                }}
                className={`w-full px-4 py-2.5 pl-10 border ${
                  errors.pickup ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            </div>
            {errors.pickup && (
              <p className="mt-1 text-sm text-red-500">{errors.pickup}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Actual Drop-off Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={actualDropoffAt}
                onChange={(e) => {
                  setActualDropoffAt(e.target.value);
                  setErrors((prev) => ({ ...prev, dropoff: undefined }));
                }}
                className={`w-full px-4 py-2.5 pl-10 border ${
                  errors.dropoff ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            </div>
            {errors.dropoff && (
              <p className="mt-1 text-sm text-red-500">{errors.dropoff}</p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tip:</p>
              <p>These times will be saved to the trip record and included in all reports and exports.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Complete Trip
          </button>
        </div>
      </div>
    </Modal>
  );
};
