import React, { useState, useEffect } from 'react';
import { VesselTemplate } from '../../types/vessel';
import { Tank } from '../../types/tank';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Users, Ship } from 'lucide-react';

interface TankAssignmentStepProps {
  tanks: Tank[];
  template: VesselTemplate;
  vesselName: string;
  onVesselNameChange: (name: string) => void;
  onTankAssignment: (assignments: Record<string, string>) => void;
}

interface SortableTankItemProps {
  tank: Tank;
  isAssigned: boolean;
}

const SortableTankItem: React.FC<SortableTankItemProps> = ({ tank, isAssigned }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tank.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm ${
        isAssigned ? 'border-green-200 bg-green-50' : 'border-gray-200'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-gray-900">{tank.name}</div>
        <div className="text-sm text-gray-500">
          {tank.level?.toFixed(1)}L / {tank.capacity?.toFixed(0)}L
        </div>
      </div>
      
      <div className={`w-3 h-3 rounded-full ${
        isAssigned ? 'bg-green-500' : 'bg-gray-300'
      }`} />
    </div>
  );
};

interface DroppableGroupProps {
  group: any;
  assignedTanks: Tank[];
  onDrop: (tankId: string, groupId: string) => void;
}

const DroppableGroup: React.FC<DroppableGroupProps> = ({ group, assignedTanks, onDrop }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: group.name,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 border-2 border-dashed rounded-lg p-4 min-h-[120px] transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <div className="flex items-center space-x-2 mb-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: group.displaySettings.color }}
        />
        <h3 className="font-medium text-gray-900">{group.name}</h3>
        <span className="text-sm text-gray-500">({assignedTanks.length} tanks)</span>
      </div>

      <div className="space-y-2">
        {assignedTanks.map(tank => (
          <div key={tank.id} className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-sm font-medium">{tank.name}</span>
            <button
              onClick={() => onDrop(tank.id.toString(), '')}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ))}

        {assignedTanks.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            Drag tanks here to assign them to this group
          </div>
        )}
      </div>
    </div>
  );
};

export const TankAssignmentStep: React.FC<TankAssignmentStepProps> = ({
  tanks,
  template,
  vesselName,
  onVesselNameChange,
  onTankAssignment
}) => {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    onTankAssignment(assignments);
  }, [assignments, onTankAssignment]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const tankId = active.id as string;
    const groupId = over.id as string;

    // If dropped on a group, assign tank to that group
    if (template.defaultGroups.some(g => g.name === groupId)) {
      setAssignments(prev => ({
        ...prev,
        [tankId]: groupId
      }));
    }
  };

  const handleRemoveFromGroup = (tankId: string) => {
    setAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[tankId];
      return newAssignments;
    });
  };

  const getAssignedTanks = (groupName: string): Tank[] => {
    return tanks.filter(tank => assignments[tank.id.toString()] === groupName);
  };

  const getUnassignedTanks = (): Tank[] => {
    return tanks.filter(tank => !assignments[tank.id.toString()]);
  };

  const activeTank = activeId ? tanks.find(t => t.id.toString() === activeId) : null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configure Your Vessel
          </h2>
          <p className="text-gray-600">
            Name your vessel and assign tanks to groups
          </p>
        </div>

        {/* Vessel Name Input */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Ship className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Vessel Information</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Vessel Name *
            </label>
            <input
              type="text"
              value={vesselName}
              onChange={(e) => onVesselNameChange(e.target.value)}
              placeholder="Enter vessel name (e.g., MV Example, Plant A, Terminal 1)"
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Tanks */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Available Tanks ({getUnassignedTanks().length})
              </h3>
            </div>
            
            <SortableContext 
              items={getUnassignedTanks().map(t => t.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getUnassignedTanks().map(tank => (
                  <SortableTankItem
                    key={tank.id}
                    tank={tank}
                    isAssigned={false}
                  />
                ))}
                
                {getUnassignedTanks().length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    All tanks have been assigned to groups
                  </div>
                )}
              </div>
            </SortableContext>
          </div>

          {/* Tank Groups */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tank Groups ({template.defaultGroups.length})
            </h3>
            
            <div className="space-y-4">
              {template.defaultGroups.map((group, index) => (
                <div key={index}>
                  <DroppableGroup
                    group={group}
                    assignedTanks={getAssignedTanks(group.name)}
                    onDrop={handleRemoveFromGroup}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assignment Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Assignment Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Tanks:</span>
              <span className="ml-2 font-medium">{tanks.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Assigned:</span>
              <span className="ml-2 font-medium text-green-600">
                {Object.keys(assignments).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Unassigned:</span>
              <span className="ml-2 font-medium text-orange-600">
                {getUnassignedTanks().length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Groups:</span>
              <span className="ml-2 font-medium">{template.defaultGroups.length}</span>
            </div>
          </div>
        </div>

        {vesselName.trim() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Ready to proceed
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Vessel "{vesselName}" configured with {Object.keys(assignments).length} assigned tanks.
              You can continue to review your configuration.
            </p>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeTank ? (
          <div className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg opacity-90">
            <div className="font-medium text-gray-900">{activeTank.name}</div>
            <div className="text-sm text-gray-500">
              {activeTank.level?.toFixed(1)}L / {activeTank.capacity?.toFixed(0)}L
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
