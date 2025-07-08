import React from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { type Tank } from '../types/tank';

/**
 * Example component showing how to use the unified configuration system
 */
export const UnifiedConfigurationExample: React.FC<{ tanks: Tank[] }> = ({ tanks }) => {
  const {
    // Tank configuration
    tankConfigurations,
    updateTankConfiguration,
    reorderTanks,

    // Vessel configuration
    currentVessel,
    vessels,
    createVessel,
    setActiveVessel,

    // Tank groups
    addTankGroup,
    assignTankToGroup,

    // Import/Export
    exportConfiguration,
    importConfiguration,

    // Loading state
    isLoading,
  } = useConfiguration();

  // Apply tank configurations to get display names and positions
  const configuredTanks = React.useMemo(() => {
    const configMap = new Map(tankConfigurations.map(tc => [tc.id, tc]));

    return tanks.map(tank => {
      const config = configMap.get(tank.id);
      return {
        ...tank,
        name: config?.customName || tank.name,
        position: config?.position ?? 999,
      };
    }).sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [tanks, tankConfigurations]);

  // Handle tank rename
  const handleRenameTank = (tankId: number, newName: string) => {
    updateTankConfiguration(tankId, { customName: newName });
  };

  // Handle vessel creation
  const handleCreateVessel = () => {
    const vesselId = createVessel({
      name: 'New Vessel',
      type: 'tanker',
      layout: {
        type: 'port-starboard-center',
        sections: {},
      },
      tankGroups: [],
    });

    // Add default tank groups
    addTankGroup(vesselId, {
      name: 'Port Tanks',
      position: 'port',
      groupType: 'cargo',
      displaySettings: {
        color: '#c8e6c9',
        collapsed: false,
        sortOrder: 1,
      },
    });
  };

  // Handle file import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await importConfiguration(file);
      if (success) {
        console.log('Configuration imported successfully');
      } else {
        console.error('Failed to import configuration');
      }
    }
  };

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div>
      <h2>Unified Configuration Example</h2>

      {/* Tank Configuration */}
      <section>
        <h3>Tank Configuration</h3>
        <ul>
          {configuredTanks.map((tank, index) => (
            <li key={tank.id}>
              <input
                type="text"
                value={tank.name}
                onChange={(e) => handleRenameTank(tank.id, e.target.value)}
              />
              <button
                onClick={() => reorderTanks(index, Math.max(0, index - 1))}
                disabled={index === 0}
              >
                Move Up
              </button>
              <button
                onClick={() => reorderTanks(index, index + 1)}
                disabled={index === configuredTanks.length - 1}
              >
                Move Down
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Vessel Configuration */}
      <section>
        <h3>Vessel Configuration</h3>
        <p>Current Vessel: {currentVessel?.name || 'None'}</p>
        <p>Total Vessels: {vessels.length}</p>

        <button onClick={handleCreateVessel}>Create New Vessel</button>

        <select
          value={currentVessel?.id || ''}
          onChange={(e) => setActiveVessel(e.target.value)}
        >
          <option value="">Select a vessel</option>
          {vessels.map(vessel => (
            <option key={vessel.id} value={vessel.id}>
              {vessel.name}
            </option>
          ))}
        </select>
      </section>

      {/* Tank Groups */}
      {currentVessel && (
        <section>
          <h3>Tank Groups</h3>
          {currentVessel.tankGroups.map(group => (
            <div key={group.id}>
              <h4>{group.name}</h4>
              <p>Position: {group.position}</p>
              <p>Type: {group.groupType}</p>
              <p>Tanks: {group.tanks.length}</p>

              <select onChange={(e) => {
                if (e.target.value) {
                  assignTankToGroup(currentVessel.id, e.target.value, group.id);
                }
              }}>
                <option value="">Add tank to group</option>
                {configuredTanks.map(tank => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}

      {/* Import/Export */}
      <section>
        <h3>Import/Export</h3>
        <button onClick={exportConfiguration}>Export Configuration</button>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
        />
      </section>
    </div>
  );
};
