import React, { useState } from 'react';
import { Key, Copy, Send, Check, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { generateTemporaryPassword } from '../utils/passwordGenerator';
import { supabase } from '../lib/supabase';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  userPhone?: string;
  userType: 'driver' | 'patient';
  onSuccess?: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
  userPhone,
  userType,
  onSuccess,
}) => {
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [sendSMS, setSendSMS] = useState(!!userPhone);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateTemporaryPassword(12);
    setTemporaryPassword(newPassword);
    setError('');
  };

  const handleCopyPassword = async () => {
    if (temporaryPassword) {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetPassword = async () => {
    if (!temporaryPassword) {
      setError('Please generate a password first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting password reset for:', userEmail);

      // First, try to reset password
      const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-password', {
        body: {
          email: userEmail,
          userType,
          temporaryPassword,
          sendSMS: sendSMS && !!userPhone,
        },
      });

      console.log('Reset response:', resetData, resetError);

      // If user not found, create auth account automatically
      if (resetData && !resetData.success && resetData.error?.includes('not found')) {
        console.log('User not found, creating auth account...');
        setError('Creating auth account, please wait...');

        const { data: createData, error: createError } = await supabase.functions.invoke('create-auth-account', {
          body: {
            email: userEmail,
            userType,
          },
        });

        console.log('Create auth response:', createData, createError);

        if (createError) {
          setError(`Failed to create auth account: ${createError.message}`);
          return;
        }

        if (!createData?.success) {
          setError(createData?.error || 'Failed to create auth account');
          return;
        }

        // Auth account created, now reset password again
        console.log('Auth account created, retrying password reset...');
        const { data: retryData, error: retryError } = await supabase.functions.invoke('reset-password', {
          body: {
            email: userEmail,
            userType,
            temporaryPassword,
            sendSMS: sendSMS && !!userPhone,
          },
        });

        if (retryError) {
          setError(`Password reset failed: ${retryError.message}`);
          return;
        }

        if (retryData?.success) {
          setSuccess(true);
          if (retryData.smsError && sendSMS) {
            console.warn('SMS error:', retryData.smsError);
          }
          setTimeout(() => {
            onSuccess?.();
            handleClose();
          }, 2000);
        } else {
          setError(retryData?.error || 'Password reset failed after creating auth account');
        }
      } else if (resetError) {
        setError(`Network error: ${resetError.message}`);
      } else if (resetData?.success) {
        setSuccess(true);
        if (resetData.smsError && sendSMS) {
          console.warn('SMS error:', resetData.smsError);
        }
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      } else {
        const errorMsg = resetData?.error || resetData?.details || 'Failed to reset password';
        setError(errorMsg);
        console.error('Reset error:', resetData);
      }
    } catch (err: any) {
      console.error('Exception:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTemporaryPassword('');
    setSendSMS(!!userPhone);
    setSuccess(false);
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Reset Password for {userName}</p>
              <p className="text-blue-700">Email: {userEmail}</p>
              {userPhone && <p className="text-blue-700">Phone: {userPhone}</p>}
            </div>
          </div>
        </div>

        {!success && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temporary Password
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Click generate or enter manually"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={handleGeneratePassword}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Generate</span>
                </button>
              </div>
              {temporaryPassword && (
                <button
                  onClick={handleCopyPassword}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy to clipboard</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {userPhone && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendSMS"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sendSMS" className="text-sm text-gray-700 flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Send temporary password via SMS to {userPhone}</span>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure to save or send this password. The user will need to change it on their first login.
              </p>
            </div>
          </>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800">
              <Check className="w-5 h-5" />
              <div>
                <p className="font-semibold">Password Reset Successfully!</p>
                {sendSMS && userPhone && (
                  <p className="text-sm mt-1">SMS notification sent to {userPhone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          {!success && (
            <button
              onClick={handleResetPassword}
              disabled={loading || !temporaryPassword}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
