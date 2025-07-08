import React, { type ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import { useTankData } from '../hooks/useTankData';
import { useAccessibility } from './AccessibilityProvider';
import { type Tank, type TankData } from '../types/tank';
import { getTankPercentage, isAlarmState } from '../utils/tankDisplay';

interface TankDataContextType extends TankData {
  // Additional context methods can be added here if needed
}

const TankDataContext = createContext<TankDataContextType | undefined>(undefined);

export const useTankDataContext = () => {
  const context = useContext(TankDataContext);
  if (!context) {
    throw new Error('useTankDataContext must be used within a TankDataProvider');
  }
  return context;
};

interface TankDataProviderProps {
  children: ReactNode;
}

export const TankDataProvider: React.FC<TankDataProviderProps> = ({ children }) => {
  const tankData = useTankData();
  const { announceStatus, announceAlert, announceTankUpdate } = useAccessibility();
  const previousTanksRef = useRef<Tank[]>([]);
  const announcementCountRef = useRef<number>(0);
  const lastAnnouncementTimeRef = useRef<number>(0);

  useEffect(() => {
    const previousTanks = previousTanksRef.current;
    const currentTanks = tankData.tanks;

    // Announce connection status changes
    if (previousTanks.length > 0) {
      // Only announce if connection status actually changed or it's the first successful connection
      const now = Date.now();
      const timeSinceLastAnnouncement = now - lastAnnouncementTimeRef.current;

      if (tankData.connectionStatus === 'connected' && timeSinceLastAnnouncement > 10000) {
        announceStatus('Data source connected', `Monitoring ${currentTanks.length} tanks`);
        lastAnnouncementTimeRef.current = now;
      } else if (tankData.connectionStatus === 'error' && timeSinceLastAnnouncement > 30000) {
        announceAlert('Data source connection error');
        lastAnnouncementTimeRef.current = now;
      }
    }

    // Announce significant tank level changes and alarm state changes
    currentTanks.forEach((currentTank) => {
      const previousTank = previousTanks.find(t => t.id === currentTank.id);

      if (!previousTank) {
        // New tank detected
        const percentage = getTankPercentage(currentTank.currentLevel, currentTank.maxCapacity);
        if (isAlarmState(currentTank.status)) {
          announceAlert(`New tank detected: ${currentTank.name} requires attention`);
        }
        return;
      }

      const currentPercentage = getTankPercentage(currentTank.currentLevel, currentTank.maxCapacity);
      const previousPercentage = getTankPercentage(previousTank.currentLevel, previousTank.maxCapacity);
      const percentageChange = Math.abs(currentPercentage - previousPercentage);

      // Announce alarm state changes
      const wasAlarm = isAlarmState(previousTank.status);
      const isAlarm = isAlarmState(currentTank.status);

      if (!wasAlarm && isAlarm) {
        announceAlert(`Tank ${currentTank.name} alarm: ${currentTank.status} status at ${currentPercentage.toFixed(1)} percent`);
      } else if (wasAlarm && !isAlarm) {
        announceStatus(`Tank ${currentTank.name} alarm cleared`, `Status now ${currentTank.status}`);
      }

      // Announce significant level changes (5% or more)
      if (percentageChange >= 5.0) {
        const levelDirection = currentPercentage > previousPercentage ? 'increased' : 'decreased';
        announceTankUpdate(
          currentTank.name,
          Math.round(currentTank.currentLevel),
          currentPercentage,
          currentTank.status,
        );
      }

      // Announce critical thresholds (90%, 95%, near empty)
      const criticalThresholds = [5, 10, 90, 95];
      const crossedThreshold = criticalThresholds.find(threshold => (previousPercentage < threshold && currentPercentage >= threshold) ||
               (previousPercentage > threshold && currentPercentage <= threshold));

      if (crossedThreshold) {
        const direction = currentPercentage >= crossedThreshold ? 'reached' : 'dropped below';
        const urgency = crossedThreshold >= 90 || crossedThreshold <= 10 ? 'assertive' : 'polite';
        const message = `Tank ${currentTank.name} ${direction} ${crossedThreshold} percent capacity`;

        if (urgency === 'assertive') {
          announceAlert(message);
        } else {
          announceStatus(message);
        }
      }
    });

    // Update previous tanks reference
    previousTanksRef.current = [...currentTanks];

    // Increment announcement counter to prevent too many announcements
    announcementCountRef.current++;
  }, [tankData, announceStatus, announceAlert, announceTankUpdate]);

  // Announce initial connection
  useEffect(() => {
    if (tankData.connectionStatus === 'connected' && tankData.tanks.length > 0 && announcementCountRef.current === 0) {
      announceStatus('Tank monitoring system ready', `Monitoring ${tankData.tanks.length} tanks`);
    }
  }, [tankData.connectionStatus, tankData.tanks.length, announceStatus]);

  const value: TankDataContextType = {
    ...tankData,
  };

  return (
    <TankDataContext.Provider value={value}>
      {children}
    </TankDataContext.Provider>
  );
};
