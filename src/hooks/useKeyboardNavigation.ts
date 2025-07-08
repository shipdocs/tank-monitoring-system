import { useCallback, useEffect, useRef } from 'react';

interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableGridNavigation?: boolean;
  gridColumns?: number;
  onEnterKey?: (element: HTMLElement) => void;
  onSpaceKey?: (element: HTMLElement) => void;
  onEscapeKey?: (element: HTMLElement) => void;
  onFocusChange?: (element: HTMLElement, index: number) => void;
  excludeSelector?: string;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const lastFocusedIndexRef = useRef<number>(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    let selector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="menuitem"], [role="tab"]';

    if (options.excludeSelector) {
      selector += `:not(${options.excludeSelector})`;
    }

    const elements = containerRef.current.querySelectorAll(selector);
    return Array.from(elements) as HTMLElement[];
  }, [options.excludeSelector]);

  const focusElement = useCallback((element: HTMLElement, index: number) => {
    element.focus();
    lastFocusedIndexRef.current = index;

    // Scroll element into view if necessary
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });

    if (options.onFocusChange) {
      options.onFocusChange(element, index);
    }
  }, [options.onFocusChange]);

  const handleGridNavigation = useCallback((
    currentIndex: number,
    direction: 'up' | 'down' | 'left' | 'right',
    focusableArray: HTMLElement[],
  ) => {
    if (!options.enableGridNavigation || !options.gridColumns) {
      return handleLinearNavigation(currentIndex, direction === 'up' || direction === 'left' ? 'previous' : 'next', focusableArray);
    }

    const cols = options.gridColumns;
    const totalElements = focusableArray.length;
    let newIndex = currentIndex;

    switch (direction) {
      case 'left':
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalElements - 1;
        break;
      case 'right':
        newIndex = currentIndex < totalElements - 1 ? currentIndex + 1 : 0;
        break;
      case 'up':
        newIndex = currentIndex - cols;
        if (newIndex < 0) {
          // Go to the last row, same column
          const col = currentIndex % cols;
          const lastRowStart = Math.floor((totalElements - 1) / cols) * cols;
          newIndex = Math.min(lastRowStart + col, totalElements - 1);
        }
        break;
      case 'down':
        newIndex = currentIndex + cols;
        if (newIndex >= totalElements) {
          // Go to the first row, same column
          newIndex = currentIndex % cols;
        }
        break;
    }

    return newIndex;
  }, [options.enableGridNavigation, options.gridColumns]);

  const handleLinearNavigation = useCallback((
    currentIndex: number,
    direction: 'previous' | 'next',
    focusableArray: HTMLElement[],
  ) => {
    const totalElements = focusableArray.length;

    if (direction === 'next') {
      return currentIndex < totalElements - 1 ? currentIndex + 1 : 0;
    } else {
      return currentIndex > 0 ? currentIndex - 1 : totalElements - 1;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      // Don't interfere with form elements unless specifically enabled
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const focusableArray = getFocusableElements();
      if (focusableArray.length === 0) return;

      const currentIndex = focusableArray.findIndex(el => el === document.activeElement);

      // Handle arrow key navigation
      if (options.enableArrowKeys && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        let newIndex = currentIndex;

        if (currentIndex === -1) {
          // No element focused, focus first element
          newIndex = 0;
        } else {
          switch (e.key) {
            case 'ArrowUp':
              newIndex = handleGridNavigation(currentIndex, 'up', focusableArray);
              break;
            case 'ArrowDown':
              newIndex = handleGridNavigation(currentIndex, 'down', focusableArray);
              break;
            case 'ArrowLeft':
              newIndex = handleGridNavigation(currentIndex, 'left', focusableArray);
              break;
            case 'ArrowRight':
              newIndex = handleGridNavigation(currentIndex, 'right', focusableArray);
              break;
          }
        }

        const nextElement = focusableArray[newIndex];
        if (nextElement) {
          focusElement(nextElement, newIndex);
        }
      }

      // Handle Home/End keys
      if (e.key === 'Home') {
        e.preventDefault();
        const firstElement = focusableArray[0];
        if (firstElement) {
          focusElement(firstElement, 0);
        }
      }

      if (e.key === 'End') {
        e.preventDefault();
        const lastIndex = focusableArray.length - 1;
        const lastElement = focusableArray[lastIndex];
        if (lastElement) {
          focusElement(lastElement, lastIndex);
        }
      }

      // Handle action keys
      if (e.key === 'Enter' && options.onEnterKey && document.activeElement) {
        options.onEnterKey(document.activeElement as HTMLElement);
      }

      if (e.key === ' ' && options.onSpaceKey && document.activeElement) {
        e.preventDefault();
        options.onSpaceKey(document.activeElement as HTMLElement);
      }

      if (e.key === 'Escape' && options.onEscapeKey && document.activeElement) {
        options.onEscapeKey(document.activeElement as HTMLElement);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [options, getFocusableElements, handleGridNavigation, focusElement]);

  // Return utilities for managing focus
  const focusFirst = useCallback(() => {
    const focusableArray = getFocusableElements();
    if (focusableArray.length > 0) {
      focusElement(focusableArray[0], 0);
    }
  }, [getFocusableElements, focusElement]);

  const focusLast = useCallback(() => {
    const focusableArray = getFocusableElements();
    if (focusableArray.length > 0) {
      const lastIndex = focusableArray.length - 1;
      focusElement(focusableArray[lastIndex], lastIndex);
    }
  }, [getFocusableElements, focusElement]);

  const focusByIndex = useCallback((index: number) => {
    const focusableArray = getFocusableElements();
    if (index >= 0 && index < focusableArray.length) {
      focusElement(focusableArray[index], index);
    }
  }, [getFocusableElements, focusElement]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusByIndex,
    getFocusableElements,
  };
};
