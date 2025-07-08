import React from 'react';
import { type Tank, type TankGroup, type ViewMode } from '../types/tank';
import { TankCard } from './TankCard';
import { TankListItem } from './TankListItem';
import { TankCompactCard } from './TankCompactCard';
import { TankCylinder } from './TankCylinder';
import { groupTanks } from '../utils/tankGrouping';

interface TankGridProps {
  tanks: Tank[];
  viewMode: ViewMode;
}

export const TankGrid: React.FC<TankGridProps> = ({ tanks, viewMode }) => {
  const tankGroups = groupTanks(tanks);

  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
      case 'list':
        return 'space-y-4';
      case 'compact':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4';
      case 'single-row':
        return 'flex space-x-4 overflow-x-auto pb-4';
      case 'column':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
    }
  };

  const getGroupContainerClasses = () => {
    switch (viewMode) {
      case 'single-row':
        return 'flex flex-col space-y-6';
      default:
        return 'space-y-8';
    }
  };

  const renderTank = (tank: Tank) => {
    switch (viewMode) {
      case 'list':
        return <TankListItem key={tank.id} tank={tank} />;
      case 'compact':
        return <TankCompactCard key={tank.id} tank={tank} />;
      case 'single-row':
        return (
          <div key={tank.id} className="flex-shrink-0 w-80">
            <TankCard tank={tank} />
          </div>
        );
      case 'column':
        return <TankCylinder key={tank.id} tank={tank} />;
      default:
        return <TankCard key={tank.id} tank={tank} />;
    }
  };

  const renderGroup = (group: TankGroup) => (
    <section key={group.id} className="space-y-4" role="region" aria-labelledby={`group-${group.id}-heading`}>
      {/* Group Header */}
      <div className="flex items-center space-x-3">
        <h3 id={`group-${group.id}-heading`} className="text-lg font-semibold text-gray-800">{group.displayName}</h3>
        <div className="flex-1 h-px bg-gray-300" aria-hidden="true"></div>
        <span className="text-sm text-gray-500" aria-label={`${group.tanks.length} tanks in this group`}>{group.tanks.length} tanks</span>
      </div>

      {/* Group Tanks */}
      <div className={getGridClasses()} role="group" aria-labelledby={`group-${group.id}-heading`}>
        {group.tanks.map(renderTank)}
      </div>
    </section>
  );

  // If only one group or no grouping needed, render without group headers
  if (tankGroups.length <= 1) {
    return (
      <div className={getGridClasses()} role="grid" aria-label="Tank monitoring grid">
        {tanks.map(renderTank)}
      </div>
    );
  }

  return (
    <div className={getGroupContainerClasses()} role="region" aria-label="Tank groups">
      {tankGroups.map(renderGroup)}
    </div>
  );
};
