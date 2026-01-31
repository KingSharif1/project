import React from 'react';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor
} from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true
}) => {
  const validation = validatePassword(password);

  if (!password && !showRequirements) return null;

  const strengthWidth = {
    'weak': '25%',
    'medium': '50%',
    'strong': '75%',
    'very-strong': '100%',
  }[validation.strength];

  return (
    <div className="space-y-3">
      {password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Password Strength</span>
            <span className={`font-semibold capitalize ${getPasswordStrengthColor(validation.strength)}`}>
              {validation.strength.replace('-', ' ')}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                validation.strength === 'weak' ? 'bg-red-500' :
                validation.strength === 'medium' ? 'bg-yellow-500' :
                validation.strength === 'strong' ? 'bg-blue-500' :
                'bg-green-500'
              }`}
              style={{ width: strengthWidth }}
            />
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Password Requirements</span>
          </p>
          <ul className="space-y-1">
            <RequirementItem
              met={password.length >= 12}
              text="At least 12 characters"
            />
            <RequirementItem
              met={/[A-Z]/.test(password)}
              text="One uppercase letter"
            />
            <RequirementItem
              met={/[a-z]/.test(password)}
              text="One lowercase letter"
            />
            <RequirementItem
              met={/[0-9]/.test(password)}
              text="One number"
            />
            <RequirementItem
              met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)}
              text="One special character (!@#$%...)"
            />
          </ul>
        </div>
      )}

      {validation.errors.length > 0 && password && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <ul className="space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-xs text-red-700 flex items-start space-x-2">
                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => (
  <li className={`text-xs flex items-center space-x-2 ${met ? 'text-green-700' : 'text-gray-500'}`}>
    {met ? (
      <CheckCircle className="w-3 h-3 flex-shrink-0" />
    ) : (
      <div className="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0" />
    )}
    <span>{text}</span>
  </li>
);
