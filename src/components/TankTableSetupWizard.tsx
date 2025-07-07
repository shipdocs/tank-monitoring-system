import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Upload, Users, Settings, CheckCircle, X } from 'lucide-react';
import { TankTableUpload } from './TankTableUpload';
import { TankGroupManager } from './TankGroupManager';
import { TankMappingManager } from './TankMappingManager';
import { TankTableParseResult, TankTableConfiguration } from '../types/tankTable';
import { useTankTables } from '../hooks/useTankTables';
import { useTankMapping } from '../hooks/useTankMapping';
import { useTankData } from '../hooks/useTankData';

interface TankTableSetupWizardProps {
  onComplete?: (configuration: TankTableConfiguration) => void;
  onClose?: () => void;
  className?: string;
}

type WizardStep = 'upload' | 'groups' | 'mapping' | 'validation' | 'complete';

const STEPS: Array<{ id: WizardStep; title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  {
    id: 'upload',
    title: 'Upload Tank Tables',
    description: 'Import tank table files (PDF, Excel, CSV)',
    icon: Upload
  },
  {
    id: 'groups',
    title: 'Configure Groups',
    description: 'Set up tank groups and product densities',
    icon: Users
  },
  {
    id: 'mapping',
    title: 'Map Data Sources',
    description: 'Connect sensors to tank tables',
    icon: Settings
  },
  {
    id: 'validation',
    title: 'Validate Configuration',
    description: 'Review and confirm settings',
    icon: CheckCircle
  }
];

export const TankTableSetupWizard: React.FC<TankTableSetupWizardProps> = ({
  onComplete,
  onClose,
  className = ''
}) => {
  const { tankTables, tankGroups, saveConfiguration } = useTankTables();
  const { mappings, saveMappingConfiguration } = useTankMapping();
  const tankData = useTankData();
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [uploadResults, setUploadResults] = useState<TankTableParseResult[]>([]);
  const [vesselName, setVesselName] = useState('');

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);

  // Handle step navigation
  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    } else {
      // Complete wizard
      handleComplete();
    }
  }, [currentStepIndex, handleComplete]);

  const handlePrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleStepClick = useCallback((stepId: WizardStep) => {
    setCurrentStep(stepId);
  }, []);

  // Handle upload completion
  const handleUploadComplete = useCallback((result: TankTableParseResult) => {
    setUploadResults(prev => [...prev, result]);
  }, []);

  // Handle wizard completion
  const handleComplete = useCallback(() => {
    const configuration: TankTableConfiguration = {
      id: `config-${Date.now()}`,
      vesselName: vesselName || 'Unnamed Vessel',
      tankTables,
      tankGroups,
      productTypes: [], // Will be populated from useTankTables
      defaultDensity: 850,
      useASTMCorrection: true,
      flowRateSmoothing: 0.3,
      lastUpdated: new Date()
    };

    // Save tank table configuration
    saveConfiguration(configuration);

    // Save mapping configuration
    const mappingConfig = {
      id: `mapping-config-${Date.now()}`,
      vesselName: vesselName || 'Unnamed Vessel',
      mappings,
      autoMappingEnabled: true,
      lastUpdated: new Date(),
      validationStatus: {
        isValid: true,
        unmappedTanks: [],
        invalidMappings: [],
        warnings: []
      }
    };

    saveMappingConfiguration(mappingConfig);

    if (onComplete) {
      onComplete(configuration);
    }
  }, [vesselName, tankTables, tankGroups, mappings, saveConfiguration, saveMappingConfiguration, onComplete]);

  // Check if step can be completed
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        return uploadResults.some(result => result.success);
      case 'groups':
        return tankGroups.length > 0;
      case 'mapping': {
        // Check if all tanks are mapped
        const totalTanks = tankData.tanks.length;
        const mappedTanks = mappings.length;
        return totalTanks > 0 && mappedTanks === totalTanks;
      }
      case 'validation':
        return vesselName.trim().length > 0;
      default:
        return true;
    }
  }, [currentStep, uploadResults, tankGroups, vesselName, tankData.tanks, mappings]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Tank Tables</h3>
              <p className="text-gray-600 mb-4">
                Upload your vessel's tank table files. These will serve as the foundation for volume and mass calculations.
              </p>
            </div>
            
            <TankTableUpload onUploadComplete={handleUploadComplete} />
            
            {uploadResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Upload Results</h4>
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {result.success ? 'Success' : 'Failed'}: {result.detectedFormat.toUpperCase()}
                      </span>
                    </div>
                    {result.tankTable && (
                      <p className="text-sm text-gray-600 mt-1">
                        {result.tankTable.volumeEntries.length} volume entries, max level: {result.tankTable.maxLevel}{result.tankTable.unit}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'groups':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Configure Tank Groups</h3>
              <p className="text-gray-600 mb-4">
                Create tank groups to organize tanks by product type and set density values for mass calculations.
              </p>
            </div>
            
            <TankGroupManager />
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Map Data Sources</h3>
              <p className="text-gray-600 mb-4">
                Connect your tank sensors and data sources to the uploaded tank tables for accurate calculations.
              </p>
            </div>

            {tankData.tanks.length === 0 ? (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>No tank data detected.</strong> Make sure your tank monitoring system is running and providing data.
                </p>
              </div>
            ) : tankTables.length === 0 ? (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800 text-sm">
                  <strong>No tank tables uploaded.</strong> Please upload tank tables in the previous step.
                </p>
              </div>
            ) : (
              <TankMappingManager
                dataSourceTanks={tankData.tanks}
                onMappingComplete={(completedMappings) => {
                  console.log('Mapping completed:', completedMappings);
                }}
              />
            )}
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Validate Configuration</h3>
              <p className="text-gray-600 mb-4">
                Review your configuration and provide a vessel name to complete the setup.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vessel Name *
                </label>
                <input
                  type="text"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vessel name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Tank Tables</h4>
                  <p className="text-2xl font-bold text-blue-600">{tankTables.length}</p>
                  <p className="text-sm text-gray-600">Uploaded</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Tank Groups</h4>
                  <p className="text-2xl font-bold text-green-600">{tankGroups.length}</p>
                  <p className="text-sm text-gray-600">Configured</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <p className="text-2xl font-bold text-green-600">✓</p>
                  <p className="text-sm text-gray-600">Ready</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Tank Table Setup Wizard</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-sm text-gray-500">
          Step {currentStepIndex + 1} of {STEPS.length}
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>{currentStepIndex === STEPS.length - 1 ? 'Complete' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
