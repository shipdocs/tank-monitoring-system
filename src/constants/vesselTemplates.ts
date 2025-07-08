import { type VesselTemplate } from '../types/configuration';

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
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 1 },
      },
      {
        name: 'Port Cargo',
        position: 'port',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 2 },
      },
      {
        name: 'Center Cargo',
        position: 'center',
        groupType: 'cargo',
        displaySettings: { color: '#bbdefb', collapsed: false, sortOrder: 3 },
      },
      {
        name: 'Starboard Cargo',
        position: 'starboard',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 4 },
      },
      {
        name: 'Starboard Ballast',
        position: 'starboard',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 5 },
      },
    ],
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
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 1 },
      },
      {
        name: 'Starboard Tanks',
        position: 'starboard',
        groupType: 'cargo',
        displaySettings: { color: '#c8e6c9', collapsed: false, sortOrder: 2 },
      },
    ],
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
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 1 },
      },
      {
        name: 'Starboard Ballast',
        position: 'starboard',
        groupType: 'ballast',
        displaySettings: { color: '#ffcdd2', collapsed: false, sortOrder: 2 },
      },
    ],
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
        displaySettings: { color: '#bbdefb', collapsed: false, sortOrder: 1 },
      },
    ],
  },
];
