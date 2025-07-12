import { Tank, TankGroup } from '../types/tank';
import { sortTanksNaturally } from './tankSorting';

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
      tanks: []
    },
    {
      id: 'SB',
      name: 'SB',
      displayName: 'SB (Starboard)',
      tanks: []
    },
    {
      id: 'CENTER',
      name: 'CENTER',
      displayName: 'Center Tanks',
      tanks: []
    }
  ];

  tanks.forEach(tank => {
    // Use tank.group if explicitly set, otherwise determine by tank name
    let groupId = tank.group;

    if (!groupId) {
      // Determine group by tank name prefix
      const upperName = tank.name.toUpperCase();
      if (upperName.startsWith('BB')) {
        groupId = 'BB';
      } else if (upperName.startsWith('SB')) {
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

  // Sort tanks within each group using natural sorting
  groups.forEach(group => {
    group.tanks = sortTanksNaturally(group.tanks);
  });

  // Return only groups that have tanks
  const filteredGroups = groups.filter(group => group.tanks.length > 0);
  console.log('🏷️ Final groups:', filteredGroups.map(g => ({ id: g.id, name: g.displayName, tankCount: g.tanks.length })));
  return filteredGroups;
}

/**
 * Assigns group to tanks based on tank name if not already set
 */
export function assignDefaultGroups(tanks: Tank[]): Tank[] {
  return tanks.map(tank => {
    if (tank.group) {
      return tank;
    }

    // Determine group by tank name prefix
    const upperName = tank.name.toUpperCase();
    let group: 'BB' | 'SB' | 'CENTER';

    if (upperName.startsWith('BB')) {
      group = 'BB';
    } else if (upperName.startsWith('SB')) {
      group = 'SB';
    } else {
      group = 'CENTER';
    }

    return { ...tank, group };
  });
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
