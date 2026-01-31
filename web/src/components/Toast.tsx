import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
      icon: CheckCircle,
      iconColor: 'text-white',
      borderColor: 'border-green-600'
    },
    error: {
      bgColor: 'bg-gradient-to-r from-red-500 to-rose-600',
      icon: AlertCircle,
      iconColor: 'text-white',
      borderColor: 'border-red-600'
    },
    warning: {
      bgColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
      icon: AlertTriangle,
      iconColor: 'text-white',
      borderColor: 'border-amber-600'
    },
    info: {
      bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-600',
      icon: Info,
      iconColor: 'text-white',
      borderColor: 'border-blue-600'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg shadow-2xl max-w-md w-full mx-4`}>
        <div className="flex items-center gap-3 p-4">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <p className="flex-1 text-white font-medium text-sm leading-relaxed">
            {message}
          </p>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
