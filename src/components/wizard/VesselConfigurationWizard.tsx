import React, { useState, useEffect } from 'react';
import { VesselTypeSelector } from './VesselTypeSelector';
import { DataSourceSelector } from './DataSourceSelector';
import { LayoutTemplateSelector } from './LayoutTemplateSelector';
import { TankAssignmentStep } from './TankAssignmentStep';
import { WizardSummary } from './WizardSummary';
import { VesselType, VesselTemplate, WizardState, DataSourceConfig } from '../../types/vessel';
import { Tank } from '../../types/tank';
import { useDatabaseVesselConfiguration } from '../../hooks/useDatabaseVesselConfiguration';
import { applyWizardConfigToServer } from '../../utils/serverConfig';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface VesselConfigurationWizardProps {
  tanks: Tank[]; // Tanks from configured data source
  onComplete: (vesselId: string) => void;
  onCancel: () => void;
}

export const VesselConfigurationWizard: React.FC<VesselConfigurationWizardProps> = ({
  tanks,
  onComplete,
  onCancel
}) => {
  const { createVesselFromTemplate, assignTankToGroup } = useDatabaseVesselConfiguration();

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1
  });

  const [currentTanks, setCurrentTanks] = useState<Tank[]>(tanks);
  const [isLoadingTanks] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);

  const totalSteps = 5;

  // Use existing enhanced tanks when reaching step 4
  useEffect(() => {
    if (wizardState.step === 4) {
      // Use the tanks passed from the main app (already enhanced with tank table data)
      setCurrentTanks(tanks);
      console.log(`✅ Using ${tanks.length} enhanced tanks from main application`);
    } else if (wizardState.step !== 4) {
      // Reset to original tanks when not in assignment step
      setCurrentTanks(tanks);
    }
  }, [wizardState.step, tanks]);

  const updateWizardState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const handleVesselTypeSelect = (vesselType: VesselType) => {
    updateWizardState({ vesselType });
  };

  const handleDataSourceSelect = (dataSource: DataSourceConfig) => {
    updateWizardState({ dataSource });
  };

  const handleTemplateSelect = (template: VesselTemplate) => {
    updateWizardState({ selectedTemplate: template });
  };

  const handleVesselNameChange = (vesselName: string) => {
    updateWizardState({ vesselName });
  };

  const handleTankAssignment = (assignments: Record<string, string>) => {
    updateWizardState({ tankAssignments: assignments });
  };

  const handleNext = () => {
    if (wizardState.step < totalSteps) {
      updateWizardState({ step: wizardState.step + 1 });
    }
  };

  const handleBack = () => {
    if (wizardState.step > 1) {
      updateWizardState({ step: wizardState.step - 1 });
    }
  };

  const handleComplete = async () => {
    if (!wizardState.selectedTemplate || !wizardState.vesselName || !wizardState.dataSource) return;

    setIsApplyingConfig(true);

    try {
      // 1. Apply data source configuration to server
      console.log('🔧 Applying data source configuration to server...');
      const serverResult = await applyWizardConfigToServer(wizardState.dataSource, currentTanks.length);

      if (!serverResult.success) {
        throw new Error('Failed to configure server data source');
      }

      console.log(`✅ Server configuration applied. Connected: ${serverResult.connected}`);

      // 2. Create vessel from template
      const vesselId = createVesselFromTemplate(
        wizardState.selectedTemplate.id,
        wizardState.vesselName
      );

      // 3. Assign tanks to groups
      if (wizardState.tankAssignments) {
        Object.entries(wizardState.tankAssignments).forEach(([tankId, groupId]) => {
          if (groupId) {
            assignTankToGroup(vesselId, tankId, groupId);
          }
        });
      }

      // 4. Show success message
      alert(`Configuration completed successfully!\n\nServer: ${serverResult.connected ? 'Connected' : 'Configured'}\nVessel: ${wizardState.vesselName}\nTanks: ${currentTanks.length}`);

      onComplete(vesselId);
    } catch (error) {
      console.error('Failed to complete wizard configuration:', error);
      alert(`Failed to complete configuration: ${error.message}\n\nPlease check the server connection and try again.`);
    } finally {
      setIsApplyingConfig(false);
    }
  };

  const canProceed = () => {
    const result = (() => {
      switch (wizardState.step) {
        case 1:
          return !!wizardState.vesselType;
        case 2:
          return !!wizardState.dataSource;
        case 3:
          return !!wizardState.selectedTemplate;
        case 4:
          return !!wizardState.vesselName?.trim();
        case 5:
          return true; // Summary step, always can complete
        default:
          return false;
      }
    })();

    // Debug only on step changes (reduce console spam)
    if (window.lastDebugStep !== wizardState.step) {
      console.log('🔍 Wizard Step:', wizardState.step, 'Can proceed:', result);
      window.lastDebugStep = wizardState.step;
    }

    return result;
  };

  const getStepTitle = () => {
    switch (wizardState.step) {
      case 1:
        return 'Installation Type';
      case 2:
        return 'Data Source';
      case 3:
        return 'Tank Layout';
      case 4:
        return 'Tank Assignment';
      case 5:
        return 'Review & Complete';
      default:
        return 'Configuration';
    }
  };

  const renderStepContent = () => {
    switch (wizardState.step) {
      case 1:
        return (
          <VesselTypeSelector
            selectedType={wizardState.vesselType}
            onSelect={handleVesselTypeSelect}
          />
        );

      case 2:
        return (
          <DataSourceSelector
            selectedDataSource={wizardState.dataSource}
            onSelect={handleDataSourceSelect}
          />
        );

      case 3:
        return wizardState.vesselType ? (
          <LayoutTemplateSelector
            vesselType={wizardState.vesselType}
            selectedTemplate={wizardState.selectedTemplate}
            onSelect={handleTemplateSelect}
          />
        ) : null;

      case 4:
        return wizardState.selectedTemplate ? (
          <div>
            {isLoadingTanks && (
              <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Loading tanks from data source...</span>
              </div>
            )}
            <TankAssignmentStep
              tanks={currentTanks}
              template={wizardState.selectedTemplate}
              vesselName={wizardState.vesselName || ''}
              onVesselNameChange={handleVesselNameChange}
              onTankAssignment={handleTankAssignment}
            />
          </div>
        ) : null;

      case 5:
        return (
          <WizardSummary
            wizardState={wizardState}
            tanks={currentTanks}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Vessel Configuration Wizard</h1>
              <p className="text-blue-100 mt-1">
                Step {wizardState.step} of {totalSteps}: {getStepTitle()}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }, (_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index + 1 < wizardState.step
                      ? 'bg-green-500 text-white'
                      : index + 1 === wizardState.step
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-blue-200'
                  }`}>
                    {index + 1 < wizardState.step ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < totalSteps - 1 && (
                    <div className={`w-8 h-1 mx-2 ${
                      index + 1 < wizardState.step ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex-shrink-0">
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Step {wizardState.step}/{totalSteps} |
            Type: {wizardState.vesselType || 'none'} |
            Data: {wizardState.dataSource?.type || 'none'} |
            Tanks: {currentTanks.length} |
            Template: {wizardState.selectedTemplate?.name || 'none'} |
            Name: {wizardState.vesselName || 'none'} |
            Can proceed: {canProceed() ? 'yes' : 'no'}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={wizardState.step === 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                wizardState.step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            {wizardState.step === totalSteps ? (
              <button
                onClick={handleComplete}
                disabled={isApplyingConfig}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                  isApplyingConfig
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isApplyingConfig ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Applying Configuration...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete Setup</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors border-2 ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300'
                }`}
                title={canProceed() ? 'Proceed to next step' : 'Complete current step to continue'}
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
