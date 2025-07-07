import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tank, ViewMode } from '../types/tank';
import { EditableTankCard } from './EditableTankCard';
import { EditableTankListItem } from './EditableTankListItem';
import { EditableTankCompactCard } from './EditableTankCompactCard';
import { EditableTankCylinder } from './EditableTankCylinder';

interface SortableTankItemProps {
  tank: Tank;
  viewMode: ViewMode;
  onRename: (tankId: number, newName: string) => void;
  showEnhancedData?: boolean;
}

export const SortableTankItem: React.FC<SortableTankItemProps> = ({
  tank,
  viewMode,
  onRename,
  showEnhancedData = false,
}) => {
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
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const renderTank = () => {
    switch (viewMode) {
      case 'list':
        return (
          <EditableTankListItem
            tank={tank}
            onRename={onRename}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'compact':
        return (
          <EditableTankCompactCard
            tank={tank}
            onRename={onRename}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'single-row':
        return (
          <div className="flex-shrink-0 w-80">
            <EditableTankCard
              tank={tank}
              onRename={onRename}
              dragHandleProps={{ ...attributes, ...listeners }}
            />
          </div>
        );
      case 'column':
        return (
          <EditableTankCylinder
            tank={tank}
            onRename={onRename}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'side-by-side':
        return (
          <EditableTankCylinder
            tank={tank}
            onRename={onRename}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      default:
        return (
          <EditableTankCard
            tank={tank}
            onRename={onRename}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
    >
      {renderTank()}
    </div>
  );
};
