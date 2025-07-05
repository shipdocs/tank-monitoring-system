import React from 'react';
import { VesselType, VesselTemplate, VESSEL_TEMPLATES } from '../../types/vessel';

interface LayoutTemplateSelectorProps {
  vesselType: VesselType;
  selectedTemplate?: VesselTemplate;
  onSelect: (template: VesselTemplate) => void;
}

export const LayoutTemplateSelector: React.FC<LayoutTemplateSelectorProps> = ({
  vesselType,
  selectedTemplate,
  onSelect
}) => {
  const availableTemplates = VESSEL_TEMPLATES.filter(
    template => template.vesselType === vesselType
  );

  const renderLayoutPreview = (template: VesselTemplate) => {
    switch (template.layoutType) {
      case 'port-starboard':
        return (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xs text-gray-600 mb-2 text-center">Ship Layout (Top View)</div>
            <div className="flex justify-center items-center space-x-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">BOW</div>
                <div className="flex space-x-2">
                  <div className="space-y-1">
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">1P</div>
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">2P</div>
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">3P</div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">1S</div>
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">2S</div>
                    <div className="w-8 h-6 bg-red-200 rounded text-xs flex items-center justify-center">3S</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">STERN</div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Port Side</span>
              <span>Starboard Side</span>
            </div>
          </div>
        );

      case 'port-starboard-center':
        return (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xs text-gray-600 mb-2 text-center">Ship Layout (Top View)</div>
            <div className="flex justify-center items-center">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">BOW</div>
                <div className="flex space-x-1">
                  <div className="space-y-1">
                    <div className="w-6 h-4 bg-red-200 rounded text-xs flex items-center justify-center">1P</div>
                    <div className="w-6 h-4 bg-green-200 rounded text-xs flex items-center justify-center">2P</div>
                    <div className="w-6 h-4 bg-green-200 rounded text-xs flex items-center justify-center">3P</div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">1C</div>
                    <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">2C</div>
                    <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">3C</div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-6 h-4 bg-red-200 rounded text-xs flex items-center justify-center">1S</div>
                    <div className="w-6 h-4 bg-green-200 rounded text-xs flex items-center justify-center">2S</div>
                    <div className="w-6 h-4 bg-green-200 rounded text-xs flex items-center justify-center">3S</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">STERN</div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Port</span>
              <span>Center</span>
              <span>Starboard</span>
            </div>
          </div>
        );

      case 'center-only':
        return (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xs text-gray-600 mb-2 text-center">Layout (Top View)</div>
            <div className="flex justify-center items-center">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">BOW</div>
                <div className="flex space-x-1">
                  <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">1C</div>
                  <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">2C</div>
                  <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">3C</div>
                  <div className="w-6 h-4 bg-blue-200 rounded text-xs flex items-center justify-center">4C</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">STERN</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              Center Line Only
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xs text-gray-600 text-center">Custom Layout</div>
          </div>
        );
    }
  };

  if (availableTemplates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No templates available for this vessel type.</p>
        <p className="text-sm text-gray-500 mt-2">You can create a custom configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Tank Layout
        </h2>
        <p className="text-gray-600">
          Select the tank arrangement for your {vesselType.replace('-', ' ')}
        </p>
      </div>

      <div className="space-y-4">
        {availableTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`w-full p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg text-left ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {template.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {template.description}
                </p>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Tank Groups:</div>
                  <div className="flex flex-wrap gap-2">
                    {template.defaultGroups.map((group, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: group.displaySettings.color + '40',
                          color: group.displaySettings.color.replace('#', '#').slice(0, 7) + 'CC'
                        }}
                      >
                        {group.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {renderLayoutPreview(template)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              {selectedTemplate.name} layout selected
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            This will create {selectedTemplate.defaultGroups.length} tank groups. 
            You can customize them in the next step.
          </p>
        </div>
      )}
    </div>
  );
};
