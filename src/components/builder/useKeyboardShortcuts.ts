'use client';

import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { ComponentNode } from '@/builder/schema/component';
import { findNode } from '@/builder/tree/find-node';
import { cloneNodesWithNewIds } from '@/builder/tree/duplicate-node';

export function useKeyboardShortcuts() {
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const selectNode = useBuilderStore((s) => s.selectNode);
  const selectNodes = useBuilderStore((s) => s.selectNodes);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const removeSelectedNodes = useBuilderStore((s) => s.removeSelectedNodes);
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const duplicateSelectedNodes = useBuilderStore((s) => s.duplicateSelectedNodes);
  const moveSelectedNodesKeyboard = useBuilderStore((s) => s.moveSelectedNodesKeyboard);
  const addNode = useBuilderStore((s) => s.addNode);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);

  const clipboardRef = useRef<ComponentNode[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger hotkeys when user is editing in an input, textarea, or contentEditable element
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl+Z
      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // AI Command Bar / Assistant: Ctrl+K
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const aiStore = (window as any).__AI_STORE__;
        if (aiStore) {
          aiStore.setOpen(!aiStore.isOpen);
        }
        return;
      }


      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdOrCtrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl+D
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (selectedNodeIds.length > 1) {
          e.preventDefault();
          duplicateSelectedNodes();
          return;
        } else if (selectedNodeId) {
          e.preventDefault();
          duplicateNode(selectedNodeId);
          return;
        }
      }

      // Copy: Ctrl+C (supports single or multi)
      if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
        if (targetIds.length > 0) {
          const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
          if (activePage?.root) {
            const foundNodes: ComponentNode[] = [];
            for (const id of targetIds) {
              const n = findNode(activePage.root, id);
              if (n && n.id !== activePage.root.id) {
                foundNodes.push(JSON.parse(JSON.stringify(n)));
              }
            }
            if (foundNodes.length > 0) {
              clipboardRef.current = foundNodes;
            }
          }
        }
        return;
      }

      // Paste: Ctrl+V (supports single or multi)
      if (cmdOrCtrl && e.key.toLowerCase() === 'v' && clipboardRef.current.length > 0) {
        const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];
        const parentId = selectedNodeId || activePage?.root?.id;
        if (parentId) {
          e.preventDefault();
          const { clonedNodes } = cloneNodesWithNewIds(clipboardRef.current, parentId);
          const newIds: string[] = [];
          for (const cloned of clonedNodes) {
            addNode(parentId, cloned);
            newIds.push(cloned.id);
          }
          if (newIds.length > 0) {
            selectNodes(newIds);
          }
        }
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeIds.length > 0 || selectedNodeId)) {
        e.preventDefault();
        if (selectedNodeIds.length > 1) {
          removeSelectedNodes();
        } else if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
        return;
      }

      // Arrow Key Movement: 1px (plain) or 10px (Shift)
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
        (selectedNodeIds.length > 0 || selectedNodeId)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        moveSelectedNodesKeyboard(dx, dy);
        return;
      }

      // Clear selection: Escape
      if (e.key === 'Escape') {
        selectNode(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedNodeIds,
    selectNode,
    selectNodes,
    removeNode,
    removeSelectedNodes,
    duplicateNode,
    duplicateSelectedNodes,
    moveSelectedNodesKeyboard,
    addNode,
    undo,
    redo,
    project,
    activePageId,
  ]);
}
