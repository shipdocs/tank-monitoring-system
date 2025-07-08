import { useEffect, useState } from 'react';
import { type ViewMode } from '../types/tank';

const DEFAULT_LAYOUT_KEY = 'tankmon_default_layout';

export const useDefaultLayout = () => {
  const [defaultLayout, setDefaultLayout] = useState<ViewMode>('grid');

  // Load default layout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_LAYOUT_KEY);
    if (saved && isValidViewMode(saved)) {
      setDefaultLayout(saved as ViewMode);
    }
  }, []);

  // Save default layout to localStorage when it changes
  const saveDefaultLayout = (layout: ViewMode) => {
    setDefaultLayout(layout);
    localStorage.setItem(DEFAULT_LAYOUT_KEY, layout);
  };

  return {
    defaultLayout,
    saveDefaultLayout,
  };
};

// Helper function to validate ViewMode
const isValidViewMode = (value: string): boolean => {
  const validModes: ViewMode[] = ['grid', 'list', 'compact', 'single-row', 'column', 'side-by-side'];
  return validModes.includes(value as ViewMode);
};
