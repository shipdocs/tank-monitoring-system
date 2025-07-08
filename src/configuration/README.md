# Unified Configuration System

A consolidated configuration system for managing tanks and vessels in the TankMon application.

## Architecture

```
src/
├── types/
│   └── configuration.ts         # All configuration types
├── storage/
│   └── ConfigurationStorage.ts  # Storage abstraction
├── hooks/
│   ├── useUnifiedConfiguration.ts  # Main configuration hook
│   └── migrations/              # Backward compatibility hooks
├── contexts/
│   └── ConfigurationContext.tsx # React context provider
└── constants/
    └── vesselTemplates.ts       # Predefined vessel templates
```

## Core Components

### 1. Types (`types/configuration.ts`)
- `TankConfiguration`: Individual tank settings (name, position)
- `VesselConfiguration`: Vessel with tank groups and layout
- `TankGroup`: Grouping of tanks (port, starboard, etc.)
- `AppConfiguration`: Application-level settings
- `ConfigurationStorage`: Storage interface abstraction

### 2. Storage (`storage/ConfigurationStorage.ts`)
- Centralized localStorage management
- Automatic data migration from old formats
- Version tracking and upgrades
- Import/export functionality

### 3. Hook (`hooks/useUnifiedConfiguration.ts`)
- Single source of truth for all configuration
- Tank management (rename, reorder)
- Vessel management (create, update, delete)
- Tank group management
- Template support

### 4. Context (`contexts/ConfigurationContext.tsx`)
- Provides configuration globally
- Manages loading states
- Handles tank data integration

## Usage

### Basic Setup

```tsx
// 1. Wrap your app with the provider
import { ConfigurationProvider } from './contexts/ConfigurationContext';

function App() {
  const { tanks } = useTanks(); // Your tank data
  
  return (
    <ConfigurationProvider tanks={tanks}>
      <YourComponents />
    </ConfigurationProvider>
  );
}

// 2. Use configuration in components
import { useConfiguration } from './contexts/ConfigurationContext';

function TankManager() {
  const {
    tankConfigurations,
    updateTankConfiguration,
    reorderTanks
  } = useConfiguration();
  
  // Your component logic
}
```

### Common Operations

#### Rename a Tank
```tsx
const { updateTankConfiguration } = useConfiguration();

updateTankConfiguration(tankId, { 
  customName: 'New Tank Name' 
});
```

#### Create a Vessel
```tsx
const { createVessel } = useConfiguration();

const vesselId = createVessel({
  name: 'My Vessel',
  type: 'tanker',
  layout: {
    type: 'port-starboard-center',
    sections: {}
  },
  tankGroups: []
});
```

#### Assign Tank to Group
```tsx
const { assignTankToGroup } = useConfiguration();

assignTankToGroup(vesselId, tankId, groupId);
```

#### Export Configuration
```tsx
const { exportConfiguration } = useConfiguration();

// Downloads configuration as JSON
exportConfiguration();
```

## Data Flow

1. **Storage Layer**: Manages persistence in localStorage
2. **Hook Layer**: Provides business logic and state management
3. **Context Layer**: Distributes configuration throughout app
4. **Component Layer**: Consumes configuration for UI

## Migration from Old System

See [MIGRATION_GUIDE.md](../../MIGRATION_GUIDE.md) for detailed migration instructions.

### Quick Migration
1. Replace old hook imports with migration hooks
2. Wrap app with `ConfigurationProvider`
3. Gradually update components to use `useConfiguration`
4. Remove migration hooks once complete

## Storage Format

### localStorage Keys
- `tankmon-vessels-v3`: Array of vessel configurations
- `tankmon-app-config-v3`: App settings and tank configurations

### Data Structure
```json
{
  "vessels": [{
    "id": "vessel-123",
    "name": "My Tanker",
    "type": "tanker",
    "layout": { ... },
    "tankGroups": [ ... ],
    "metadata": { ... }
  }],
  "appConfig": {
    "id": "default",
    "activeVesselId": "vessel-123",
    "tanks": [{
      "id": 1,
      "customName": "Tank 1A",
      "position": 0
    }],
    "lastUpdated": "2024-01-01T00:00:00Z",
    "version": "3.0.0"
  }
}
```

## Best Practices

1. **Always use the context**: Don't access storage directly
2. **Handle loading states**: Check `isLoading` before rendering
3. **Use memoization**: For derived data like configured tanks
4. **Batch updates**: Update multiple configurations together
5. **Validate imports**: Check data structure before importing

## Extending the System

To add new configuration types:

1. Add types to `types/configuration.ts`
2. Update storage methods in `ConfigurationStorage.ts`
3. Add hook methods in `useUnifiedConfiguration.ts`
4. Update the context interface
5. Add migration logic if needed

## Testing

```tsx
// Mock the storage for tests
jest.mock('./storage/ConfigurationStorage', () => ({
  UnifiedConfigurationStorage: {
    getInstance: () => ({
      getTankConfigurations: jest.fn(() => []),
      saveTankConfigurations: jest.fn(),
      // ... other methods
    })
  }
}));
```

## Performance Considerations

- Configuration is loaded once on mount
- Updates are debounced to localStorage
- Use `useMemo` for expensive computations
- Avoid unnecessary re-renders with proper deps

## Troubleshooting

### Data not persisting
- Check browser localStorage limits
- Verify storage keys in DevTools
- Check for errors in console

### Migration issues
- Clear new storage keys and reload
- Check for old data in localStorage
- Review migration logs in console

### TypeScript errors
- Import types from `types/configuration.ts`
- Ensure `ConfigurationProvider` is used
- Update component prop types