import { useState, useEffect } from 'react';

interface AppBranding {
  appName: string;
  appSlogan: string;
  logoUrl?: string;
  primaryColor: string;
}

const DEFAULT_BRANDING: AppBranding = {
  appName: 'Tank Monitoring System',
  appSlogan: 'Real-time tank level monitoring dashboard',
  primaryColor: '#2563eb', // blue-600
};

export const useAppBranding = () => {
  const [branding, setBranding] = useState<AppBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  // Load branding from API on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/branding');
        if (response.ok) {
          const data = await response.json();
          setBranding({ ...DEFAULT_BRANDING, ...data });
        }
      } catch (error) {
        console.error('Failed to load branding from API:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, []);

  // Save branding to API
  const saveBranding = async (newBranding: Partial<AppBranding>) => {
    const updated = { ...branding, ...newBranding };
    setBranding(updated);

    try {
      const response = await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!response.ok) {
        throw new Error('Failed to save branding');
      }
    } catch (error) {
      console.error('Failed to save branding to API:', error);
      // Revert on error
      setBranding(branding);
      throw error;
    }
  };

  return {
    branding,
    saveBranding,
    isLoading,
  };
};
