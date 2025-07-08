import { type Tank, type TankGroup } from '../types/tank';

/**
 * Groups tanks based on their ID or configured group
 * Default grouping: Tanks 1-6 = BB (Port), Tanks 7-12 = SB (Starboard)
 */
export function groupTanks(tanks: Tank[]): TankGroup[] {
  console.log('🔍 Grouping tanks:', tanks.map(t => ({ id: t.id, name: t.name, group: t.group })));

  const groups: TankGroup[] = [
    {
      id: 'BB',
      name: 'BB',
      displayName: 'BB (Port)',
      tanks: [],
    },
    {
      id: 'SB',
      name: 'SB',
      displayName: 'SB (Starboard)',
      tanks: [],
    },
    {
      id: 'CENTER',
      name: 'CENTER',
      displayName: 'Center Tanks',
      tanks: [],
    },
  ];

  tanks.forEach(tank => {
    // Use tank.group if explicitly set, otherwise determine by ID
    let groupId = tank.group;

    if (!groupId) {
      // Default grouping logic based on tank ID
      if (tank.id >= 1 && tank.id <= 6) {
        groupId = 'BB';
      } else if (tank.id >= 7 && tank.id <= 12) {
        groupId = 'SB';
      } else {
        groupId = 'CENTER';
      }
    }

    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.tanks.push(tank);
    }
  });

  // Sort tanks within each group by ID
  groups.forEach(group => {
    group.tanks.sort((a, b) => a.id - b.id);
  });

  // Return only groups that have tanks
  const filteredGroups = groups.filter(group => group.tanks.length > 0);
  console.log('🏷️ Final groups:', filteredGroups.map(g => ({ id: g.id, name: g.displayName, tankCount: g.tanks.length })));
  return filteredGroups;
}

/**
 * Assigns group to tanks based on default logic if not already set
 */
export function assignDefaultGroups(tanks: Tank[]): Tank[] {
  return tanks.map(tank => ({
    ...tank,
    group: tank.group || (tank.id >= 1 && tank.id <= 6 ? 'BB' :
      tank.id >= 7 && tank.id <= 12 ? 'SB' : 'CENTER'),
  }));
}

/**
 * Gets the display name for a tank group
 */
export function getGroupDisplayName(groupId: string): string {
  switch (groupId) {
    case 'BB': return 'BB (Port)';
    case 'SB': return 'SB (Starboard)';
    case 'CENTER': return 'Center Tanks';
    default: return groupId;
  }
}
