'use client';

import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { COMPONENT_REGISTRY } from '../registry';
import { StyleProperties } from '@/types/schema';
import * as Icons from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const project = useEditorStore((s) => s.project);
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps);
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const toggleLock = useEditorStore((s) => s.toggleLock);
  const toggleHidden = useEditorStore((s) => s.toggleHidden);
  const renameNode = useEditorStore((s) => s.renameNode);

  const [activeTab, setActiveTab] = useState<'properties' | 'styles' | 'events'>('properties');
  const [styleBreakpoint, setStyleBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!selectedNodeId) {
    return (
      <div className="w-80 h-full bg-[#0D0E15] border-l border-[#1E2230] flex flex-col items-center justify-center p-6 text-center select-none text-slate-500">
        <Icons.Sliders className="w-8 h-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-medium text-slate-300">No Component Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Select any element on the canvas or layers tree to configure its properties and styles.
        </p>
      </div>
    );
  }

  const node = project.nodes[selectedNodeId];
  if (!node) return null;

  const def = COMPONENT_REGISTRY[node.type];
  const isRoot = !node.parentId;

  // Compute active styles depending on chosen breakpoint
  const currentStyles: StyleProperties =
    styleBreakpoint === 'desktop'
      ? node.styles
      : { ...node.styles, ...(node.responsive?.[styleBreakpoint] || {}) };

  const handleStyleChange = (key: keyof StyleProperties, val: any) => {
    updateNodeStyles(node.id, { [key]: val }, styleBreakpoint);
  };

  return (
    <div className="w-80 h-full bg-[#0D0E15] border-l border-[#1E2230] flex flex-col select-none shrink-0 text-xs">
      {/* Header with Name, Type, and Quick Toggles */}
      <div className="p-3 border-b border-[#1E2230] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={node.name}
            onChange={(e) => renameNode(node.id, e.target.value)}
            className="w-full bg-transparent font-semibold text-white truncate focus:bg-[#161922] px-1.5 py-0.5 rounded border border-transparent focus:border-indigo-500 outline-none"
          />
          <span className="text-[10px] text-indigo-400 font-mono px-1.5 uppercase tracking-wider">
            {node.type}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleLock(node.id)}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              node.isLocked ? 'text-amber-400' : 'text-slate-400'
            }`}
            title={node.isLocked ? 'Unlock Component' : 'Lock Component'}
          >
            {node.isLocked ? <Icons.Lock className="w-3.5 h-3.5" /> : <Icons.Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => toggleHidden(node.id)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Hide Component"
          >
            <Icons.Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => duplicateNode(node.id)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Duplicate"
          >
            <Icons.CopyPlus className="w-3.5 h-3.5" />
          </button>
          {!isRoot && (
            <button
              onClick={() => deleteNode(node.id)}
              className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Icons.Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Properties / Styles / Events */}
      <div className="flex border-b border-[#1E2230] bg-[#11131A]">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'properties'
              ? 'border-indigo-500 text-white bg-[#151924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('styles')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'styles'
              ? 'border-indigo-500 text-white bg-[#151924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Styles
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'events'
              ? 'border-indigo-500 text-white bg-[#151924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Events
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* PROPERTIES TAB */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {def?.propertySchema && def.propertySchema.length > 0 ? (
              def.propertySchema.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">{field.label}</label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={node.props[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => updateNodeProps(node.id, { [field.key]: e.target.value })}
                      className="w-full bg-[#161922] border border-[#23293D] rounded-md px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={node.props[field.key] || ''}
                      onChange={(e) => updateNodeProps(node.id, { [field.key]: e.target.value })}
                      className="w-full bg-[#161922] border border-[#23293D] rounded-md px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={node.props[field.key] || field.options?.[0]}
                      onChange={(e) => updateNodeProps(node.id, { [field.key]: e.target.value })}
                      className="w-full bg-[#161922] border border-[#23293D] rounded-md px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={node.props[field.key] || 0}
                      onChange={(e) => updateNodeProps(node.id, { [field.key]: Number(e.target.value) })}
                      className="w-full bg-[#161922] border border-[#23293D] rounded-md px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4">No custom properties for this element.</div>
            )}
          </div>
        )}

        {/* STYLES TAB */}
        {activeTab === 'styles' && (
          <div className="space-y-5">
            {/* Breakpoint selector for responsive overrides */}
            <div className="flex items-center justify-between bg-[#141620] p-1 rounded-lg border border-[#202536]">
              <button
                onClick={() => setStyleBreakpoint('desktop')}
                className={`flex-1 py-1 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                  styleBreakpoint === 'desktop'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icons.Monitor className="w-3 h-3" /> Desktop
              </button>
              <button
                onClick={() => setStyleBreakpoint('tablet')}
                className={`flex-1 py-1 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                  styleBreakpoint === 'tablet'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icons.Tablet className="w-3 h-3" /> Tablet
              </button>
              <button
                onClick={() => setStyleBreakpoint('mobile')}
                className={`flex-1 py-1 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                  styleBreakpoint === 'mobile'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icons.Smartphone className="w-3 h-3" /> Mobile
              </button>
            </div>

            {/* Layout Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layout</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Display</label>
                  <select
                    value={currentStyles.display || 'flex'}
                    onChange={(e) => handleStyleChange('display', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  >
                    <option value="flex">Flex</option>
                    <option value="grid">Grid</option>
                    <option value="block">Block</option>
                    <option value="inline-flex">Inline Flex</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Direction</label>
                  <select
                    value={currentStyles.flexDirection || 'column'}
                    onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  >
                    <option value="column">Column</option>
                    <option value="row">Row</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Align</label>
                  <select
                    value={currentStyles.alignItems || 'stretch'}
                    onChange={(e) => handleStyleChange('alignItems', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  >
                    <option value="stretch">Stretch</option>
                    <option value="center">Center</option>
                    <option value="flex-start">Start</option>
                    <option value="flex-end">End</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Justify</label>
                  <select
                    value={currentStyles.justifyContent || 'flex-start'}
                    onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  >
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="space-between">Space Between</option>
                    <option value="flex-end">End</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Spacing Box (Margin & Padding) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spacing</span>
              <div className="bg-[#141722] p-3 rounded-xl border border-[#202538] space-y-2">
                <div className="text-[10px] text-indigo-400 font-medium text-center">Padding</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Top (e.g. 16px)"
                    value={currentStyles.paddingTop || ''}
                    onChange={(e) => handleStyleChange('paddingTop', e.target.value)}
                    className="bg-[#10121A] border border-[#242A3E] rounded px-2 py-1 text-white placeholder:text-slate-600"
                  />
                  <input
                    type="text"
                    placeholder="Bottom (e.g. 16px)"
                    value={currentStyles.paddingBottom || ''}
                    onChange={(e) => handleStyleChange('paddingBottom', e.target.value)}
                    className="bg-[#10121A] border border-[#242A3E] rounded px-2 py-1 text-white placeholder:text-slate-600"
                  />
                  <input
                    type="text"
                    placeholder="Left (e.g. 16px)"
                    value={currentStyles.paddingLeft || ''}
                    onChange={(e) => handleStyleChange('paddingLeft', e.target.value)}
                    className="bg-[#10121A] border border-[#242A3E] rounded px-2 py-1 text-white placeholder:text-slate-600"
                  />
                  <input
                    type="text"
                    placeholder="Right (e.g. 16px)"
                    value={currentStyles.paddingRight || ''}
                    onChange={(e) => handleStyleChange('paddingRight', e.target.value)}
                    className="bg-[#10121A] border border-[#242A3E] rounded px-2 py-1 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Typography</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Font Size</label>
                  <input
                    type="text"
                    value={currentStyles.fontSize || ''}
                    placeholder="16px"
                    onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Font Weight</label>
                  <select
                    value={currentStyles.fontWeight || '400'}
                    onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extrabold (800)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentStyles.color?.startsWith('#') ? currentStyles.color : '#ffffff'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentStyles.color || ''}
                    placeholder="#FFFFFF"
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="flex-1 bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appearance</span>
              <div>
                <label className="text-[10px] text-slate-400">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      currentStyles.backgroundColor?.startsWith('#')
                        ? currentStyles.backgroundColor
                        : '#11131A'
                    }
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentStyles.backgroundColor || ''}
                    placeholder="transparent / #000000"
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="flex-1 bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Border Radius</label>
                  <input
                    type="text"
                    value={currentStyles.borderRadius || ''}
                    placeholder="12px"
                    onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Border Width</label>
                  <input
                    type="text"
                    value={currentStyles.borderWidth || ''}
                    placeholder="1px"
                    onChange={(e) => handleStyleChange('borderWidth', e.target.value)}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interactions</span>
            <div className="p-3 bg-[#141622] rounded-xl border border-[#202538] space-y-3">
              <div className="text-[11px] font-semibold text-white">On Click Action</div>
              <select
                value={node.events?.[0]?.actionType || 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'none') {
                    useEditorStore.getState().updateNodeProps(node.id, {});
                  } else {
                    const evt = {
                      id: `evt_${Date.now()}`,
                      trigger: 'click' as const,
                      actionType: val as any,
                      payload: val === 'toast' ? { message: 'Action executed!' } : { pageId: project.pages[0].id },
                    };
                    useEditorStore.setState((state) => ({
                      project: {
                        ...state.project,
                        nodes: {
                          ...state.project.nodes,
                          [node.id]: {
                            ...node,
                            events: [evt],
                          },
                        },
                      },
                    }));
                  }
                }}
                className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1.5 text-white"
              >
                <option value="none">None</option>
                <option value="toast">Show Notification Toast</option>
                <option value="navigate">Navigate to Page</option>
              </select>

              {node.events?.[0]?.actionType === 'toast' && (
                <div>
                  <label className="text-[10px] text-slate-400">Toast Message</label>
                  <input
                    type="text"
                    value={node.events[0].payload?.message || ''}
                    onChange={(e) => {
                      const updatedEvents = [...(node.events || [])];
                      updatedEvents[0].payload = { ...updatedEvents[0].payload, message: e.target.value };
                      useEditorStore.setState((state) => ({
                        project: {
                          ...state.project,
                          nodes: {
                            ...state.project.nodes,
                            [node.id]: { ...node, events: updatedEvents },
                          },
                        },
                      }));
                    }}
                    className="w-full bg-[#161922] border border-[#23293D] rounded px-2 py-1 text-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
