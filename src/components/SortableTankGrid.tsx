import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Tank, ViewMode, TankGroup } from '../types/tank';
import { SortableTankItem } from './SortableTankItem';
import { groupTanks } from '../utils/tankGrouping';

interface SortableTankGridProps {
  tanks: Tank[];
  viewMode: ViewMode;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onRename: (tankId: number, newName: string) => void;
  showEnhancedData?: boolean;
}

export const SortableTankGrid: React.FC<SortableTankGridProps> = ({
  tanks,
  viewMode,
  onReorder,
  onRename,
  showEnhancedData = false,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const tankGroups = groupTanks(tanks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8';
      case 'list':
        return 'space-y-6';
      case 'compact':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6';
      case 'single-row':
        return 'flex space-x-6 overflow-x-auto pb-4';
      case 'column':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6';
      case 'side-by-side':
        return 'grid grid-cols-2 md:grid-cols-3 gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8';
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id });
    console.log('Current tank order:', tanks.map((t, i) => `${i}: ${t.name} (id: ${t.id})`));
    setActiveId(null);

    if (active.id !== over?.id && over) {
      const oldIndex = tanks.findIndex((tank) => tank.id.toString() === active.id);
      const newIndex = tanks.findIndex((tank) => tank.id.toString() === over.id);

      console.log('Reordering:', {
        oldIndex,
        newIndex,
        draggedTank: tanks[oldIndex]?.name,
        targetTank: tanks[newIndex]?.name,
        expectedResult: `Moving ${tanks[oldIndex]?.name} to position ${newIndex}`
      });

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const activeTank = activeId ? tanks.find(tank => tank.id.toString() === activeId) : null;

  const getSortingStrategy = () => {
    switch (viewMode) {
      case 'single-row':
        return horizontalListSortingStrategy;
      case 'list':
        return verticalListSortingStrategy;
      default:
        return rectSortingStrategy;
    }
  };

  const getGroupContainerClasses = () => {
    switch (viewMode) {
      case 'single-row':
        return 'flex flex-col space-y-8';
      case 'side-by-side':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-10';
      default:
        return 'space-y-10';
    }
  };

  const renderGroup = (group: TankGroup) => {
    const isCompactSideBySide = viewMode === 'side-by-side';

    // Get group color based on name
    const getGroupColor = (groupName: string) => {
      if (groupName.includes('BB') || groupName.includes('Port')) {
        return 'from-red-500 to-red-600';
      } else if (groupName.includes('SB') || groupName.includes('Starboard')) {
        return 'from-green-500 to-green-600';
      }
      return 'from-blue-500 to-blue-600';
    };

    return (
      <div key={group.id} className={`${isCompactSideBySide ? "space-y-4" : "space-y-6"} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
        {/* Enhanced Group Header */}
        <div className={`bg-gradient-to-r ${getGroupColor(group.displayName)} text-white p-4 rounded-lg shadow-md`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
              <h3 className={`font-bold ${isCompactSideBySide ? 'text-lg' : 'text-xl'}`}>
                {group.displayName}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
                {group.tanks.length} tank{group.tanks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Group Tanks */}
        <SortableContext
          items={group.tanks.map(tank => tank.id.toString())}
          strategy={getSortingStrategy()}
        >
          <div className={getGridClasses()}>
            {group.tanks.map((tank) => (
              <SortableTankItem
                key={tank.id}
                tank={tank}
                viewMode={viewMode}
                onRename={onRename}
                showEnhancedData={showEnhancedData}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    );
  };

  // If only one group or no grouping needed, render without group headers
  if (tankGroups.length <= 1) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tanks.map(tank => tank.id.toString())}
          strategy={getSortingStrategy()}
        >
          <div className={getGridClasses()}>
            {tanks.map((tank) => (
              <SortableTankItem
                key={tank.id}
                tank={tank}
                viewMode={viewMode}
                onRename={onRename}
                showEnhancedData={showEnhancedData}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeTank ? (
            <div className="opacity-50">
              <SortableTankItem
                tank={activeTank}
                viewMode={viewMode}
                onRename={onRename}
                showEnhancedData={showEnhancedData}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={getGroupContainerClasses()}>
        {tankGroups.map(renderGroup)}
      </div>
      <DragOverlay>
        {activeTank ? (
          <div className="opacity-50">
            <SortableTankItem
              tank={activeTank}
              viewMode={viewMode}
              onRename={onRename}
              showEnhancedData={showEnhancedData}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
