import React, { type ReactNode, createContext, useContext } from 'react';
import { useScreenReaderAnnouncement } from '../hooks/useScreenReaderAnnouncement';

interface AccessibilityContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceStatus: (status: string, details?: string) => void;
  announceAlert: (alertMessage: string) => void;
  announceTankUpdate: (tankName: string, level: number, percentage: number, status: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { announce, announceStatus, announceAlert, announceTankUpdate } = useScreenReaderAnnouncement();

  const value: AccessibilityContextType = {
    announce,
    announceStatus,
    announceAlert,
    announceTankUpdate,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
