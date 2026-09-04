'use client';

import React, { createContext, useContext } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ComponentNode, ViewportMode } from '@/types/schema';
import { resolveNodeStyles, interpolateText, cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

export const DataContext = createContext<Record<string, any>>({});

interface RenderComponentProps {
  nodeId: string;
  isPreview?: boolean;
}

export const RenderComponent: React.FC<RenderComponentProps> = ({ nodeId, isPreview = false }) => {
  const node = useEditorStore((s) => s.project.nodes[nodeId]);
  const viewport = useEditorStore((s) => s.viewport);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const hoveredNodeId = useEditorStore((s) => s.hoveredNodeId);
  const dragOverNodeId = useEditorStore((s) => s.dragOverNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const hoverNode = useEditorStore((s) => s.hoverNode);
  const setDragOverNode = useEditorStore((s) => s.setDragOverNode);
  const addNode = useEditorStore((s) => s.addNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const draggedComponentType = useEditorStore((s) => s.draggedComponentType);
  const showToast = useEditorStore((s) => s.showToast);
  const switchPage = useEditorStore((s) => s.switchPage);
  const collections = useEditorStore((s) => s.project.collections);

  const dataContext = useContext(DataContext);

  if (!node || node.isHidden) return null;

  const isSelected = !isPreview && selectedNodeId === nodeId;
  const isHovered = !isPreview && hoveredNodeId === nodeId && !isSelected;
  const isDragTarget = !isPreview && dragOverNodeId === nodeId;

  // Resolve styles according to viewport breakpoint
  const style = resolveNodeStyles(node, viewport);

  // Handle Event Execution in Preview Mode or Editor Mode
  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.stopPropagation();
      selectNode(nodeId);
      return;
    }

    if (node.events && node.events.length > 0) {
      e.stopPropagation();
      node.events.forEach((evt) => {
        if (evt.trigger === 'click') {
          if (evt.actionType === 'toast') {
            showToast(evt.payload?.message || 'Action performed!');
          } else if (evt.actionType === 'navigate' && evt.payload?.pageId) {
            switchPage(evt.payload.pageId);
          }
        }
      });
    }
  };

  // Drag and Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragOverNodeId !== nodeId) {
      setDragOverNode(nodeId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    if (dragOverNodeId === nodeId) {
      setDragOverNode(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);

    const internalMoveId = e.dataTransfer.getData('application/node-id');
    const incomingType = e.dataTransfer.getData('application/component-type') || draggedComponentType;

    if (internalMoveId) {
      moveNode(internalMoveId, nodeId);
      return;
    }

    if (incomingType) {
      addNode(incomingType, nodeId);
    }
  };

  // Helper for rendering icons dynamically
  const renderIcon = (iconName?: string, className = 'w-4 h-4') => {
    if (!iconName) return null;
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
  };

  // Content interpolation
  const interpolatedProps: Record<string, any> = {};
  for (const [key, val] of Object.entries(node.props)) {
    if (typeof val === 'string') {
      interpolatedProps[key] = interpolateText(val, dataContext);
    } else {
      interpolatedProps[key] = val;
    }
  }

  // Render element content based on node type
  const renderInner = () => {
    switch (node.type) {
      case 'heading': {
        const Tag = (node.props.level || 'h2') as any;
        return <Tag style={{ margin: 0 }}>{interpolatedProps.text || 'Heading'}</Tag>;
      }

      case 'text':
        return <p style={{ margin: 0 }}>{interpolatedProps.text || 'Text'}</p>;

      case 'badge':
        return <span>{interpolatedProps.text || 'Badge'}</span>;

      case 'button':
        return (
          <>
            {renderIcon(node.props.icon)}
            <span>{interpolatedProps.text || 'Button'}</span>
          </>
        );

      case 'link':
        return (
          <a
            href={node.props.href || '#'}
            onClick={(e) => {
              if (!isPreview) e.preventDefault();
            }}
          >
            {interpolatedProps.text || 'Link'}
          </a>
        );

      case 'image':
        return (
          <img
            src={interpolatedProps.src || 'https://via.placeholder.com/400x200'}
            alt={interpolatedProps.alt || 'Image'}
            style={{ width: '100%', height: '100%', objectFit: (style.objectFit as any) || 'cover' }}
          />
        );

      case 'avatar':
        return (
          <div className="relative flex items-center justify-center overflow-hidden rounded-full bg-slate-800">
            <img
              src={interpolatedProps.src || 'https://via.placeholder.com/80'}
              alt={interpolatedProps.name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          </div>
        );

      case 'input':
        return (
          <div className="w-full flex flex-col gap-1.5">
            {node.props.label && (
              <label className="text-xs font-medium text-slate-300">{node.props.label}</label>
            )}
            <input
              type={node.props.inputType || 'text'}
              placeholder={interpolatedProps.placeholder || ''}
              disabled={!isPreview}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="w-full flex flex-col gap-1.5">
            {node.props.label && (
              <label className="text-xs font-medium text-slate-300">{node.props.label}</label>
            )}
            <textarea
              rows={node.props.rows || 3}
              placeholder={interpolatedProps.placeholder || ''}
              disabled={!isPreview}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        );

      case 'navbar':
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 font-bold text-white tracking-wider text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
              {interpolatedProps.brandName || 'Brand'}
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-300 font-medium">
              {(node.props.links || ['Home', 'Features', 'Docs']).map((l: string, i: number) => (
                <span
                  key={i}
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => isPreview && showToast(`Navigating to ${l}`)}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        );

      case 'statistic':
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">{interpolatedProps.title}</span>
            <span className="text-2xl font-bold text-white tracking-tight">{interpolatedProps.value}</span>
            {interpolatedProps.change && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                <Icons.TrendingUp className="w-3.5 h-3.5" />
                {interpolatedProps.change}
              </span>
            )}
          </div>
        );

      case 'repeater': {
        const collection = collections.find((c) => c.key === node.props.collectionKey) || collections[0];
        const records = collection ? collection.records.slice(0, node.props.limit || 6) : [];

        if (records.length === 0) {
          return (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl w-full col-span-full">
              No records found in collection &apos;{node.props.collectionKey}&apos;.
            </div>
          );
        }

        return records.map((record, index) => (
          <DataContext.Provider key={record.id || index} value={{ item: record, index }}>
            {node.children.map((childId) => (
              <RenderComponent key={childId} nodeId={childId} isPreview={isPreview} />
            ))}
          </DataContext.Provider>
        ));
      }

      case 'alert':
        return (
          <div className="flex items-start gap-3 w-full">
            <Icons.Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">{interpolatedProps.title}</div>
              <div className="text-xs text-slate-300 mt-0.5">{interpolatedProps.message}</div>
            </div>
          </div>
        );

      case 'embed':
        return (
          <div
            dangerouslySetInnerHTML={{ __html: node.props.html || '' }}
            className="w-full overflow-hidden"
          />
        );

      default:
        // Generic container or card rendering children
        if (node.children.length === 0 && !isPreview) {
          return (
            <div className="w-full py-6 px-4 border border-dashed border-slate-700/60 rounded-lg text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <Icons.PlusCircle className="w-4 h-4 text-slate-600" />
              <span>Drop components inside {node.name}</span>
            </div>
          );
        }
        return node.children.map((childId) => (
          <RenderComponent key={childId} nodeId={childId} isPreview={isPreview} />
        ));
    }
  };

  return (
    <div
      id={`builder-node-${nodeId}`}
      style={style}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isPreview) {
          e.stopPropagation();
          hoverNode(nodeId);
        }
      }}
      onMouseLeave={() => {
        if (!isPreview) hoverNode(null);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative transition-all duration-150',
        !isPreview && 'cursor-pointer select-none',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-black shadow-lg shadow-indigo-500/10 z-10',
        isHovered && 'outline outline-1 outline-indigo-400/60 z-10',
        isDragTarget && 'ring-2 ring-emerald-400 ring-dashed bg-emerald-500/10'
      )}
    >
      {/* Component Name Badge on Selection */}
      {isSelected && (
        <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-[10px] font-semibold text-white rounded-t shadow-md z-30 pointer-events-none uppercase tracking-wider">
          <span>{node.name}</span>
          <span className="text-indigo-200 text-[9px]">({node.type})</span>
        </div>
      )}

      {/* Resize corner indicators when selected */}
      {isSelected && (
        <>
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow-sm pointer-events-none z-20" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow-sm pointer-events-none z-20" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow-sm pointer-events-none z-20" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow-sm pointer-events-none z-20" />
        </>
      )}

      {renderInner()}
    </div>
  );
};
