import React, { useEffect, useRef } from 'react';
import { type ViewMode } from '../types/tank';
import { Columns3, Grid3X3, LayoutGrid, List, Rows3 } from 'lucide-react';

interface ViewControlsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({ currentView, onViewChange }) => {
  const groupRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!groupRef.current) return;

      const buttons = Array.from(groupRef.current.querySelectorAll('button'));
      const currentIndex = buttons.findIndex(button => button.getAttribute('aria-checked') === 'true');

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        let newIndex = currentIndex;

        if (e.key === 'ArrowLeft') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        } else if (e.key === 'ArrowRight') {
          newIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        }

        const newButton = buttons[newIndex];
        if (newButton) {
          newButton.focus();
          newButton.click();
        }
      }
    };

    const group = groupRef.current;
    if (group) {
      group.addEventListener('keydown', handleKeyDown);
      return () => group.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const viewOptions = [
    {
      mode: 'grid' as ViewMode,
      icon: <Grid3X3 className="w-4 h-4" />,
      label: 'Grid View',
      description: 'Cards in a grid layout',
    },
    {
      mode: 'list' as ViewMode,
      icon: <List className="w-4 h-4" />,
      label: 'List View',
      description: 'Vertical list layout',
    },
    {
      mode: 'compact' as ViewMode,
      icon: <LayoutGrid className="w-4 h-4" />,
      label: 'Compact View',
      description: 'Smaller cards, more per row',
    },
    {
      mode: 'single-row' as ViewMode,
      icon: <Rows3 className="w-4 h-4" />,
      label: 'Single Row',
      description: 'All tanks in one horizontal row',
    },
    {
      mode: 'column' as ViewMode,
      icon: <Columns3 className="w-4 h-4" />,
      label: 'Column View',
      description: 'Tanks as vertical cylinders in rows',
    },
  ];

  return (
    <nav className="bg-white rounded-lg shadow-sm p-4 mb-6" aria-label="View mode selection">
      <div className="flex items-center justify-between">
        <div>
          <h3 id="view-options-heading" className="text-lg font-semibold text-gray-800 mb-1">View Options</h3>
          <p className="text-sm text-gray-600">Choose how to display your tanks</p>
        </div>

        <div className="flex items-center space-x-2" role="radiogroup" aria-labelledby="view-options-heading" ref={groupRef}>
          {viewOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => onViewChange(option.mode)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                currentView === option.mode
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
              }`}
              role="radio"
              aria-checked={currentView === option.mode}
              aria-label={`${option.label}: ${option.description}`}
              tabIndex={currentView === option.mode ? 0 : -1}
            >
              <span aria-hidden="true">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
