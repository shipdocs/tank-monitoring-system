import React from 'react';
import { ViewMode } from '../types/tank';
import { Grid3X3, List, LayoutGrid, ArrowRight, Columns3, Columns2, Settings } from 'lucide-react';

interface DefaultLayoutSettingsProps {
  currentDefault: ViewMode;
  onDefaultChange: (layout: ViewMode) => void;
}

export const DefaultLayoutSettings: React.FC<DefaultLayoutSettingsProps> = ({
  currentDefault,
  onDefaultChange,
}) => {
  const viewOptions = [
    {
      mode: 'grid' as ViewMode,
      icon: <Grid3X3 className="w-4 h-4" />,
      label: 'Grid View',
      description: 'Cards in a responsive grid'
    },
    {
      mode: 'list' as ViewMode,
      icon: <List className="w-4 h-4" />,
      label: 'List View',
      description: 'Detailed horizontal list'
    },
    {
      mode: 'compact' as ViewMode,
      icon: <LayoutGrid className="w-4 h-4" />,
      label: 'Compact View',
      description: 'Small cards with essential info'
    },
    {
      mode: 'single-row' as ViewMode,
      icon: <ArrowRight className="w-4 h-4" />,
      label: 'Single Row',
      description: 'Horizontal scrolling row'
    },
    {
      mode: 'column' as ViewMode,
      icon: <Columns3 className="w-4 h-4" />,
      label: 'Column View',
      description: 'Tanks as vertical cylinders in rows'
    },
    {
      mode: 'side-by-side' as ViewMode,
      icon: <Columns2 className="w-4 h-4" />,
      label: 'Side by Side',
      description: 'BB left, SB right in two columns'
    }
  ];

  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <Settings className="w-4 h-4 text-gray-600" />
        <h3 className="text-md font-semibold text-gray-800">Default Layout</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Choose which layout to use when the app starts
      </p>
      
      <div className="space-y-2">
        {viewOptions.map((option) => (
          <button
            key={option.mode}
            onClick={() => onDefaultChange(option.mode)}
            className={`w-full flex items-center space-x-3 p-2 rounded-lg border transition-all duration-200 hover:shadow-sm ${
              currentDefault === option.mode
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={`Set ${option.label} as default startup layout`}
          >
            <div className="flex-shrink-0">
              {option.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">
                {option.label}
              </div>
              <div className="text-xs opacity-75">
                {option.description}
              </div>
            </div>
            {currentDefault === option.mode && (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 This setting is saved locally and will be used when you restart the app
        </p>
      </div>
    </div>
  );
};
