import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Key, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TwoFactorAuthProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onSuccess, onCancel }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const { user } = useAuth();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In production, verify with backend
      // const response = await supabase.rpc('verify_2fa_code', {
      //   user_id: user?.id,
      //   code: fullCode
      // });

      // For demo, accept code 123456
      if (fullCode === '123456') {
        onSuccess();
      } else {
        setError('Invalid verification code');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-0')?.focus();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setTimeLeft(30);
    setError('');
    setCode(['', '', '', '', '', '']);
    document.getElementById('code-0')?.focus();
    // In production, trigger resend via API
    console.log('Resending 2FA code...');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];

    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    if (pastedData.length === 6) {
      document.getElementById('code-5')?.focus();
    } else {
      document.getElementById(`code-${pastedData.length}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-600">
            Enter the 6-digit code sent to your device
          </p>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-600">Code sent via SMS and email</p>
              </div>
            </div>
          </div>
        )}

        {/* Code Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Verification Code
          </label>
          <div className="flex justify-center space-x-3" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                } ${error ? 'border-red-500' : ''}`}
                disabled={isVerifying}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Timer and Resend */}
        <div className="mb-6 text-center">
          {timeLeft > 0 ? (
            <p className="text-sm text-gray-600">
              Code expires in <span className="font-semibold text-blue-600">{timeLeft}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Resend Code
            </button>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying || code.join('').length !== 6}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Verify Code</span>
            </>
          )}
        </button>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-3 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
        )}

        {/* Security Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">Security Notice</p>
              <p>Never share your verification code with anyone. Our staff will never ask for this code.</p>
            </div>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Key className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">Demo Mode</p>
              <p>Use code: <span className="font-mono font-bold">123456</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2FA Setup Component
export const TwoFactorSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<'intro' | 'method' | 'verify'>('intro');
  const [method, setMethod] = useState<'sms' | 'email' | 'app'>('sms');
  const { user } = useAuth();

  if (step === 'verify') {
    return <TwoFactorAuth onSuccess={onComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        {step === 'intro' && (
          <div>
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Enable Two-Factor Authentication
              </h2>
              <p className="text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Enhanced Security</h3>
                  <p className="text-sm text-gray-600">
                    Protect sensitive patient data with an additional verification step
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">HIPAA Compliance</h3>
                  <p className="text-sm text-gray-600">
                    Required for healthcare applications handling protected health information
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Key className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Prevent Unauthorized Access</h3>
                  <p className="text-sm text-gray-600">
                    Even if your password is compromised, your account stays secure
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('method')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Continue to Setup
            </button>
          </div>
        )}

        {step === 'method' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Verification Method
              </h2>
              <p className="text-gray-600">
                Select how you'd like to receive verification codes
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <button
                onClick={() => setMethod('sms')}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                  method === 'sms'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${method === 'sms' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Smartphone className={`w-6 h-6 ${method === 'sms' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">SMS Text Message</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Receive a 6-digit code via text message
                    </p>
                    {user?.email && (
                      <p className="text-xs text-gray-500">
                        Phone: ••• ••• •• {user.email.slice(-2)}
                      </p>
                    )}
                  </div>
                  {method === 'sms' && (
                    <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setMethod('email')}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                  method === 'email'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${method === 'email' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Key className={`w-6 h-6 ${method === 'email' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Receive a 6-digit code via email
                    </p>
                    {user?.email && (
                      <p className="text-xs text-gray-500">{user.email}</p>
                    )}
                  </div>
                  {method === 'email' && (
                    <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Send Verification Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
