import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
}

interface BrandingContextType {
  branding: BrandingConfig;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: BrandingConfig = {
  companyName: 'TransportHub',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  timezone: 'America/Chicago'
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: false,
  refreshBranding: async () => {}
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [loading, setLoading] = useState(false);

  const fetchBranding = async () => {
    if (!user?.clinicId) {
      setBranding(defaultBranding);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/clinics/${user.clinicId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.clinic) {
        setBranding({
          companyName: data.clinic.company_name || data.clinic.name || 'TransportHub',
          logoUrl: data.clinic.logo_url,
          primaryColor: data.clinic.primary_color || '#2563eb',
          secondaryColor: data.clinic.secondary_color || '#1e40af',
          timezone: data.clinic.timezone || 'America/Chicago'
        });

        // Apply primary color to document root for theming
        if (data.clinic.primary_color) {
          document.documentElement.style.setProperty('--primary-color', data.clinic.primary_color);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [user?.clinicId]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};
