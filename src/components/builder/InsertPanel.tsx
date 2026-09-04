'use client';

import React, { useState } from 'react';
import { COMPONENT_REGISTRY, createDefaultNode } from '@/builder/components/registry';
import { useBuilderStore } from '@/builder/state/builder-store';
import { ComponentType } from '@/builder/schema/component';
import {
  Box,
  Columns,
  Rows,
  Layers,
  Type,
  Heading,
  AlignLeft,
  MousePointerClick,
  ExternalLink,
  Image as ImageIcon,
  Star,
  Minus,
  Maximize2,
  FormInput,
  FileText,
  Search,
  X,
  Plus,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Box,
  Columns,
  Rows,
  Layers,
  Type,
  Heading,
  AlignLeft,
  MousePointerClick,
  ExternalLink,
  Image: ImageIcon,
  Star,
  Minus,
  Maximize2,
  FormInput,
  FileText,
};

export const InsertPanel: React.FC = () => {
  const [search, setSearch] = useState('');
  const addNode = useBuilderStore((s) => s.addNode);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('application/builder-component-type', type);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleQuickAdd = (type: ComponentType) => {
    const parentId = selectedNodeId || activePage.root.id;
    const newNode = createDefaultNode(type, `${type}_${Date.now()}`);
    addNode(parentId, newNode);
  };

  const categories: Array<'Layout' | 'Basic' | 'Form'> = ['Layout', 'Basic', 'Form'];
  const allComponents = Object.values(COMPONENT_REGISTRY);

  const filteredComponents = allComponents.filter((comp) =>
    comp.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside
      data-testid="insert-panel"
      className="w-64 bg-[#0D0F17] border-r border-[#1E2330] flex flex-col select-none shrink-0 z-20 h-full"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#1E2330]">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Insert
        </span>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#151824] border border-[#23293D] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Component Palette List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map((category) => {
          const comps = filteredComponents.filter((c) => c.category === category);
          if (comps.length === 0) return null;

          return (
            <div key={category} className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-1">
                {category}
              </span>
              <div className="space-y-1">
                {comps.map((comp) => {
                  const Icon = ICON_MAP[comp.icon] || Box;
                  return (
                    <div
                      key={comp.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, comp.type)}
                      onClick={() => handleQuickAdd(comp.type)}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#141722] hover:bg-[#1C2132] border border-[#1E2335] hover:border-indigo-500/50 cursor-grab active:cursor-grabbing transition-all text-xs shadow-sm"
                      title="Drag to canvas or click to add"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-[#181B28] group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium text-slate-300 group-hover:text-white">
                          {comp.label}
                        </span>
                      </div>
                      <Plus className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
