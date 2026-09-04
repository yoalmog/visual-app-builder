'use client';

import React from 'react';
import { ComponentNode, ComponentStateMode, ComponentStyles } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Sparkles, Layers } from 'lucide-react';

interface ComponentStatesSectionProps {
  node: ComponentNode;
}

const STATE_MODES: { mode: ComponentStateMode; label: string }[] = [
  { mode: 'default', label: 'Default' },
  { mode: 'hover', label: 'Hover' },
  { mode: 'focus', label: 'Focus' },
  { mode: 'active', label: 'Active' },
  { mode: 'disabled', label: 'Disabled' },
];

export const ComponentStatesSection: React.FC<ComponentStatesSectionProps> = ({ node }) => {
  const activeComponentState = useBuilderStore((s) => s.activeComponentState);
  const setActiveComponentState = useBuilderStore((s) => s.setActiveComponentState);
  const updateNodeStateStyles = useBuilderStore((s) => s.updateNodeStateStyles);
  const updateNodeStyles = useBuilderStore((s) => s.updateNodeStyles);

  const states = node.states || {};
  const currentStateStyles =
    activeComponentState === 'default'
      ? node.styles
      : states[activeComponentState] || {};

  const handleStyleChange = (prop: keyof ComponentStyles, val: any) => {
    if (activeComponentState === 'default') {
      updateNodeStyles(node.id, { [prop]: val });
    } else {
      updateNodeStateStyles(node.id, activeComponentState, { [prop]: val });
    }
  };

  return (
    <div data-testid="component-states-section" className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Interactive States</span>
        </div>
      </div>

      {/* State Switcher Pills */}
      <div className="grid grid-cols-5 gap-1 bg-[#0A0C13] p-1 rounded-lg border border-[#1E2436]">
        {STATE_MODES.map(({ mode, label }) => {
          const hasCustomStyles =
            mode !== 'default' &&
            states[mode] &&
            Object.keys(states[mode] || {}).length > 0;

          return (
            <button
              key={mode}
              data-testid={`state-tab-${mode}`}
              onClick={() => setActiveComponentState(mode)}
              className={`py-1 rounded text-[10px] font-medium transition-all relative ${
                activeComponentState === mode
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
              }`}
            >
              <span>{label}</span>
              {hasCustomStyles && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* State Notice */}
      <div className="p-2 rounded bg-[#111420] border border-[#1C2132] text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          Editing <strong className="text-white capitalize">{activeComponentState}</strong> styles
        </span>
        {activeComponentState !== 'default' && (
          <span className="text-[10px] text-indigo-400 font-medium">State Isolated</span>
        )}
      </div>

      {/* Quick State Styles Controls */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentStateStyles.backgroundColor || '#ffffff'}
              onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
              className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={currentStateStyles.backgroundColor || ''}
              onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
              placeholder="#ffffff or transparent"
              className="flex-1 bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white font-mono outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentStateStyles.color || '#000000'}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={currentStateStyles.color || ''}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              placeholder="#000000"
              className="flex-1 bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white font-mono outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Border Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentStateStyles.borderColor || '#e2e8f0'}
              onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={currentStateStyles.borderColor || ''}
              onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              placeholder="#e2e8f0"
              className="flex-1 bg-[#0A0C13] border border-[#232A3E] rounded px-2 py-1 text-xs text-white font-mono outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Opacity</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentStateStyles.opacity ?? 1}
              onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-xs font-mono text-slate-300 w-10 text-right">
              {Math.round((currentStateStyles.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
