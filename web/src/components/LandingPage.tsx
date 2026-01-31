import React, { useState } from 'react';
import { Car, Shield, Users, TrendingUp, CheckCircle, ArrowRight, Phone, Mail, MapPin, Zap, BarChart, Bell, Target, Star, Navigation, Smartphone, DollarSign, FileText } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PremiumLayout } from './layout/PremiumLayout';
import { GlassCard } from './ui/GlassCard';
import { PremiumButton } from './ui/PremiumButton';
import { PremiumInput } from './ui/PremiumInput';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setShowRequestForm(false);
      setFormSubmitted(false);
      setFormData({
        organizationName: '',
        contactName: '',
        email: '',
        phone: '',
        message: ''
      });
    }, 3000);
  };

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const stats = [
    { value: '10K+', label: 'Trips Completed' },
    { value: '500+', label: 'Active Drivers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <PremiumLayout>
      {/* Minimalist Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-premium-dark/80 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/[0.08]">
              <Car className="w-5 h-5 text-premium-accent-white" />
            </div>
            <span className="text-lg font-medium tracking-tight text-white">TransportHub</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('#features')} className="text-sm text-premium-accent-slate hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('#testimonials')} className="text-sm text-premium-accent-slate hover:text-white transition-colors">Testimonials</button>
            <button onClick={() => scrollToSection('#pricing')} className="text-sm text-premium-accent-slate hover:text-white transition-colors">Pricing</button>
            <PremiumButton size="sm" variant="secondary" onClick={onLoginClick}>
              Login
            </PremiumButton>
            <PremiumButton size="sm" variant="primary" onClick={() => setShowRequestForm(true)}>
              Get Started
            </PremiumButton>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2"
            >
              {isMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-premium-dark/95 backdrop-blur-xl border-b border-white/[0.05] p-6 space-y-4">
            <button onClick={() => scrollToSection('#features')} className="block text-sm text-premium-accent-slate hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('#testimonials')} className="block text-sm text-premium-accent-slate hover:text-white transition-colors">Testimonials</button>
            <button onClick={() => scrollToSection('#pricing')} className="block text-sm text-premium-accent-slate hover:text-white transition-colors">Pricing</button>
            <div className="pt-4 flex flex-col gap-3">
              <PremiumButton size="sm" variant="secondary" onClick={onLoginClick} className="w-full">
                Login
              </PremiumButton>
              <PremiumButton size="sm" variant="primary" onClick={() => setShowRequestForm(true)} className="w-full">
                Get Started
              </PremiumButton>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.08] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            <span className="text-xs font-medium text-premium-accent-slate tracking-wide uppercase">HIPAA Compliant Platform</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8">
            <span className="block text-white mb-2">Next Generation</span>
            <span className="block text-premium-accent-slate/80">Transport Management</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-premium-accent-slate/80 mb-12 font-light leading-relaxed">
            Intelligent dispatching, real-time tracking, and automated billing.
            Designed for modern healthcare transportation providers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <PremiumButton size="lg" onClick={() => setShowRequestForm(true)} icon={<ArrowRight className="w-4 h-4" />}>
              Request Demo
            </PremiumButton>
            <PremiumButton variant="secondary" size="lg" onClick={() => scrollToSection('#features')}>
              View Features
            </PremiumButton>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/[0.03] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group cursor-default">
                <div className="text-3xl lg:text-4xl font-semibold text-white mb-2 tracking-tight group-hover:scale-105 transition-transform duration-500">{stat.value}</div>
                <div className="text-xs text-premium-accent-slate uppercase tracking-widest font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">Built for Efficiency</h2>
            <p className="text-premium-accent-slate/80 max-w-2xl mx-auto">
              Powerful tools engineered to streamline every aspect of your operation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Navigation, title: 'Smart Dispatch', desc: 'AI-powered route optimization reduces fuel costs by up to 30%.' },
              { icon: Shield, title: 'Secure Compliance', desc: 'Enterprise-grade security ensuring full compliance with regulations.' },
              { icon: Smartphone, title: 'Driver App', desc: 'Intuitive mobile app for drivers with real-time updates.' },
              { icon: FileText, title: 'Auto-Billing', desc: 'Automated invoicing and claims generation.' },
              { icon: BarChart, title: 'Analytics', desc: 'Deep insights into fleet performance and operational efficiency.' },
              { icon: Users, title: 'Vendor Portal', desc: 'Seamless portal for facilities to book and track rides instantly.' },
            ].map((feature, i) => (
              <GlassCard key={i} hoverEffect className="p-8 group">
                <div className="w-12 h-12 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:bg-white/[0.06] transition-colors">
                  <feature.icon className="w-5 h-5 text-white/90" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-premium-accent-slate/80 leading-relaxed font-light">{feature.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 md:p-16 text-center relative overflow-hidden">
            {/* Subtle Glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">Ready to modernize?</h2>
              <p className="text-lg text-premium-accent-slate/80 mb-10 max-w-xl mx-auto font-light">
                Join hundreds of transportation providers who have streamlined their operations with TransportHub.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
                <div className="flex-1">
                  <PremiumInput placeholder="Enter your email" label="" className="h-12" />
                </div>
                <PremiumButton className="h-[46px] mt-0.5 whitespace-nowrap" onClick={() => setShowRequestForm(true)}>
                  Get Early Access
                </PremiumButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-premium-accent-slate/60 text-sm font-light">
            © 2024 TransportHub Inc. All rights reserved.
          </div>
          <div className="flex gap-8">
            {['Privacy', 'Terms', 'Security'].map(link => (
              <a key={link} href="#" className="text-sm text-premium-accent-slate/60 hover:text-white transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-premium-dark/80 backdrop-blur-sm">
          <GlassCard className="max-w-lg w-full relative p-8">
            <button
              onClick={() => setShowRequestForm(false)}
              className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
            >
              ✕
            </button>

            {formSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Request Sent</h3>
                <p className="text-premium-accent-slate">We'll be in touch shortly.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Contact Sales</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <PremiumInput
                    label="Organization"
                    placeholder="Company Name"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInput
                      label="Contact Name"
                      placeholder="Full Name"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      required
                    />
                    <PremiumInput
                      label="Phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <PremiumInput
                    label="Email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-medium text-premium-accent-slate ml-1">Message</label>
                    <textarea
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg py-3 px-4 text-white placeholder-premium-accent-slate/30 focus:outline-none focus:bg-white/[0.06] focus:border-white/20 transition-all text-sm resize-none h-24"
                      placeholder="How can we help?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  <PremiumButton type="submit" className="w-full mt-2">
                    Submit Request
                  </PremiumButton>
                </form>
              </>
            )}
          </GlassCard>
        </div>
      )}
    </PremiumLayout>
  );
};
