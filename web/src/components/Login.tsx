import React, { useState } from 'react';
import { Car, Lock, Mail, AlertCircle, Eye, EyeOff, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { PremiumLayout } from './layout/PremiumLayout';
import { GlassCard } from './ui/GlassCard';
import { PremiumButton } from './ui/PremiumButton';
import { PremiumInput } from './ui/PremiumInput';

interface LoginProps {
  onBackToLanding?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBackToLanding }) => {

  const { login } = useAuth();
  const [loginType, setLoginType] = useState<'company' | 'admin'>('company');
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (loginType === 'company') {
      if (!companyCode || !email) {
        setError('Please enter both Company Code and Email');
        setLoading(false);
        return;
      }
    }

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumLayout>
      {/* MInimal Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {onBackToLanding ? (
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-premium-accent-slate hover:text-white transition-colors group text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Home
            </button>
          ) : <div />}
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-20 items-center">

          {/* Left Column: Branding (Clean & Minimal) */}
          <div className="hidden lg:flex flex-col justify-center space-y-12">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-6">
                <Car className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                Welcome to <br /> TransportHub
              </h1>
              <p className="text-xl text-premium-accent-slate/80 font-light leading-relaxed max-w-md">
                Secure access to your transportation management dashboard.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { title: 'Real-Time Tracking', desc: 'Monitor your entire fleet live.' },
                { title: 'HIPAA Compliant', desc: 'Secure patient data management.' },
                { title: 'Smart Dispatch', desc: 'AI-powered route optimization.' },
              ].map((item, index) => (
                <div key={index} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.05] transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{item.title}</h3>
                    <p className="text-sm text-premium-accent-slate/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-white/[0.05]">
              <p className="text-xs text-premium-accent-slate/40 tracking-wider uppercase"> Trusted by 500+ Healthcare Providers</p>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[420px]">
              {/* Mobile Mobile Branding */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Sign In</h1>
              </div>

              <GlassCard className="p-8 md:p-10 shadow-2xl backdrop-blur-2xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome back</h2>
                  <p className="text-sm text-premium-accent-slate/60">Enter your credentials to access your account</p>
                </div>

                {/* Login Type Toggle */}
                <div className="flex p-1 bg-white/[0.03] border border-white/[0.05] rounded-lg mb-6">
                  <button
                    type="button"
                    onClick={() => setLoginType('company')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginType === 'company'
                        ? 'bg-premium-highlight text-white shadow-sm'
                        : 'text-premium-accent-slate hover:text-white hover:bg-white/[0.02]'
                      }`}
                  >
                    Company Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginType('admin')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginType === 'admin'
                        ? 'bg-premium-highlight text-white shadow-sm'
                        : 'text-premium-accent-slate hover:text-white hover:bg-white/[0.02]'
                      }`}
                  >
                    Admin Login
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 backdrop-blur-sm">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200 font-medium">{error}</p>
                    </div>
                  )}

                  {loginType === 'company' ? (
                    <>
                      <PremiumInput
                        label="Company Code"
                        type="text"
                        required
                        value={companyCode}
                        onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HOSP001"
                        icon={<Shield className="w-4 h-4" />}
                      />
                      <PremiumInput
                        label="Email or Username"
                        type="text"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter email or username"
                        icon={<Mail className="w-4 h-4" />}
                        autoComplete="username"
                      />
                    </>
                  ) : (
                    <PremiumInput
                      label="Email or Username"
                      type="text"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter email or username"
                      icon={<Mail className="w-4 h-4" />}
                      autoComplete="username"
                    />
                  )}

                  <PremiumInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    icon={<Lock className="w-4 h-4" />}
                    autoComplete="current-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-premium-accent-slate/50 hover:text-white transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-white focus:ring-offset-0 focus:ring-white/20" />
                      <span className="text-premium-accent-slate/60 group-hover:text-premium-accent-slate transition-colors">Remember me</span>
                    </label>
                    <a href="#" className="text-white/80 hover:text-white transition-colors font-medium">
                      Forgot password?
                    </a>
                  </div>

                  <PremiumButton
                    type="submit"
                    variant="primary"
                    className="w-full mt-2"
                    isLoading={loading}
                    disabled={loading}
                  >
                    Sign In
                  </PremiumButton>
                </form>

                <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
                  <p className="text-xs text-premium-accent-slate/60">
                    Don't have an account?{' '}
                    <a href="mailto:support@fwmc.com" className="text-white hover:underline decoration-white/30 underline-offset-4 transition-all">
                      Contact Sales
                    </a>
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </PremiumLayout>
  );
};
