'use client';

import React, { useState } from 'react';
import { ComponentNode } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import { COMPONENT_REGISTRY, createDefaultNode } from '@/builder/components/registry';
import { resolveStylesForViewport, resolveStylesToCSS } from '@/builder/responsive/style-resolver';
import { SelectionOverlay } from './SelectionOverlay';
import { DropIndicator } from './DropIndicator';
import { ResizeHandles } from './ResizeHandles';
import {
  PlusCircle,
  AlertTriangle,
  Star,
  Heart,
  ArrowRight,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Box,
  ImageOff,
  Lock,
} from 'lucide-react';
import { triggerNodeInteractions } from '@/builder/interactions/interactions-engine';
import { useRuntimeStore } from '@/builder/runtime/runtime-store';
import { evaluateExpression } from '@/builder/expressions/expression-evaluator';
import { triggerNodeLogicRules } from '@/builder/runtime/logic-executor';

export { resolveStylesForViewport };

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Star,
  Heart,
  ArrowRight,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Box,
};

interface ComponentRendererProps {
  node: ComponentNode;
  isPreview?: boolean;
  scopeContext?: Record<string, any>;
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  node,
  isPreview = false,
  scopeContext = {},
  onContextMenu,
}) => {
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const hoveredNodeId = useBuilderStore((s) => s.hoveredNodeId);
  const viewport = useBuilderStore((s) => s.viewport);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const toggleSelectNode = useBuilderStore((s) => s.toggleSelectNode);
  const hoverNode = useBuilderStore((s) => s.hoverNode);
  const addNode = useBuilderStore((s) => s.addNode);
  const moveNode = useBuilderStore((s) => s.moveNode);
  const setActivePage = useBuilderStore((s) => s.setActivePage);
  const previewVisibleOverrides = useBuilderStore((s) => s.previewVisibleOverrides);
  const setPreviewVisibleOverride = useBuilderStore((s) => s.setPreviewVisibleOverride);
  const togglePreviewVisibleOverride = useBuilderStore((s) => s.togglePreviewVisibleOverride);
  const activeComponentState = useBuilderStore((s) => s.activeComponentState);

  // Runtime Store state
  const runtimeVariables = useRuntimeStore((s) => s.variables);
  const runtimeCollections = useRuntimeStore((s) => s.collections);
  const runtimeForms = useRuntimeStore((s) => s.forms);
  const runtimeNavigation = useRuntimeStore((s) => s.navigation);
  const setFormFieldValue = useRuntimeStore((s) => s.setFormFieldValue);
  const setFormFieldTouched = useRuntimeStore((s) => s.setFormFieldTouched);
  const validateFormField = useRuntimeStore((s) => s.validateFormField);

  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Build evaluation context combining runtime variables, collections, forms, navigation, and repeater scopeContext
  const evalContext: Record<string, any> = {
    ...runtimeVariables,
    collections: runtimeCollections,
    forms: runtimeForms,
    query: runtimeNavigation.queryParams,
    route: runtimeNavigation.routeParams,
    ...scopeContext,
  };

  // Helper to resolve property bindings or static props
  const resolveProp = (propKey: string, fallback: any = '') => {
    const binding = node.bindings?.[`props.${propKey}`];
    if (binding && binding.expression) {
      const res = evaluateExpression(binding.expression, evalContext);
      if (res.success && res.value !== undefined) {
        return res.value;
      }
    }
    return node.props[propKey] !== undefined ? node.props[propKey] : fallback;
  };

  // Conditional visibility check in preview
  if (isPreview && node.conditionalVisibility?.expression) {
    const res = evaluateExpression(node.conditionalVisibility.expression, evalContext);
    if (res.success && !res.value) {
      return null;
    }
  }

  const isSelected = !isPreview && (selectedNodeId === node.id || selectedNodeIds.includes(node.id));
  const isPrimarySelected = !isPreview && selectedNodeId === node.id;
  const isHovered = !isPreview && hoveredNodeId === node.id && !isSelected;

  const def = COMPONENT_REGISTRY[node.type];

  // Fallback for unknown component types (AT-030 and AT2-004)
  if (!def) {
    return (
      <div className="p-3 border border-red-500 bg-red-500/10 text-red-400 text-xs rounded flex flex-col gap-1 select-none">
        <div className="flex items-center gap-1.5 font-semibold">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Unknown Component</span>
        </div>
        <span className="text-slate-400">Type: {node.type}</span>
      </div>
    );
  }

  let style = resolveStylesForViewport(node, viewport);

  // If inspecting a component state on selected node, merge state styles
  if (!isPreview && isSelected && activeComponentState !== 'default' && node.states?.[activeComponentState]) {
    style = { ...style, ...(resolveStylesToCSS(node.states[activeComponentState] as any) as any) };
  }

  // Runtime visibility override in preview
  if (isPreview) {
    if (previewVisibleOverrides[node.id] === false) {
      return null;
    }
    if (previewVisibleOverrides[node.id] === true && style.display === 'none') {
      style = { ...style, display: 'flex', visibility: 'visible' };
    }
  }

  // If component is hidden via responsive styles or visibility
  if (style.display === 'none' && isPreview) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview) {
      if (node.locked) return;
      e.stopPropagation();
      toggleSelectNode(node.id, e.shiftKey);
    } else {
      // Execute logic rules if present
      if (node.logicRules && node.logicRules.length > 0) {
        e.stopPropagation();
        triggerNodeLogicRules(node.logicRules, 'click', evalContext);
      }
      // Also execute interactions if present
      if (node.interactions && node.interactions.length > 0) {
        e.stopPropagation();
        triggerNodeInteractions(node.interactions, 'click', {
          project,
          activePageId,
          setActivePage,
          visibleOverrides: previewVisibleOverrides,
          setVisibleOverride: setPreviewVisibleOverride,
          toggleVisibleOverride: togglePreviewVisibleOverride,
        });
      }
    }
  };


  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isPreview && node.interactions && node.interactions.length > 0) {
      e.stopPropagation();
      triggerNodeInteractions(node.interactions, 'double_click', {
        project,
        activePageId,
        setActivePage,
        visibleOverrides: previewVisibleOverrides,
        setVisibleOverride: setPreviewVisibleOverride,
        toggleVisibleOverride: togglePreviewVisibleOverride,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectNode(node.id, false);
      if (onContextMenu) {
        onContextMenu(e, node.id);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    e.dataTransfer.setData('application/builder-node-id', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    if (def.canHaveChildren) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const targetParentId = def.canHaveChildren ? node.id : node.parentId;
    if (!targetParentId) return;

    const movingNodeId = e.dataTransfer.getData('application/builder-node-id');
    const newComponentType = e.dataTransfer.getData('application/builder-component-type') as any;

    if (movingNodeId) {
      moveNode(movingNodeId, targetParentId);
      return;
    }

    if (newComponentType && (COMPONENT_REGISTRY as any)[newComponentType]) {
      const newNode = createDefaultNode(newComponentType as any, `${newComponentType}_${Date.now()}`);
      addNode(targetParentId, newNode);
    }
  };

  const hasBindings = Boolean(node.bindings && Object.keys(node.bindings).length > 0);

  // Render Component content based on registry definition
  const renderContent = () => {
    switch (node.type) {
      case 'text':
        return (
          <span style={{ margin: 0, padding: 0 }}>
            {String(resolveProp('text', 'Text'))}
          </span>
        );

      case 'heading': {
        const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.props.level)
          ? node.props.level
          : 'h2') as any;
        return <Tag style={{ margin: 0 }}>{String(resolveProp('text', 'Heading'))}</Tag>;
      }

      case 'paragraph':
        return <p style={{ margin: 0 }}>{String(resolveProp('text', 'Paragraph'))}</p>;

      case 'button': {
        const disabled = Boolean(resolveProp('disabled', node.props.disabled ?? false));
        return (
          <span className={disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}>
            {String(resolveProp('text', 'Button'))}
          </span>
        );
      }

      case 'link':
        return (
          <a
            href={String(resolveProp('href', node.props.href || '#'))}
            onClick={(e) => {
              if (isPreview && node.props.targetPageId) {
                e.preventDefault();
                setActivePage(node.props.targetPageId);
              }
            }}
            className="hover:underline transition-all inline-flex items-center gap-1"
          >
            {String(resolveProp('text', 'Link'))}
          </a>
        );

      case 'icon': {
        const IconComponent = ICON_COMPONENTS[node.props.iconName] || Star;
        return <IconComponent className="w-full h-full text-inherit" />;
      }

      case 'image': {
        // Look up asset if assetId is set
        let resolvedSrc = resolveProp('src', node.props.src);
        if (node.props.assetId) {
          const matchedAsset = (project.assets || []).find((a) => a.id === node.props.assetId);
          if (matchedAsset) {
            resolvedSrc = matchedAsset.src || matchedAsset.url;
          } else {
            // Missing/deleted asset fallback (AT2-041)
            resolvedSrc = null;
          }
        }
        const resolvedAlt = String(resolveProp('alt', node.props.alt || 'Image'));

        if (!resolvedSrc || imageError) {
          return (
            <div className="w-full h-full min-h-[120px] bg-slate-100 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center p-4 text-center text-slate-400 gap-1.5 select-none">
              <ImageOff className="w-6 h-6 text-slate-400" />
              <span className="text-[11px] font-medium">Missing or Deleted Asset</span>
              <span className="text-[9px] text-slate-400">{resolvedAlt}</span>
            </div>
          );
        }

        return (
          <img
            src={String(resolvedSrc)}
            alt={resolvedAlt}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: (style.objectFit as any) || 'cover',
              borderRadius: 'inherit',
            }}
          />
        );
      }

      case 'spacer':
        return <div className="w-full h-full pointer-events-none" />;

      case 'divider':
        return <div className="w-full h-full pointer-events-none" />;

      case 'input': {
        const boundVar = node.props.boundVariable;
        const formState = runtimeForms[node.id];
        let currentValue = node.props.value || '';
        if (isPreview) {
          if (boundVar && runtimeVariables[boundVar] !== undefined) {
            currentValue = runtimeVariables[boundVar];
          } else if (formState?.value !== undefined) {
            currentValue = formState.value;
          }
        }

        const rules = {
          required: Boolean(node.props.required),
          minLength: node.props.minLength ? Number(node.props.minLength) : undefined,
          maxLength: node.props.maxLength ? Number(node.props.maxLength) : undefined,
          min: node.props.min ? Number(node.props.min) : undefined,
          max: node.props.max ? Number(node.props.max) : undefined,
          email: node.props.inputType === 'email' || node.props.type === 'email',
          url: node.props.inputType === 'url' || node.props.type === 'url',
          pattern: node.props.customPattern,
        };

        return (
          <div className="w-full flex flex-col">
            <input
              type={node.props.inputType || node.props.type || 'text'}
              placeholder={String(resolveProp('placeholder', node.props.placeholder || 'Enter text...'))}
              value={isPreview ? currentValue : (node.props.value || '')}
              disabled={!isPreview}
              onChange={(e) => {
                if (!isPreview) return;
                const val = e.target.value;
                setFormFieldValue(node.id, val);
                if (boundVar) {
                  useRuntimeStore.getState().setVariable(boundVar, val);
                }
                validateFormField(node.id, rules);
                if (node.logicRules && node.logicRules.length > 0) {
                  triggerNodeLogicRules(node.logicRules, 'change', { ...evalContext, value: val });
                }
              }}
              onBlur={() => {
                if (!isPreview) return;
                setFormFieldTouched(node.id, true);
                validateFormField(node.id, rules);
              }}
              className="w-full bg-transparent border-0 outline-none text-inherit placeholder:text-slate-400"
            />
            {isPreview && formState?.error && (
              <span data-testid="form-error" className="text-[11px] text-red-500 mt-1 block">
                {formState.error}
              </span>
            )}
          </div>
        );
      }

      case 'textarea': {
        const boundVar = node.props.boundVariable;
        const formState = runtimeForms[node.id];
        let currentValue = node.props.value || '';
        if (isPreview) {
          if (boundVar && runtimeVariables[boundVar] !== undefined) {
            currentValue = runtimeVariables[boundVar];
          } else if (formState?.value !== undefined) {
            currentValue = formState.value;
          }
        }

        const rules = {
          required: Boolean(node.props.required),
          minLength: node.props.minLength ? Number(node.props.minLength) : undefined,
          maxLength: node.props.maxLength ? Number(node.props.maxLength) : undefined,
          pattern: node.props.customPattern,
        };

        return (
          <div className="w-full flex flex-col">
            <textarea
              placeholder={String(resolveProp('placeholder', node.props.placeholder || 'Enter text...'))}
              value={isPreview ? currentValue : (node.props.value || '')}
              disabled={!isPreview}
              onChange={(e) => {
                if (!isPreview) return;
                const val = e.target.value;
                setFormFieldValue(node.id, val);
                if (boundVar) {
                  useRuntimeStore.getState().setVariable(boundVar, val);
                }
                validateFormField(node.id, rules);
                if (node.logicRules && node.logicRules.length > 0) {
                  triggerNodeLogicRules(node.logicRules, 'change', { ...evalContext, value: val });
                }
              }}
              onBlur={() => {
                if (!isPreview) return;
                setFormFieldTouched(node.id, true);
                validateFormField(node.id, rules);
              }}
              className="w-full bg-transparent border-0 outline-none text-inherit placeholder:text-slate-400 resize-none"
              rows={Number(node.props.rows || 3)}
            />
            {isPreview && formState?.error && (
              <span data-testid="form-error" className="text-[11px] text-red-500 mt-1 block">
                {formState.error}
              </span>
            )}
          </div>
        );
      }

      case 'repeater': {
        const collectionId = node.props.collectionId;
        const itemVariable = node.props.itemVariable || 'item';
        const indexVariable = node.props.indexVariable || 'index';
        const emptyText = node.props.emptyText || 'No records found';

        const records = isPreview
          ? (runtimeCollections[collectionId] || [])
          : ((project.collections || []).find((c) => c.id === collectionId)?.records || []);

        if (records.length === 0) {
          if (!isPreview && node.children.length > 0) {
            return (
              <div data-testid="repeater" className="w-full flex flex-col gap-2">
                <div className="text-[10px] text-indigo-400 font-mono select-none px-1">
                  Repeater: {node.props.collectionId || 'No collection selected'}
                </div>
                {node.children.map((child) => (
                  <ComponentRenderer
                    key={child.id}
                    node={child}
                    isPreview={isPreview}
                    scopeContext={{ [itemVariable]: {}, [indexVariable]: 0 }}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </div>
            );
          }

          return (
            <div
              data-testid="repeater"
              className="w-full p-4 text-center text-slate-400 text-sm border border-dashed border-slate-300 rounded"
            >
              <div data-testid="repeater-empty">{emptyText}</div>
            </div>
          );
        }

        return (
          <div data-testid="repeater" className="w-full flex flex-col gap-2">
            {records.map((rec, idx) => {
              const itemScope = {
                ...scopeContext,
                [itemVariable]: rec.values,
                [indexVariable]: idx,
                recordId: rec.id,
              };
              return (
                <div key={rec.id || idx} className="w-full repeater-item">
                  {node.children.map((child) => (
                    <ComponentRenderer
                      key={`${child.id}_${rec.id || idx}`}
                      node={child}
                      isPreview={isPreview}
                      scopeContext={itemScope}
                      onContextMenu={onContextMenu}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      }

      case 'container':
      case 'row':
      case 'column':
      case 'stack':
      default:
        if (node.children.length === 0 && !isPreview) {
          return (
            <div className="w-full py-6 px-3 border border-dashed border-slate-300 rounded text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Empty {node.name || 'Container'} (Drop components here)</span>
            </div>
          );
        }

        return node.children.map((child) => (
          <ComponentRenderer
            key={child.id}
            node={child}
            isPreview={isPreview}
            scopeContext={scopeContext}
            onContextMenu={onContextMenu}
          />
        ));
    }
  };

  const isHiddenInEditor = !isPreview && style.display === 'none';

  return (
    <div
      id={`builder-node-${node.id}`}
      data-testid={`component-${node.type}`}
      style={{
        ...style,
        ...(isHiddenInEditor ? { display: 'flex', opacity: 0.35 } : {}),
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable={!isPreview && !node.locked && !!node.parentId}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={(e) => {
        if (!isPreview) {
          e.stopPropagation();
          hoverNode(node.id);
        }
      }}
      onMouseLeave={() => {
        if (!isPreview) hoverNode(null);
      }}
      className={`relative transition-all duration-100 ${
        !isPreview ? 'select-none cursor-pointer' : ''
      } ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white shadow-sm z-20'
          : isHovered
          ? 'ring-1 ring-indigo-400/70 z-10'
          : ''
      }`}
    >
      {/* Drop Target Indicator */}
      <DropIndicator isVisible={isDragOver} />

      {/* Hover Outline */}
      {isHovered && (
        <div
          data-testid="canvas-hover-outline"
          className="absolute inset-0 pointer-events-none border border-indigo-400/80 rounded z-10"
        />
      )}

      {/* Lock Indicator */}
      {node.locked && !isPreview && (
        <div
          data-testid={`node-locked-${node.id}`}
          className="absolute top-1 right-1 p-0.5 bg-amber-500/80 text-white rounded text-[9px] pointer-events-none z-30 shadow-sm"
          title="Component is locked"
        >
          <Lock className="w-2.5 h-2.5" />
        </div>
      )}

      {/* Dynamic Binding Indicator */}
      {hasBindings && (
        <div
          data-testid="dynamic-value-indicator"
          className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-violet-600 text-white rounded text-[9px] font-bold z-30 shadow flex items-center gap-0.5 pointer-events-none"
          title="Has dynamic data bindings"
        >
          ⚡
        </div>
      )}

      {/* Selected Indicator Overlay */}
      {isSelected && <SelectionOverlay node={node} isMulti={selectedNodeIds.length > 1} />}

      {/* Resize Handles on primary selection */}
      {isPrimarySelected && !node.locked && <ResizeHandles node={node} />}

      {renderContent()}
    </div>
  );
};
