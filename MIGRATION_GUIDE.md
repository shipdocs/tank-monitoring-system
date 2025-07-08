# Configuration System Migration Guide

This guide explains how to migrate from the old fragmented configuration hooks to the new unified configuration system.

## Overview

The old system had 4 separate hooks:
- `useTankConfiguration` - localStorage-based tank configuration
- `useDatabaseTankConfiguration` - enhanced localStorage tank configuration
- `useVesselConfiguration` - localStorage-based vessel configuration
- `useDatabaseVesselConfiguration` - enhanced localStorage vessel configuration

The new system provides:
- **Single unified hook**: `useConfiguration`
- **Centralized storage**: `UnifiedConfigurationStorage`
- **Consistent API**: Same methods for all configuration types
- **Automatic migration**: Old data is migrated automatically
- **TypeScript support**: Proper types in `types/configuration.ts`

## Migration Steps

### Step 1: Add ConfigurationProvider

Wrap your app with the `ConfigurationProvider`:

```tsx
import { ConfigurationProvider } from './contexts/ConfigurationContext';
import { useTanks } from './hooks/useTanks'; // Your existing tank data hook

function App() {
  const { tanks } = useTanks();
  
  return (
    <ConfigurationProvider tanks={tanks}>
      {/* Your app components */}
    </ConfigurationProvider>
  );
}
```

### Step 2: Update Imports (Quick Migration)

For a quick migration without changing component code, update your imports:

```tsx
// Old imports:
// import { useTankConfiguration } from '../hooks/useTankConfiguration';
// import { useDatabaseTankConfiguration } from '../hooks/useDatabaseTankConfiguration';
// import { useVesselConfiguration } from '../hooks/useVesselConfiguration';
// import { useDatabaseVesselConfiguration } from '../hooks/useDatabaseVesselConfiguration';

// New imports (temporary migration hooks):
import { 
  useTankConfiguration,
  useDatabaseTankConfiguration,
  useVesselConfiguration,
  useDatabaseVesselConfiguration 
} from '../hooks/migrations';
```

### Step 3: Gradual Component Migration

Update components to use the unified configuration directly:

#### Tank Configuration Example

```tsx
// Old way:
const { 
  configuredTanks, 
  reorderTanks, 
  renameTank 
} = useTankConfiguration(tanks);

// New way:
import { useConfiguration } from '../contexts/ConfigurationContext';

const { 
  tankConfigurations,
  updateTankConfiguration,
  reorderTanks 
} = useConfiguration();

// Apply configurations to tanks
const configuredTanks = useMemo(() => {
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

// Rename a tank
const renameTank = (tankId: number, newName: string) => {
  updateTankConfiguration(tankId, { customName: newName });
};
```

#### Vessel Configuration Example

```tsx
// Old way:
const {
  currentVessel,
  createVessel,
  updateVessel
} = useVesselConfiguration();

// New way:
import { useConfiguration } from '../contexts/ConfigurationContext';

const {
  currentVessel,
  createVessel,
  updateVessel
} = useConfiguration();
// Same API, no changes needed!
```

### Step 4: Remove Old Hooks

Once all components are migrated:

1. Delete the old hook files:
   - `src/hooks/useTankConfiguration.ts`
   - `src/hooks/useDatabaseTankConfiguration.ts`
   - `src/hooks/useVesselConfiguration.ts`
   - `src/hooks/useDatabaseVesselConfiguration.ts`

2. Delete the migration hooks:
   - `src/hooks/migrations/` directory

3. Delete the old storage file:
   - `src/storage/TankStorage.ts`

## API Reference

### useConfiguration Hook

```tsx
const {
  // Tank configuration
  tankConfigurations,              // TankConfiguration[]
  updateTankConfiguration,         // (tankId, config) => void
  reorderTanks,                   // (oldIndex, newIndex) => void
  resetTankConfiguration,         // () => void
  
  // Vessel configuration
  vessels,                        // VesselConfiguration[]
  currentVessel,                  // VesselConfiguration | null
  createVessel,                   // (vessel) => string
  updateVessel,                   // (id, updates) => void
  deleteVessel,                   // (id) => void
  setActiveVessel,                // (id) => void
  
  // Tank groups
  addTankGroup,                   // (vesselId, group) => void
  updateTankGroup,                // (vesselId, groupId, updates) => void
  deleteTankGroup,                // (vesselId, groupId) => void
  reorderTankGroups,              // (vesselId, groupIds) => void
  
  // Tank assignment
  assignTankToGroup,              // (vesselId, tankId, groupId) => void
  removeTankFromGroup,            // (vesselId, tankId) => void
  reorderTanksInGroup,            // (vesselId, groupId, tankIds) => void
  
  // Templates
  templates,                      // VesselTemplate[]
  createVesselFromTemplate,       // (templateId, name) => string
  
  // Import/Export
  exportConfiguration,            // () => void
  importConfiguration,            // (file) => Promise<boolean>
  
  // Loading state
  isLoading                       // boolean
} = useConfiguration();
```

## Benefits of Migration

1. **Simplified Code**: One hook instead of four
2. **Consistent API**: Same patterns for all configuration types
3. **Better Performance**: Centralized state management
4. **Type Safety**: Comprehensive TypeScript types
5. **Automatic Migration**: Old data is migrated automatically
6. **Future-Proof**: Easy to extend with new configuration types

## Troubleshooting

### Data Not Migrating

The system automatically migrates old data on first load. If data isn't migrating:

1. Check browser console for migration logs
2. Verify old data exists in localStorage
3. Clear the new storage keys and reload:
   ```js
   localStorage.removeItem('tankmon-vessels-v3');
   localStorage.removeItem('tankmon-app-config-v3');
   ```

### TypeScript Errors

Make sure to:
1. Import types from `types/configuration.ts`
2. Use the `ConfigurationProvider` at the app root
3. Update component props that expect old configuration types

### Performance Issues

The unified system is more efficient, but if you notice issues:
1. Use `useMemo` for derived data (like configured tanks)
2. Avoid unnecessary re-renders by using callbacks properly
3. Check that `ConfigurationProvider` is not re-mounting

## Example: Complete Component Migration

Here's a complete example of migrating a tank list component:

```tsx
// Before:
import { useDatabaseTankConfiguration } from '../hooks/useDatabaseTankConfiguration';

function TankList({ tanks }) {
  const { 
    configuredTanks, 
    reorderTanks, 
    renameTank,
    isLoading 
  } = useDatabaseTankConfiguration(tanks);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {configuredTanks.map(tank => (
        <TankItem 
          key={tank.id}
          tank={tank}
          onRename={(name) => renameTank(tank.id, name)}
        />
      ))}
    </div>
  );
}

// After:
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useMemo } from 'react';

function TankList({ tanks }) {
  const { 
    tankConfigurations,
    updateTankConfiguration,
    reorderTanks,
    isLoading 
  } = useConfiguration();

  const configuredTanks = useMemo(() => {
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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {configuredTanks.map(tank => (
        <TankItem 
          key={tank.id}
          tank={tank}
          onRename={(name) => updateTankConfiguration(tank.id, { customName: name })}
        />
      ))}
    </div>
  );
}
```

## Support

If you encounter issues during migration:
1. Check this guide for common solutions
2. Review the type definitions in `types/configuration.ts`
3. Look at the migration hook implementations for reference
4. Test data migration in a development environment first