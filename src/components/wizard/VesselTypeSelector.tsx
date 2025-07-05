import React from 'react';
import { VesselType } from '../../types/vessel';
import { Ship, Package, Factory, Fuel, Settings } from 'lucide-react';

interface VesselTypeSelectorProps {
  selectedType?: VesselType;
  onSelect: (type: VesselType) => void;
}

interface VesselTypeOption {
  type: VesselType;
  icon: React.ReactNode;
  title: string;
  description: string;
  examples: string[];
}

const vesselTypeOptions: VesselTypeOption[] = [
  {
    type: 'tanker',
    icon: <Ship className="w-8 h-8" />,
    title: 'Tanker',
    description: 'Cargo & Ballast Tanks',
    examples: ['Oil Tanker', 'Chemical Tanker', 'LNG Carrier']
  },
  {
    type: 'bulk-carrier',
    icon: <Package className="w-8 h-8" />,
    title: 'Bulk Carrier',
    description: 'Ballast Tanks Only',
    examples: ['Dry Bulk', 'Ore Carrier', 'Coal Carrier']
  },
  {
    type: 'container-ship',
    icon: <Package className="w-8 h-8" />,
    title: 'Container Ship',
    description: 'Ballast & Fuel Tanks',
    examples: ['Container Vessel', 'Feeder Ship']
  },
  {
    type: 'industrial-plant',
    icon: <Factory className="w-8 h-8" />,
    title: 'Industrial Plant',
    description: 'Process Tanks',
    examples: ['Refinery', 'Chemical Plant', 'Processing Facility']
  },
  {
    type: 'storage-terminal',
    icon: <Fuel className="w-8 h-8" />,
    title: 'Storage Terminal',
    description: 'Fixed Storage Tanks',
    examples: ['Tank Farm', 'Fuel Terminal', 'Chemical Storage']
  },
  {
    type: 'custom',
    icon: <Settings className="w-8 h-8" />,
    title: 'Custom Configuration',
    description: 'Build from Scratch',
    examples: ['Custom Layout', 'Unique Design']
  }
];

export const VesselTypeSelector: React.FC<VesselTypeSelectorProps> = ({
  selectedType,
  onSelect
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Installation Type
        </h2>
        <p className="text-gray-600">
          What type of installation are you configuring?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vesselTypeOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className={`p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg text-left ${
              selectedType === option.type
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-full ${
                selectedType === option.type
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {option.icon}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {option.description}
                </p>
                
                <div className="space-y-1">
                  {option.examples.map((example, index) => (
                    <div key={index} className="text-xs text-gray-500">
                      • {example}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              {vesselTypeOptions.find(opt => opt.type === selectedType)?.title} selected
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Click "Next" to choose your tank layout configuration.
          </p>
        </div>
      )}
    </div>
  );
};
