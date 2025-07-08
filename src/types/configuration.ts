// Unified configuration types for tanks and vessels

export interface TankConfiguration {
  id: string;
  customName?: string;
  position: number;
}

export interface VesselConfiguration {
  id: string;
  name: string;
  type: VesselType;
  layout: VesselLayout;
  tankGroups: TankGroup[];
  metadata: {
    created: string;
    lastModified: string;
    description?: string;
  };
}

export interface TankGroup {
  id: string;
  name: string;
  position: GroupPosition;
  groupType: GroupType;
  tanks: string[]; // Tank IDs
  displaySettings: {
    color: string;
    collapsed: boolean;
    sortOrder: number;
  };
}

export interface VesselLayout {
  type: LayoutType;
  sections: {
    port?: string[]; // Group IDs
    starboard?: string[]; // Group IDs
    center?: string[]; // Group IDs
    forward?: string[]; // Group IDs
    aft?: string[]; // Group IDs
  };
}

export interface VesselTemplate {
  id: string;
  name: string;
  vesselType: VesselType;
  layoutType: LayoutType;
  description: string;
  defaultGroups: Omit<TankGroup, 'id' | 'tanks'>[];
  previewImage?: string;
}

export type VesselType =
  | 'tanker'
  | 'bulk-carrier'
  | 'container-ship'
  | 'industrial-plant'
  | 'storage-terminal'
  | 'custom';

export type LayoutType =
  | 'port-starboard'
  | 'port-starboard-center'
  | 'center-only'
  | 'complex'
  | 'custom';

export type GroupPosition =
  | 'port'
  | 'starboard'
  | 'center'
  | 'forward'
  | 'aft';

export type GroupType =
  | 'ballast'
  | 'cargo'
  | 'fuel'
  | 'fresh-water'
  | 'slop'
  | 'process'
  | 'storage'
  | 'custom';

// Application configuration
export interface AppConfiguration {
  id: string;
  activeVesselId?: string;
  tanks: TankConfiguration[];
  lastUpdated: string;
  version: string;
}

// Storage interface for abstraction
export interface ConfigurationStorage {
  // Tank configuration
  getTankConfigurations(): TankConfiguration[];
  saveTankConfigurations(configs: TankConfiguration[]): void;

  // Vessel configuration
  getVessels(): VesselConfiguration[];
  getVessel(id: string): VesselConfiguration | null;
  saveVessel(vessel: VesselConfiguration): void;
  deleteVessel(id: string): void;

  // App configuration
  getActiveVesselId(): string | undefined;
  setActiveVesselId(id: string): void;

  // Import/Export
  exportConfiguration(): string;
  importConfiguration(data: string): boolean;

  // Migration
  migrateFromLegacy(): void;
}

// Configuration context data
export interface ConfigurationContextData {
  // Tank configuration
  tankConfigurations: TankConfiguration[];
  updateTankConfiguration: (tankId: string, config: Partial<TankConfiguration>) => void;
  reorderTanks: (oldIndex: number, newIndex: number) => void;
  resetTankConfiguration: () => void;

  // Vessel configuration
  vessels: VesselConfiguration[];
  currentVessel: VesselConfiguration | null;
  createVessel: (vessel: Omit<VesselConfiguration, 'id' | 'metadata'>) => string;
  updateVessel: (id: string, updates: Partial<VesselConfiguration>) => void;
  deleteVessel: (id: string) => void;
  setActiveVessel: (id: string) => void;

  // Tank groups
  addTankGroup: (vesselId: string, group: Omit<TankGroup, 'id'>) => void;
  updateTankGroup: (vesselId: string, groupId: string, updates: Partial<TankGroup>) => void;
  deleteTankGroup: (vesselId: string, groupId: string) => void;
  reorderTankGroups: (vesselId: string, groupIds: string[]) => void;

  // Tank assignment
  assignTankToGroup: (vesselId: string, tankId: string, groupId: string) => void;
  removeTankFromGroup: (vesselId: string, tankId: string) => void;
  reorderTanksInGroup: (vesselId: string, groupId: string, tankIds: string[]) => void;

  // Templates
  templates: VesselTemplate[];
  createVesselFromTemplate: (templateId: string, vesselName: string) => string;

  // Import/Export
  exportConfiguration: () => void;
  importConfiguration: (file: File) => Promise<boolean>;

  // Loading state
  isLoading: boolean;
}
