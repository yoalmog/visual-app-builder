'use client';

import React, { useState } from 'react';
import { ComponentNode } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Box,
  Type,
  MousePointerClick,
  Image as ImageIcon,
  Minus,
  FormInput,
  FileText,
  Trash2,
  CopyPlus,
  Eye,
  EyeOff,
  Edit2,
  Check,
  Component as ComponentIcon,
  Heading,
  AlignLeft,
  Link as LinkIcon,
  Sparkles,
  Lock,
  Unlock,
  Search,
  ChevronsDown,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  container: Box,
  row: Box,
  column: Box,
  stack: Box,
  text: Type,
  heading: Heading,
  paragraph: AlignLeft,
  button: MousePointerClick,
  link: LinkIcon,
  icon: Sparkles,
  image: ImageIcon,
  spacer: Box,
  divider: Minus,
  input: FormInput,
  textarea: FileText,
};

interface LayerItemProps {
  node: ComponentNode;
  depth?: number;
  searchQuery?: string;
  forceExpanded?: boolean | null;
}

const LayerItem: React.FC<LayerItemProps> = ({
  node,
  depth = 0,
  searchQuery = '',
  forceExpanded = null,
}) => {
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const toggleSelectNode = useBuilderStore((s) => s.toggleSelectNode);
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const renameNode = useBuilderStore((s) => s.renameNode);
  const setNodeVisibility = useBuilderStore((s) => s.setNodeVisibility);
  const toggleLockNode = useBuilderStore((s) => s.toggleLockNode);
  const viewport = useBuilderStore((s) => s.viewport);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(node.name || '');

  const effectiveCollapsed = forceExpanded !== null ? !forceExpanded : isCollapsed;
  const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = ICON_MAP[node.type] || Box;

  // Visibility check
  const isHidden =
    (viewport !== 'desktop' && node.responsiveStyles?.[viewport]?.visibility === 'hidden') ||
    node.styles.visibility === 'hidden' ||
    (viewport !== 'desktop' && node.responsiveStyles?.[viewport]?.display === 'none') ||
    node.styles.display === 'none';

  const handleSaveRename = () => {
    if (nameValue.trim()) {
      renameNode(node.id, nameValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setNameValue(node.name || '');
    setIsEditing(false);
  };

  // Search filtering logic
  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.type.toLowerCase().includes(searchQuery.toLowerCase());

  const hasMatchingChild = (n: ComponentNode): boolean => {
    if (!searchQuery) return true;
    if (n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }
    return n.children ? n.children.some(hasMatchingChild) : false;
  };

  if (searchQuery && !matchesSearch && !hasMatchingChild(node)) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div
        data-testid={`layer-item-${node.id}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleSelectNode(node.id, e.shiftKey);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setNameValue(node.name || '');
          setIsEditing(true);
        }}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors text-xs select-none ${
          isSelected
            ? 'bg-indigo-600/30 text-white border border-indigo-500/50'
            : isHidden
            ? 'text-slate-600 hover:bg-[#151926] hover:text-slate-400'
            : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="p-0.5 hover:text-white text-slate-500"
            >
              {effectiveCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />

          {/* Component Instance Badge */}
          {node.componentInstanceId && (
            <span
              title="Reusable Component Instance"
              className="px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded text-[9px] font-mono flex items-center gap-0.5 shrink-0"
            >
              <ComponentIcon className="w-2.5 h-2.5" />
              <span>inst</span>
            </span>
          )}

          {/* Lock indicator */}
          {node.locked && (
            <span title="Locked">
              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            </span>
          )}

          {/* Inline Rename or Name Label */}
          {isEditing ? (
            <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                data-testid="layer-rename-input"
                type="text"
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                onBlur={handleSaveRename}
                className="bg-[#090B10] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
              />
              <button
                onClick={handleSaveRename}
                className="p-1 text-green-400 hover:text-green-300"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate font-medium text-[11px]">{node.name}</span>
          )}
        </div>

        {/* Action Controls: Lock, Visibility, Rename, Duplicate, Delete */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Lock Button */}
          <button
            data-testid={`layer-lock-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleLockNode(node.id);
            }}
            className={`p-1 transition-colors ${
              node.locked ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-white'
            }`}
            title={node.locked ? 'Unlock Layer' : 'Lock Layer'}
          >
            {node.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          {/* Visibility Button */}
          <button
            data-testid={`layer-visibility-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setNodeVisibility(node.id, isHidden);
            }}
            className={`p-1 transition-colors ${
              isHidden ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-white'
            }`}
            title={isHidden ? 'Unhide Component' : 'Hide Component'}
          >
            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setNameValue(node.name || '');
              setIsEditing(true);
            }}
            className="p-1 hover:text-white text-slate-500"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(node.id);
            }}
            className="p-1 hover:text-white text-slate-500"
            title="Duplicate"
          >
            <CopyPlus className="w-3 h-3" />
          </button>

          {node.parentId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNode(node.id);
              }}
              className="p-1 hover:text-red-400 text-slate-500"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && !effectiveCollapsed && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <LayerItem
              key={child.id}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LayersPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const changeNodeZOrder = useBuilderStore((s) => s.changeNodeZOrder);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);

  const canReorder = Boolean(selectedNodeId && activePage?.root && selectedNodeId !== activePage.root.id);

  return (
    <footer
      data-testid="builder-layers"
      className="bg-[#0B0D14] border-t border-[#1E2330] flex flex-col select-none shrink-0 z-20"
    >
      {/* Footer Toggle Header */}
      <div className="h-8 px-4 flex items-center justify-between bg-[#0E1018] border-b border-[#1A1E2C]">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer hover:text-white"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="tracking-wide uppercase text-[10px]">Layers</span>
          <span className="text-[10px] text-slate-600 font-mono">({activePage?.name || 'Home'})</span>
          <span className="text-slate-500">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>

        {/* Search, Expand/Collapse, and Z-Order Controls */}
        {isOpen && (
          <div className="flex items-center gap-3">
            {/* Layer Search */}
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
              <input
                data-testid="layer-search"
                type="text"
                placeholder="Search layers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#08090E] border border-[#1E2332] rounded pl-6 pr-2 py-0.5 text-[11px] text-slate-200 outline-none w-32 focus:w-44 transition-all focus:border-indigo-500"
              />
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-0.5 border-l border-r border-[#1E2332] px-1">
              <button
                data-testid="layers-expand-all"
                onClick={() => setForceExpanded(true)}
                className="p-1 rounded hover:bg-[#1A1F2C] text-slate-400 hover:text-white"
                title="Expand All"
              >
                <ChevronsDown className="w-3.5 h-3.5" />
              </button>
              <button
                data-testid="layers-collapse-all"
                onClick={() => setForceExpanded(false)}
                className="p-1 rounded hover:bg-[#1A1F2C] text-slate-400 hover:text-white"
                title="Collapse All"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Z-Order Buttons */}
            {canReorder && selectedNodeId && (
              <div className="flex items-center gap-0.5 text-slate-400">
                <button
                  data-testid="layer-bring-front"
                  onClick={() => changeNodeZOrder(selectedNodeId, 'bringToFront')}
                  className="p-1 rounded hover:bg-[#1A1F2C] hover:text-white"
                  title="Bring to Front"
                >
                  <ArrowUpToLine className="w-3 h-3" />
                </button>
                <button
                  data-testid="layer-bring-forward"
                  onClick={() => changeNodeZOrder(selectedNodeId, 'bringForward')}
                  className="p-1 rounded hover:bg-[#1A1F2C] hover:text-white"
                  title="Bring Forward"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  data-testid="layer-send-backward"
                  onClick={() => changeNodeZOrder(selectedNodeId, 'sendBackward')}
                  className="p-1 rounded hover:bg-[#1A1F2C] hover:text-white"
                  title="Send Backward"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  data-testid="layer-send-back"
                  onClick={() => changeNodeZOrder(selectedNodeId, 'sendToBack')}
                  className="p-1 rounded hover:bg-[#1A1F2C] hover:text-white"
                  title="Send to Back"
                >
                  <ArrowDownToLine className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Tree Content */}
      {isOpen && (
        <div data-testid="layers-panel" className="h-44 overflow-y-auto p-2 bg-[#0B0D14]">
          {activePage?.root ? (
            <LayerItem
              node={activePage.root}
              searchQuery={searchQuery}
              forceExpanded={forceExpanded}
            />
          ) : (
            <div className="text-xs text-slate-500 p-2">No components on page.</div>
          )}
        </div>
      )}
    </footer>
  );
};
