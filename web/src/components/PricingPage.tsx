import { useState } from 'react';
import { Check, X, Building2, Users, TrendingUp, MessageSquare, Shield, Clock, Database, Zap } from 'lucide-react';

export default function PricingPage() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaNum1] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaNum2] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate captcha
    if (parseInt(captchaAnswer) !== captchaNum1 + captchaNum2) {
      alert('Incorrect answer to the math question. Please try again.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3000/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to submit');

      setSubmitted(true);
      setTimeout(() => {
        setShowContactForm(false);
        setSubmitted(false);
        setCaptchaAnswer('');
        setFormData({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          message: ''
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const plans = [
    {
      name: 'Basic',
      price: 99,
      description: 'Perfect for small operations getting started',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      features: [
        { name: 'Up to 10 drivers', included: true },
        { name: '50 trips per day', included: true },
        { name: '6 months data retention', included: true },
        { name: 'Basic reporting', included: true },
        { name: 'Email support', included: true },
        { name: 'Mobile driver app', included: true },
        { name: 'Real-time GPS tracking', included: true },
        { name: 'Trip scheduling', included: true },
        { name: 'SMS notifications', included: false },
        { name: 'Advanced analytics', included: false },
        { name: 'API access', included: false },
        { name: 'Priority support', included: false },
      ],
      highlights: ['Great for startups', 'Easy to scale up', 'No setup fees']
    },
    {
      name: 'Premium',
      price: 299,
      description: 'For growing businesses with higher volume',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      popular: true,
      features: [
        { name: 'Up to 50 drivers', included: true },
        { name: '200 trips per day', included: true },
        { name: '24 months data retention', included: true },
        { name: 'Advanced reporting & analytics', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Mobile driver app', included: true },
        { name: 'Real-time GPS tracking', included: true },
        { name: 'Trip scheduling', included: true },
        { name: 'SMS notifications', included: true },
        { name: 'Custom branding', included: true },
        { name: 'Automated billing', included: true },
        { name: 'API access', included: false },
      ],
      highlights: ['Most popular choice', 'SMS alerts included', 'Advanced features']
    },
    {
      name: 'Enterprise',
      price: 599,
      description: 'For large operations requiring maximum capacity',
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      features: [
        { name: 'Unlimited drivers', included: true },
        { name: 'Unlimited trips', included: true },
        { name: '10 years data retention', included: true },
        { name: 'Enterprise analytics & BI', included: true },
        { name: '24/7 phone & email support', included: true },
        { name: 'Mobile driver app', included: true },
        { name: 'Real-time GPS tracking', included: true },
        { name: 'Trip scheduling', included: true },
        { name: 'SMS notifications', included: true },
        { name: 'Full white-label branding', included: true },
        { name: 'Automated billing', included: true },
        { name: 'Full API access', included: true },
      ],
      highlights: ['Unlimited everything', 'Dedicated support', 'Custom integrations']
    }
  ];

  const coreFeatures = [
    {
      icon: Users,
      title: 'Driver Management',
      description: 'Complete driver profiles, document tracking, and performance monitoring'
    },
    {
      icon: TrendingUp,
      title: 'Trip Scheduling',
      description: 'Intelligent scheduling with automated dispatch and route optimization'
    },
    {
      icon: MessageSquare,
      title: 'Real-time Communication',
      description: 'Built-in messaging between drivers, dispatchers, and patients'
    },
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Secure patient data handling with full compliance and encryption'
    },
    {
      icon: Clock,
      title: 'Live GPS Tracking',
      description: 'Real-time driver location tracking and breadcrumb history'
    },
    {
      icon: Database,
      title: 'Comprehensive Reporting',
      description: 'Detailed analytics on trips, drivers, revenue, and performance'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold text-gray-900">TransportHub</h1>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-4">
          NEMT Transportation Management
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Complete software solution for managing non-emergency medical transportation. 
          From scheduling to billing, driver tracking to patient care - all in one platform.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Check className="text-green-600" size={20} />
            <span>No setup fees</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-600" size={20} />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-600" size={20} />
            <span>30-day free trial</span>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything You Need to Run Your NEMT Business
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coreFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="text-blue-600" size={24} />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Choose Your Plan
        </h3>
        <p className="text-center text-gray-600 mb-12">
          All plans include core features. Scale up as you grow.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                plan.popular ? 'ring-2 ring-purple-600 relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-center py-2 text-sm font-semibold">
                  MOST POPULAR
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="mb-6">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="mb-6 space-y-2">
                  {plan.highlights.map((highlight, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-2">
                      <Zap className={`text-${plan.color}-600`} size={16} />
                      <span className="text-sm text-gray-700 font-medium">{highlight}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => setShowContactForm(true)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r ${plan.gradient} hover:opacity-90 transition mb-6`}
                >
                  Contact Sales
                </button>

                {/* Features List */}
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                      ) : (
                        <X className="text-gray-300 flex-shrink-0 mt-0.5" size={18} />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? 'text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl mb-8 text-blue-100">
            Contact us today to discuss your needs and get a personalized demo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowContactForm(true)}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Contact Sales
            </button>
            <a
              href="tel:+15555551234"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
            >
              Call: (555) 555-1234
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">
            © 2026 TransportHub. All rights reserved. | HIPAA Compliant | Secure & Reliable
          </p>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowContactForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600">
                  We've received your inquiry and will contact you shortly.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Contact Sales</h3>
                <p className="text-gray-600 mb-6">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="ABC Transport"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="john@abctransport.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                      placeholder="Tell us about your needs..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security Check: What is {captchaNum1} + {captchaNum2}? *
                    </label>
                    <input
                      type="number"
                      required
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="Enter answer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
