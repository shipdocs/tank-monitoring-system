import React from 'react';
import { type WizardState } from '../../types/vessel';
import { type Tank } from '../../types/tank';
import { AlertTriangle, CheckCircle, Layout, Ship, Users } from 'lucide-react';

interface WizardSummaryProps {
  wizardState: WizardState;
  tanks: Tank[];
}

export const WizardSummary: React.FC<WizardSummaryProps> = ({
  wizardState,
  tanks,
}) => {
  const { vesselType, selectedTemplate, vesselName, tankAssignments } = wizardState;

  const getAssignedTanks = () => {
    if (!tankAssignments) return [];
    return Object.keys(tankAssignments).filter(tankId => tankAssignments[tankId]);
  };

  const getUnassignedTanks = () => {
    if (!tankAssignments) return tanks;
    return tanks.filter(tank => !tankAssignments[tank.id]);
  };

  const getTanksByGroup = () => {
    if (!tankAssignments || !selectedTemplate) return {};

    const result: Record<string, Tank[]> = {};

    selectedTemplate.defaultGroups.forEach(group => {
      result[group.name] = tanks.filter(tank =>
        tankAssignments[tank.id] === group.name,
      );
    });

    return result;
  };

  const tanksByGroup = getTanksByGroup();
  const assignedTanks = getAssignedTanks();
  const unassignedTanks = getUnassignedTanks();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuration Summary
        </h2>
        <p className="text-gray-600">
          Review your vessel configuration before completing setup
        </p>
      </div>

      {/* Vessel Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Ship className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Vessel Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-blue-700 font-medium">Vessel Name</div>
            <div className="text-blue-900 font-semibold">{vesselName || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-sm text-blue-700 font-medium">Type</div>
            <div className="text-blue-900 capitalize">
              {vesselType?.replace('-', ' ') || 'Not selected'}
            </div>
          </div>
          <div>
            <div className="text-sm text-blue-700 font-medium">Layout</div>
            <div className="text-blue-900">{selectedTemplate?.name || 'Not selected'}</div>
          </div>
        </div>
      </div>

      {/* Tank Groups Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Layout className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tank Groups</h3>
        </div>

        {selectedTemplate && (
          <div className="space-y-4">
            {selectedTemplate.defaultGroups.map((group, index) => {
              const groupTanks = tanksByGroup[group.name] || [];

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.displaySettings.color }}
                      />
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      <span className="text-sm text-gray-500">
                        ({group.position} • {group.groupType})
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {groupTanks.length} tanks assigned
                    </div>
                  </div>

                  {groupTanks.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {groupTanks.map(tank => (
                        <div key={tank.id} className="text-sm bg-gray-50 px-2 py-1 rounded">
                          {tank.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No tanks assigned to this group
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tank Assignment Status</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{tanks.length}</div>
            <div className="text-sm text-gray-600">Total Tanks</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{assignedTanks.length}</div>
            <div className="text-sm text-green-700">Assigned</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{unassignedTanks.length}</div>
            <div className="text-sm text-orange-700">Unassigned</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {selectedTemplate?.defaultGroups.length || 0}
            </div>
            <div className="text-sm text-blue-700">Groups</div>
          </div>
        </div>
      </div>

      {/* Unassigned Tanks Warning */}
      {unassignedTanks.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium text-orange-800">Unassigned Tanks</h4>
          </div>
          <p className="text-sm text-orange-700 mb-3">
            The following tanks are not assigned to any group and will appear separately:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {unassignedTanks.map(tank => (
              <div key={tank.id} className="text-sm bg-orange-100 px-2 py-1 rounded">
                {tank.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Complete */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-medium text-green-800">Ready to Complete</h4>
        </div>
        <p className="text-sm text-green-700">
          Your vessel configuration is ready. Click "Complete Setup" to apply this configuration
          and start monitoring your tanks with the new grouped layout.
        </p>

        {vesselName && selectedTemplate && (
          <div className="mt-3 text-sm text-green-600">
            <strong>"{vesselName}"</strong> will be configured with <strong>{selectedTemplate.name}</strong> layout
            and <strong>{assignedTanks.length}</strong> assigned tanks.
          </div>
        )}
      </div>
    </div>
  );
};
