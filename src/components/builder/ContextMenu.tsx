'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { findNode } from '@/builder/tree/find-node';
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  Edit2,
  Component as ComponentIcon,
  CornerUpLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  FolderPlus,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onStartRename?: (nodeId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  onStartRename,
}) => {
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const selectNode = useBuilderStore((s) => s.selectNode);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const createComponentDefinition = useBuilderStore((s) => s.createComponentDefinition);
  const moveNode = useBuilderStore((s) => s.moveNode);
  const changeNodeZOrder = useBuilderStore((s) => s.changeNodeZOrder);
  const toggleLockNode = useBuilderStore((s) => s.toggleLockNode);
  const setNodeVisibility = useBuilderStore((s) => s.setNodeVisibility);
  const groupSelectedNodes = useBuilderStore((s) => s.groupSelectedNodes);
  const viewport = useBuilderStore((s) => s.viewport);

  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
  const isRoot = activePage?.root?.id === nodeId;
  const targetNode = activePage?.root ? findNode(activePage.root, nodeId) : null;
  const isLocked = Boolean(targetNode?.locked);
  const isHidden =
    targetNode?.styles.visibility === 'hidden' ||
    targetNode?.styles.display === 'none' ||
    targetNode?.responsiveStyles?.[viewport]?.visibility === 'hidden';

  // Keyboard navigation & Escape handling (AT3-110, AT3-111)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      tabIndex={0}
      style={{ left: `${Math.min(x, window.innerWidth - 200)}px`, top: `${Math.min(y, window.innerHeight - 350)}px` }}
      className="fixed z-50 min-w-[190px] bg-[#141724] border border-[#23293D] rounded-lg shadow-2xl py-1 text-xs text-slate-300 select-none animate-in fade-in zoom-in-95 duration-100 outline-none"
    >
      <button
        data-testid="context-menu-select"
        onClick={() => {
          selectNode(nodeId);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        <span>Select</span>
      </button>

      <div className="h-px bg-[#202538] my-1" />

      {/* Copy / Duplicate */}
      <button
        data-testid="context-menu-duplicate"
        onClick={() => {
          duplicateNode(nodeId);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <CopyPlus className="w-3.5 h-3.5" />
          <span>Duplicate</span>
        </div>
        <span className="text-[10px] text-slate-500 hover:text-white font-mono">Ctrl+D</span>
      </button>

      {/* Rename */}
      <button
        data-testid="context-menu-rename"
        onClick={() => {
          if (onStartRename) {
            onStartRename(nodeId);
          } else {
            const newName = prompt('Enter new component name:');
            if (newName) useBuilderStore.getState().renameNode(nodeId, newName);
          }
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5" />
        <span>Rename</span>
      </button>

      {/* Lock / Unlock */}
      <button
        data-testid="context-menu-lock"
        onClick={() => {
          toggleLockNode(nodeId);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        {isLocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5" />}
        <span>{isLocked ? 'Unlock' : 'Lock'}</span>
      </button>

      {/* Hide / Unhide */}
      <button
        data-testid="context-menu-hide"
        onClick={() => {
          setNodeVisibility(nodeId, isHidden);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        {isHidden ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
        <span>{isHidden ? 'Unhide' : 'Hide'}</span>
      </button>

      {/* Group */}
      <button
        data-testid="context-menu-group"
        onClick={() => {
          groupSelectedNodes();
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
        <span>Group</span>
      </button>

      {/* Z-Order Controls */}
      {!isRoot && (
        <>
          <div className="h-px bg-[#202538] my-1" />
          <button
            data-testid="context-menu-bring-front"
            onClick={() => {
              changeNodeZOrder(nodeId, 'bringToFront');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
            <span>Bring to Front</span>
          </button>
          <button
            data-testid="context-menu-bring-forward"
            onClick={() => {
              changeNodeZOrder(nodeId, 'bringForward');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Bring Forward</span>
          </button>
          <button
            data-testid="context-menu-send-backward"
            onClick={() => {
              changeNodeZOrder(nodeId, 'sendBackward');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Send Backward</span>
          </button>
          <button
            data-testid="context-menu-send-back"
            onClick={() => {
              changeNodeZOrder(nodeId, 'sendToBack');
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Send to Back</span>
          </button>
        </>
      )}

      {/* Create Reusable Component */}
      <div className="h-px bg-[#202538] my-1" />
      <button
        data-testid="context-menu-component"
        onClick={() => {
          const compName = prompt('Enter reusable component name:');
          if (compName) {
            createComponentDefinition(compName, nodeId);
          }
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
      >
        <ComponentIcon className="w-3.5 h-3.5 text-purple-400" />
        <span>Create Component</span>
      </button>

      {/* Move to Page Root */}
      {!isRoot && (
        <button
          onClick={() => {
            const page = project.pages.find((p) => p.id === activePageId);
            if (page) {
              moveNode(nodeId, page.root.id);
            }
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
          <span>Move to Page Root</span>
        </button>
      )}

      {/* Delete */}
      {!isRoot && (
        <>
          <div className="h-px bg-[#202538] my-1" />
          <button
            data-testid="context-menu-delete"
            onClick={() => {
              removeNode(nodeId);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </div>
            <span className="text-[10px] font-mono">Del</span>
          </button>
        </>
      )}
    </div>
  );
};
