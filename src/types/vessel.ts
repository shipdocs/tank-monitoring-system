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

// Data source types for wizard
export type DataSourceType =
  | 'serial-port'
  | 'csv-file'
  | 'txt-file'
  | 'json-file';

export interface DataSourceConfig {
  type: DataSourceType;
  filePath?: string;
  importInterval?: number;
  hasHeaders?: boolean;
  delimiter?: string;
  columnMapping?: Record<string, string>;
  previewData?: string[][];
  // Vertical format options
  isVerticalFormat?: boolean;
  linesPerRecord?: number;
  lineMapping?: Record<number, string>; // line position -> field name
  // Data quality options
  autoDetectDataEnd?: boolean;
  skipOutliers?: boolean;
  maxRecords?: number;
  temperatureRange?: { min: number; max: number };
  dataQuality?: {
    totalRecords: number;
    validRecords: number;
    suggestedCutoff?: number;
    outliers: number[];
  };
}

// Wizard state management
export interface WizardState {
  step: number;
  vesselType?: VesselType;
  dataSource?: DataSourceConfig;
  layoutType?: LayoutType;
  vesselName?: string;
  selectedTemplate?: VesselTemplate;
  customGroups?: TankGroup[];
  tankAssignments?: Record<string, string>; // tankId -> groupId
}

// Predefined templates
export const VESSEL_TEMPLATES: VesselTemplate[] = [
  {
    id: 'tanker-standard',
    name: 'Standard Tanker',
    vesselType: 'tanker',
    layoutType: 'port-starboard-center',
    description: 'Port/Starboard ballast + Center cargo tanks',
    defaultGroups: [
      {
        name: 'Port Ballast',
        position: 'port',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 1 }
      },
      {
        name: 'Port Cargo',
        position: 'port',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 2 }
      },
      {
        name: 'Center Cargo',
        position: 'center',
        groupType: 'cargo',
        displaySettings: { color: '#bbdefb', collapsed: false, sortOrder: 3 }
      },
      {
        name: 'Starboard Cargo',
        position: 'starboard',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 4 }
      },
      {
        name: 'Starboard Ballast',
        position: 'starboard',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 5 }
      }
    ]
  },
  {
    id: 'tanker-simple',
    name: 'Simple Tanker',
    vesselType: 'tanker',
    layoutType: 'port-starboard',
    description: 'Port/Starboard tanks only',
    defaultGroups: [
      {
        name: 'Port Tanks',
        position: 'port',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 1 }
      },
      {
        name: 'Starboard Tanks',
        position: 'starboard',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 2 }
      }
    ]
  },
  {
    id: 'bulk-carrier',
    name: 'Bulk Carrier',
    vesselType: 'bulk-carrier',
    layoutType: 'port-starboard',
    description: 'Port/Starboard ballast tanks',
    defaultGroups: [
      {
        name: 'Port Ballast',
        position: 'port',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 1 }
      },
      {
        name: 'Starboard Ballast',
        position: 'starboard',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 2 }
      }
    ]
  },
  {
    id: 'center-only',
    name: 'Center Line Only',
    vesselType: 'storage-terminal',
    layoutType: 'center-only',
    description: 'Center line tanks only',
    defaultGroups: [
      {
        name: 'Center Tanks',
        position: 'center',
        groupType: 'storage',
        displaySettings: { color: '#bbdefb', collapsed: false, sortOrder: 1 }
      }
    ]
  }
];
