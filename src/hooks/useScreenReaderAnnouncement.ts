import { useCallback, useEffect, useRef } from 'react';

interface AnnouncementQueue {
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

export const useScreenReaderAnnouncement = () => {
  const politeRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);
  const lastAnnouncementRef = useRef<string>('');
  const queueRef = useRef<AnnouncementQueue[]>([]);
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    // Create polite live region
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.setAttribute('aria-relevant', 'additions text');
    politeRegion.setAttribute('id', 'live-region-polite');
    politeRegion.className = 'sr-only';
    politeRegion.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(1px, 1px, 1px, 1px) !important;
      clip-path: inset(50%) !important;
      white-space: nowrap !important;
    `;

    // Create assertive live region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.setAttribute('aria-relevant', 'additions text');
    assertiveRegion.setAttribute('id', 'live-region-assertive');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.style.cssText = politeRegion.style.cssText;

    document.body.appendChild(politeRegion);
    document.body.appendChild(assertiveRegion);
    politeRegionRef.current = politeRegion;
    assertiveRegionRef.current = assertiveRegion;

    return () => {
      if (politeRegionRef.current && document.body.contains(politeRegionRef.current)) {
        document.body.removeChild(politeRegionRef.current);
      }
      if (assertiveRegionRef.current && document.body.contains(assertiveRegionRef.current)) {
        document.body.removeChild(assertiveRegionRef.current);
      }
    };
  }, []);

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const announcement = queueRef.current.shift()!;
    const region = announcement.priority === 'assertive'
      ? assertiveRegionRef.current
      : politeRegionRef.current;

    if (region) {
      // Clear the region first
      region.textContent = '';

      // Use requestAnimationFrame to ensure the clear happens before the new content
      requestAnimationFrame(() => {
        if (region) {
          region.textContent = announcement.message;
          lastAnnouncementRef.current = announcement.message;

          // Clear after announcement and process next item
          setTimeout(() => {
            if (region) {
              region.textContent = '';
            }
            processingRef.current = false;

            // Process next item in queue
            if (queueRef.current.length > 0) {
              processQueue();
            }
          }, announcement.priority === 'assertive' ? 500 : 1000);
        }
      });
    } else {
      processingRef.current = false;
    }
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!message.trim()) return;

    // Debounce duplicate messages within 2 seconds
    const now = Date.now();
    if (lastAnnouncementRef.current === message &&
        queueRef.current.some(item => item.message === message && (now - item.timestamp) < 2000)) {
      return;
    }

    // Add to queue
    queueRef.current.push({
      message: message.trim(),
      priority,
      timestamp: now,
    });

    // Remove old items from queue (keep only last 5)
    if (queueRef.current.length > 5) {
      queueRef.current = queueRef.current.slice(-5);
    }

    // Process queue
    processQueue();
  }, [processQueue]);

  const announceStatus = useCallback((status: string, details?: string) => {
    const message = details ? `${status}: ${details}` : status;
    announce(message, 'polite');
  }, [announce]);

  const announceAlert = useCallback((alertMessage: string) => {
    announce(`Alert: ${alertMessage}`, 'assertive');
  }, [announce]);

  const announceTankUpdate = useCallback((tankName: string, level: number, percentage: number, status: string) => {
    const isAlarm = status === 'critical' || status === 'warning';
    const message = `Tank ${tankName}: ${level} millimeters, ${percentage.toFixed(1)} percent full, status ${status}`;
    announce(message, isAlarm ? 'assertive' : 'polite');
  }, [announce]);

  return {
    announce,
    announceStatus,
    announceAlert,
    announceTankUpdate,
  };
};
