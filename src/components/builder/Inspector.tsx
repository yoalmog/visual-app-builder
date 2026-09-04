'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { findNode } from '@/builder/tree/find-node';
import { ComponentNode, ComponentStyles } from '@/builder/schema/component';
import { INSPECTOR_DEFINITIONS, InspectorSectionName, PropertyFieldDef } from '@/builder/components/definitions';
import { PropertyControl } from './PropertyControl';
import { SpacingControl } from './inspector/SpacingControl';
import { RadiusControl } from './inspector/RadiusControl';
import { ShadowControl } from './inspector/ShadowControl';
import { ComponentStatesSection } from './inspector/ComponentStatesSection';
import { InteractionsSection } from './inspector/InteractionsSection';
import { LogicInspectorSection } from './inspector/LogicInspectorSection';
import {
  isPropertyOverridden,
  resolveNodeStylesForViewport,
} from '@/builder/responsive/style-resolver';
import {
  Sliders,
  CopyPlus,
  Trash2,
  Box,
  ChevronDown,
  ChevronRight,
  Layers,
  RotateCcw,
} from 'lucide-react';

export const Inspector: React.FC = () => {
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const viewport = useBuilderStore((s) => s.viewport);
  const activeInspectorTab = useBuilderStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useBuilderStore((s) => s.setActiveInspectorTab);
  const updateNodeProps = useBuilderStore((s) => s.updateNodeProps);
  const updateNodeStyles = useBuilderStore((s) => s.updateNodeStyles);
  const updateNodeResponsiveStyles = useBuilderStore((s) => s.updateNodeResponsiveStyles);
  const resetResponsiveStyle = useBuilderStore((s) => s.resetResponsiveStyle);
  const resetAllResponsiveOverrides = useBuilderStore((s) => s.resetAllResponsiveOverrides);
  const applyTokenToNode = useBuilderStore((s) => s.applyTokenToNode);
  const removeTokenFromNode = useBuilderStore((s) => s.removeTokenFromNode);
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const duplicateSelectedNodes = useBuilderStore((s) => s.duplicateSelectedNodes);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const removeSelectedNodes = useBuilderStore((s) => s.removeSelectedNodes);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  // Collapsible section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // MULTI-SELECTION INSPECTOR (Section 45)
  if (selectedNodeIds.length > 1) {
    const selectedNodes: ComponentNode[] = [];
    if (activePage?.root) {
      for (const id of selectedNodeIds) {
        const found = findNode(activePage.root, id);
        if (found) selectedNodes.push(found);
      }
    }

    const getMultiValue = (styleKey: keyof ComponentStyles) => {
      if (selectedNodes.length === 0) return { value: '', isMixed: false };
      const firstVal = (selectedNodes[0].styles as any)[styleKey];
      const isMixed = selectedNodes.some((n) => (n.styles as any)[styleKey] !== firstVal);
      return { value: isMixed ? '' : firstVal, isMixed };
    };

    const handleMultiStyleChange = (styleKey: keyof ComponentStyles, val: any) => {
      for (const node of selectedNodes) {
        if (viewport === 'desktop') {
          updateNodeStyles(node.id, { [styleKey]: val });
        } else {
          updateNodeResponsiveStyles(node.id, viewport, { [styleKey]: val });
        }
      }
    };

    return (
      <aside
        data-testid="builder-inspector"
        className="w-72 bg-[#0D0F17] border-l border-[#1E2330] flex flex-col select-none shrink-0 h-full z-20"
      >
        {/* Multi-Select Header */}
        <div className="p-3 border-b border-[#1E2330] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-xs text-white truncate block">
                {selectedNodeIds.length} elements selected
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                Multi-Selection
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={duplicateSelectedNodes}
              className="p-1.5 rounded hover:bg-[#1C2132] text-slate-400 hover:text-white transition-colors"
              title="Duplicate Selected"
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={removeSelectedNodes}
              className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Shared Properties */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">
              Dimensions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Width</label>
                <input
                  type="text"
                  placeholder={getMultiValue('width').isMixed ? 'Mixed' : 'Auto'}
                  value={getMultiValue('width').value || ''}
                  onChange={(e) => handleMultiStyleChange('width', e.target.value)}
                  className="w-full bg-[#12141F] border border-[#1E2330] rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Height</label>
                <input
                  type="text"
                  placeholder={getMultiValue('height').isMixed ? 'Mixed' : 'Auto'}
                  value={getMultiValue('height').value || ''}
                  onChange={(e) => handleMultiStyleChange('height', e.target.value)}
                  className="w-full bg-[#12141F] border border-[#1E2330] rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">
              Colors
            </span>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={getMultiValue('backgroundColor').value || '#000000'}
                  onChange={(e) => handleMultiStyleChange('backgroundColor', e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                />
                <input
                  type="text"
                  placeholder={getMultiValue('backgroundColor').isMixed ? 'Mixed' : 'transparent'}
                  value={getMultiValue('backgroundColor').value || ''}
                  onChange={(e) => handleMultiStyleChange('backgroundColor', e.target.value)}
                  className="flex-1 bg-[#12141F] border border-[#1E2330] rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // SINGLE SELECTION INSPECTOR
  const selectedNode =
    selectedNodeId && activePage?.root ? findNode(activePage.root, selectedNodeId) : null;

  if (!selectedNode) {
    return (
      <aside
        data-testid="builder-inspector"
        className="w-72 bg-[#0D0F17] border-l border-[#1E2330] flex flex-col items-center justify-center p-6 text-center select-none text-slate-500 h-full shrink-0"
      >
        <Sliders className="w-8 h-8 text-slate-600 mb-2.5 stroke-[1.5]" />
        <h3 className="text-xs font-semibold text-slate-300">No Component Selected</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[180px]">
          Select any element on the canvas or in the layers panel to inspect and customize its properties.
        </p>
      </aside>
    );
  }

  const fields = INSPECTOR_DEFINITIONS[selectedNode.type] || [];
  const sections = Array.from(new Set(fields.map((f) => f.section)));

  // Current resolved styles for active viewport
  const currentStyles = resolveNodeStylesForViewport(selectedNode, viewport);

  const handleFieldChange = (key: string, value: any) => {
    if (key.startsWith('props.')) {
      const propKey = key.replace('props.', '');
      updateNodeProps(selectedNode.id, { [propKey]: value });
    } else if (key.startsWith('styles.')) {
      const styleKey = key.replace('styles.', '') as keyof ComponentStyles;
      if (viewport === 'desktop') {
        updateNodeStyles(selectedNode.id, { [styleKey]: value });
      } else {
        updateNodeResponsiveStyles(selectedNode.id, viewport, { [styleKey]: value });
      }
    }
  };

  const getFieldValue = (key: string) => {
    if (key.startsWith('props.')) {
      const propKey = key.replace('props.', '');
      return selectedNode.props[propKey];
    } else if (key.startsWith('styles.')) {
      const styleKey = key.replace('styles.', '') as keyof ComponentStyles;
      return (currentStyles as any)[styleKey] ?? '';
    }
    return '';
  };

  const isFieldOverridden = (key: string) => {
    if (key.startsWith('styles.')) {
      const styleKey = key.replace('styles.', '');
      return isPropertyOverridden(selectedNode, viewport, styleKey);
    }
    return false;
  };

  const handleResetOverride = (key: string) => {
    if (key.startsWith('styles.') && viewport !== 'desktop') {
      const styleKey = key.replace('styles.', '') as keyof ComponentStyles;
      resetResponsiveStyle(selectedNode.id, viewport, styleKey);
    }
  };

  const isRoot = !selectedNode.parentId;

  return (
    <aside
      data-testid="builder-inspector"
      className="w-72 bg-[#0D0F17] border-l border-[#1E2330] flex flex-col select-none shrink-0 h-full z-20"
    >
      {/* Inspector Header */}
      <div className="p-3 border-b border-[#1E2330] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Box className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-xs text-white truncate block">
              {selectedNode.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {selectedNode.type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateNode(selectedNode.id)}
            className="p-1.5 rounded hover:bg-[#1C2132] text-slate-400 hover:text-white transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <CopyPlus className="w-3.5 h-3.5" />
          </button>
          {!isRoot && (
            <button
              onClick={() => removeNode(selectedNode.id)}
              className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top Inspector Tabs: Properties, States, Interactions */}
      <div className="flex border-b border-[#1E2330] bg-[#0A0C13] px-2 text-xs">
        <button
          data-testid="tab-inspector-properties"
          onClick={() => setActiveInspectorTab('properties')}
          className={`py-2 px-3 font-medium transition-colors border-b-2 ${
            activeInspectorTab === 'properties'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Properties
        </button>
        <button
          data-testid="tab-inspector-states"
          onClick={() => setActiveInspectorTab('states')}
          className={`py-2 px-3 font-medium transition-colors border-b-2 ${
            activeInspectorTab === 'states'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          States
        </button>
        <button
          data-testid="tab-inspector-interactions"
          onClick={() => setActiveInspectorTab('interactions')}
          className={`py-2 px-3 font-medium transition-colors border-b-2 ${
            activeInspectorTab === 'interactions'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interactions
        </button>
        <button
          data-testid="tab-inspector-logic"
          onClick={() => setActiveInspectorTab('logic')}
          className={`py-2 px-3 font-medium transition-colors border-b-2 ${
            activeInspectorTab === 'logic'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Logic
        </button>
      </div>

      {/* STATES TAB */}
      {activeInspectorTab === 'states' && (
        <div className="flex-1 overflow-y-auto p-3">
          <ComponentStatesSection node={selectedNode} />
        </div>
      )}

      {/* INTERACTIONS TAB */}
      {activeInspectorTab === 'interactions' && (
        <div className="flex-1 overflow-y-auto p-3">
          <InteractionsSection node={selectedNode} />
        </div>
      )}

      {/* LOGIC TAB */}
      {activeInspectorTab === 'logic' && (
        <div className="flex-1 overflow-y-auto">
          <LogicInspectorSection node={selectedNode} />
        </div>
      )}

      {/* PROPERTIES TAB */}
      {activeInspectorTab === 'properties' && (
        <>
          {/* Viewport Indicator Banner & Responsive Controls */}
          <div className="px-3 py-2 bg-[#10131E] border-b border-[#1B2030] text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="capitalize font-medium">
                Viewport: <strong className="text-white">{viewport}</strong>
              </span>
              {viewport !== 'desktop' && (
                <button
                  data-testid={viewport === 'tablet' ? 'reset-tablet-overrides' : 'reset-mobile-overrides'}
                  onClick={() => {
                    if (selectedNode.responsiveStyles?.[viewport]) {
                      for (const k of Object.keys(selectedNode.responsiveStyles[viewport])) {
                        resetResponsiveStyle(selectedNode.id, viewport, k);
                      }
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline"
                >
                  Reset {viewport}
                </button>
              )}
            </div>

            {selectedNode.responsiveStyles && Object.keys(selectedNode.responsiveStyles).length > 0 && (
              <button
                data-testid="reset-all-responsive"
                onClick={() => resetAllResponsiveOverrides(selectedNode.id)}
                className="w-full py-1 px-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-medium transition-colors text-center block"
              >
                Reset All Responsive Overrides
              </button>
            )}
          </div>

          {/* Schema-Driven Collapsible Properties Sections */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            {sections.map((sectionName) => {
              const sectionFields = fields.filter((f) => f.section === sectionName);
              const isCollapsed = !!collapsedSections[sectionName];

              return (
                <div key={sectionName} className="space-y-1.5">
                  <button
                    onClick={() => toggleSection(sectionName)}
                    className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase py-1"
                  >
                    <span>{sectionName}</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2.5 bg-[#12141F] p-2.5 rounded-lg border border-[#1F2436]">
                      {/* Spacing Section Custom Handling */}
                      {sectionName === 'Spacing' && (
                        <div className="space-y-3">
                          <SpacingControl
                            label="Padding"
                            propertyPrefix="padding"
                            styles={currentStyles}
                            isOverridden={isFieldOverridden('styles.padding')}
                            onResetOverride={() => handleResetOverride('styles.padding')}
                            onChange={(updates) => {
                              for (const [k, v] of Object.entries(updates)) {
                                handleFieldChange(`styles.${k}`, v);
                              }
                            }}
                          />

                          <SpacingControl
                            label="Margin"
                            propertyPrefix="margin"
                            styles={currentStyles}
                            isOverridden={isFieldOverridden('styles.margin')}
                            onResetOverride={() => handleResetOverride('styles.margin')}
                            onChange={(updates) => {
                              for (const [k, v] of Object.entries(updates)) {
                                handleFieldChange(`styles.${k}`, v);
                              }
                            }}
                          />

                          {sectionFields
                            .filter(
                              (f) =>
                                !f.key.startsWith('styles.padding') &&
                                !f.key.startsWith('styles.margin')
                            )
                            .map((field) => (
                              <PropertyControl
                                key={field.key}
                                field={field}
                                value={getFieldValue(field.key)}
                                isOverridden={isFieldOverridden(field.key)}
                                onResetOverride={() => handleResetOverride(field.key)}
                                onChange={(val) => handleFieldChange(field.key, val)}
                                tokens={project.tokens}
                                activeTokenId={selectedNode.tokenReferences?.[field.key]}
                                onApplyToken={(tId) => applyTokenToNode(selectedNode.id, field.key, tId)}
                                onRemoveToken={() => removeTokenFromNode(selectedNode.id, field.key)}
                              />
                            ))}
                        </div>
                      )}

                      {/* Border Section Custom Handling */}
                      {sectionName === 'Border' && (
                        <div className="space-y-3">
                          <RadiusControl
                            styles={currentStyles}
                            isOverridden={isFieldOverridden('styles.borderRadius')}
                            onResetOverride={() => handleResetOverride('styles.borderRadius')}
                            onChange={(updates) => {
                              for (const [k, v] of Object.entries(updates)) {
                                handleFieldChange(`styles.${k}`, v);
                              }
                            }}
                          />

                          {sectionFields
                            .filter((f) => !f.key.includes('Radius'))
                            .map((field) => (
                              <PropertyControl
                                key={field.key}
                                field={field}
                                value={getFieldValue(field.key)}
                                isOverridden={isFieldOverridden(field.key)}
                                onResetOverride={() => handleResetOverride(field.key)}
                                onChange={(val) => handleFieldChange(field.key, val)}
                                tokens={project.tokens}
                                activeTokenId={selectedNode.tokenReferences?.[field.key]}
                                onApplyToken={(tId) => applyTokenToNode(selectedNode.id, field.key, tId)}
                                onRemoveToken={() => removeTokenFromNode(selectedNode.id, field.key)}
                              />
                            ))}
                        </div>
                      )}

                      {/* Effects Section Custom Handling */}
                      {sectionName === 'Effects' && (
                        <div className="space-y-3">
                          <ShadowControl
                            styles={currentStyles}
                            isOverridden={isFieldOverridden('styles.shadowPreset')}
                            onResetOverride={() => handleResetOverride('styles.shadowPreset')}
                            onChange={(updates) => {
                              for (const [k, v] of Object.entries(updates)) {
                                handleFieldChange(`styles.${k}`, v);
                              }
                            }}
                          />

                          {sectionFields
                            .filter((f) => f.key !== 'styles.shadowPreset' && f.key !== 'styles.boxShadow')
                            .map((field) => (
                              <PropertyControl
                                key={field.key}
                                field={field}
                                value={getFieldValue(field.key)}
                                isOverridden={isFieldOverridden(field.key)}
                                onResetOverride={() => handleResetOverride(field.key)}
                                onChange={(val) => handleFieldChange(field.key, val)}
                                tokens={project.tokens}
                                activeTokenId={selectedNode.tokenReferences?.[field.key]}
                                onApplyToken={(tId) => applyTokenToNode(selectedNode.id, field.key, tId)}
                                onRemoveToken={() => removeTokenFromNode(selectedNode.id, field.key)}
                              />
                            ))}
                        </div>
                      )}

                      {/* Generic rendering for all other sections */}
                      {sectionName !== 'Spacing' &&
                        sectionName !== 'Border' &&
                        sectionName !== 'Effects' &&
                        sectionFields.map((field) => (
                          <PropertyControl
                            key={field.key}
                            field={field}
                            value={getFieldValue(field.key)}
                            isOverridden={isFieldOverridden(field.key)}
                            onResetOverride={() => handleResetOverride(field.key)}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            tokens={project.tokens}
                            activeTokenId={selectedNode.tokenReferences?.[field.key]}
                            onApplyToken={(tId) => applyTokenToNode(selectedNode.id, field.key, tId)}
                            onRemoveToken={() => removeTokenFromNode(selectedNode.id, field.key)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};
