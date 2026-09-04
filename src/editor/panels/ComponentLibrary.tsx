'use client';

import React, { useState } from 'react';
import { COMPONENT_REGISTRY, ComponentDefinition } from '../registry';
import { useEditorStore } from '../store/useEditorStore';
import * as Icons from 'lucide-react';

const CATEGORIES = [
  'Layout',
  'Typography',
  'Buttons',
  'Forms',
  'Media',
  'Navigation',
  'Data',
  'Feedback',
  'Advanced',
] as const;

export const ComponentLibrary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const setDraggedComponentType = useEditorStore((s) => s.setDraggedComponentType);
  const addNode = useEditorStore((s) => s.addNode);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const allComponents = Object.values(COMPONENT_REGISTRY);

  const filteredComponents = allComponents.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const renderIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Box;
    return <Icon className="w-4 h-4" />;
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/component-type', type);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedComponentType(type);
  };

  const handleDragEnd = () => {
    setDraggedComponentType(null);
  };

  return (
    <div className="w-72 h-full bg-[#0D0E15] border-r border-[#1E2230] flex flex-col select-none shrink-0">
      {/* Search Header */}
      <div className="p-3 border-b border-[#1E2230]">
        <div className="relative">
          <Icons.Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161922] border border-[#23293D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Component Categories List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {CATEGORIES.map((category) => {
          const comps = filteredComponents.filter((c) => c.category === category);
          if (comps.length === 0) return null;
          const isCollapsed = collapsedCategories[category];

          return (
            <div key={category} className="space-y-1.5">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full text-[11px] font-semibold tracking-wider text-slate-400 uppercase hover:text-white px-1 py-1"
              >
                <span>{category}</span>
                <Icons.ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90 text-slate-600' : 'text-slate-400'
                  }`}
                />
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1.5">
                  {comps.map((comp) => (
                    <div
                      key={comp.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, comp.type)}
                      onDragEnd={handleDragEnd}
                      onClick={() => addNode(comp.type, selectedNodeId)}
                      className="group flex flex-col items-center justify-center p-2.5 bg-[#141620] hover:bg-[#1C2030] active:scale-[0.98] border border-[#202536] hover:border-indigo-500/60 rounded-xl cursor-grab active:cursor-grabbing transition-all text-center shadow-sm"
                      title="Drag onto canvas or click to add"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#1B1F2D] group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-slate-300 flex items-center justify-center mb-1.5 transition-colors">
                        {renderIcon(comp.icon)}
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate max-w-full">
                        {comp.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
