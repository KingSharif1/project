import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Modal } from './Modal';
import { formatRemainingTime } from '../utils/sessionTimeout';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  onExtend,
  onLogout,
}) => {
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(120);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onExtend} title="">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Session Timeout Warning
        </h3>

        <p className="text-gray-600 mb-6">
          Your session will expire in <span className="font-bold text-red-600">{countdown} seconds</span> due to inactivity.
        </p>

        <div className="flex items-center justify-center space-x-2 mb-6 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>For your security, inactive sessions are automatically terminated</span>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Log Out
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Stay Logged In
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          This is a HIPAA security requirement to protect patient data
        </p>
      </div>
    </Modal>
  );
};
