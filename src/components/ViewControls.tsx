import React from 'react';
import { ViewMode } from '../types/tank';
import { Grid3X3, List, Rows3, LayoutGrid, Columns3 } from 'lucide-react';

interface ViewControlsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({ currentView, onViewChange }) => {
  const viewOptions = [
    {
      mode: 'grid' as ViewMode,
      icon: <Grid3X3 className="w-4 h-4" />,
      label: 'Grid View',
      description: 'Cards in a grid layout'
    },
    {
      mode: 'list' as ViewMode,
      icon: <List className="w-4 h-4" />,
      label: 'List View',
      description: 'Vertical list layout'
    },
    {
      mode: 'compact' as ViewMode,
      icon: <LayoutGrid className="w-4 h-4" />,
      label: 'Compact View',
      description: 'Smaller cards, more per row'
    },
    {
      mode: 'single-row' as ViewMode,
      icon: <Rows3 className="w-4 h-4" />,
      label: 'Single Row',
      description: 'All tanks in one horizontal row'
    },
    {
      mode: 'column' as ViewMode,
      icon: <Columns3 className="w-4 h-4" />,
      label: 'Column View',
      description: 'Tanks as vertical cylinders in rows'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">View Options</h3>
          <p className="text-sm text-gray-600">Choose how to display your tanks</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {viewOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => onViewChange(option.mode)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === option.mode
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
              }`}
              title={option.description}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
