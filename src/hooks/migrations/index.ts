/**
 * Migration hooks that provide backward compatibility while transitioning to the unified configuration system
 *
 * These hooks maintain the same API as the old hooks but internally use the new unified configuration system.
 * They should be used temporarily while migrating components.
 *
 * Migration steps:
 * 1. Replace imports of old hooks with these migration hooks
 * 2. Wrap your app with ConfigurationProvider
 * 3. Gradually update components to use useConfiguration directly
 * 4. Remove these migration hooks once all components are updated
 */

export { useTankConfiguration } from './useTankConfigurationMigration';
export { useDatabaseTankConfiguration } from './useDatabaseTankConfigurationMigration';
export { useVesselConfiguration } from './useVesselConfigurationMigration';
export { useDatabaseVesselConfiguration } from './useDatabaseVesselConfigurationMigration';
