import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Users, Droplets, Save, X } from 'lucide-react';
import { TankGroup, ProductType } from '../types/tankTable';
import { useTankTables } from '../hooks/useTankTables';

interface TankGroupManagerProps {
  onClose?: () => void;
  className?: string;
}

interface GroupFormData {
  id: string;
  name: string;
  displayName: string;
  density: number;
  color: string;
  description: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const TankGroupManager: React.FC<TankGroupManagerProps> = ({
  onClose,
  className = ''
}) => {
  const { tankGroups, productTypes, saveTankGroup, deleteTankGroup } = useTankTables();
  const [editingGroup, setEditingGroup] = useState<TankGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>({
    id: '',
    name: '',
    displayName: '',
    density: 850,
    color: DEFAULT_COLORS[0],
    description: ''
  });

  // Initialize form for creating new group
  const handleCreateNew = useCallback(() => {
    setFormData({
      id: `group-${Date.now()}`,
      name: '',
      displayName: '',
      density: 850,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      description: ''
    });
    setIsCreating(true);
    setEditingGroup(null);
  }, []);

  // Initialize form for editing existing group
  const handleEdit = useCallback((group: TankGroup) => {
    setFormData({
      id: group.id,
      name: group.name,
      displayName: group.displayName,
      density: group.density,
      color: group.color || DEFAULT_COLORS[0],
      description: group.description || ''
    });
    setEditingGroup(group);
    setIsCreating(false);
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((field: keyof GroupFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Save group (create or update)
  const handleSave = useCallback(() => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const group: TankGroup = {
      id: formData.id,
      name: formData.name.trim(),
      displayName: formData.displayName.trim(),
      density: formData.density,
      tanks: editingGroup?.tanks || [],
      color: formData.color,
      description: formData.description.trim()
    };

    saveTankGroup(group);
    handleCancel();
  }, [formData, editingGroup, saveTankGroup]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditingGroup(null);
    setIsCreating(false);
    setFormData({
      id: '',
      name: '',
      displayName: '',
      density: 850,
      color: DEFAULT_COLORS[0],
      description: ''
    });
  }, []);

  // Delete group
  const handleDelete = useCallback((group: TankGroup) => {
    if (confirm(`Are you sure you want to delete the group "${group.displayName}"? This will remove ${group.tanks.length} tank assignments.`)) {
      deleteTankGroup(group.id);
    }
  }, [deleteTankGroup]);

  // Apply product type density
  const handleApplyProductType = useCallback((productType: ProductType) => {
    setFormData(prev => ({
      ...prev,
      density: productType.density
    }));
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Tank Group Manager</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Create/Edit Form */}
        {(isCreating || editingGroup) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isCreating ? 'Create New Group' : 'Edit Group'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., port-tanks"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Port Side Tanks"
                />
              </div>

              {/* Density */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Density (kg/m³) *
                </label>
                <input
                  type="number"
                  value={formData.density}
                  onChange={(e) => handleInputChange('density', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                />
                
                {/* Quick Apply Product Types */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Quick apply from product types:</p>
                  <div className="flex flex-wrap gap-1">
                    {productTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleApplyProductType(type)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        {type.name} ({type.density})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex space-x-1">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => handleInputChange('color', color)}
                        className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description for this tank group"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Groups List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Existing Groups ({tankGroups.length})
          </h3>
          
          {tankGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tank groups configured</p>
              <p className="text-sm">Create your first group to organize tanks by product type</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tankGroups.map(group => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: group.color || DEFAULT_COLORS[0] }}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{group.displayName}</h4>
                        <p className="text-sm text-gray-600">{group.name}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(group)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">Density:</span>
                      <span className="font-medium">{group.density} kg/m³</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Tanks:</span>
                      <span className="font-medium">{group.tanks.length}</span>
                    </div>
                    {group.description && (
                      <p className="text-gray-600 text-xs mt-2">{group.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
