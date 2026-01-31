import React from 'react';
import { AlertTriangle, Trash2, RefreshCw, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'warning' | 'primary' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getHeaderStyle = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-rose-600';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-orange-600';
      case 'info':
        return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
    }
  };

  const getButtonStyle = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const getIcon = () => {
    switch (confirmStyle) {
      case 'danger':
        return <Trash2 className="w-8 h-8 text-white" />;
      case 'warning':
        return <RefreshCw className="w-8 h-8 text-white" />;
      case 'info':
        return <Info className="w-8 h-8 text-white" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${getHeaderStyle()} p-6 flex items-center gap-4`}>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${getButtonStyle()}`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
