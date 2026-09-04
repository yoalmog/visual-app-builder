'use client';

import React, { useRef } from 'react';
import { ComponentNode } from '@/builder/schema/component';
import { useBuilderStore } from '@/builder/state/builder-store';

interface ResizeHandlesProps {
  node: ComponentNode;
}

type HandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ node }) => {
  const updateNodeStyles = useBuilderStore((s) => s.updateNodeStyles);
  const beginTransaction = useBuilderStore((s) => s.beginTransaction);
  const commitTransaction = useBuilderStore((s) => s.commitTransaction);

  const startPosRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  }>({ startX: 0, startY: 0, startWidth: 0, startHeight: 0, aspectRatio: 1 });

  const handlePointerDown = (e: React.PointerEvent, dir: HandleDirection) => {
    e.stopPropagation();
    e.preventDefault();

    const el = document.getElementById(`builder-node-${node.id}`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const aspectRatio = startWidth / (startHeight || 1);

    startPosRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth,
      startHeight,
      aspectRatio,
    };

    beginTransaction();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startPosRef.current.startX;
      const deltaY = moveEvent.clientY - startPosRef.current.startY;
      const shiftPressed = moveEvent.shiftKey;

      let newWidth = startPosRef.current.startWidth;
      let newHeight = startPosRef.current.startHeight;

      // Calculate width changes
      if (dir.includes('e')) {
        newWidth = startPosRef.current.startWidth + deltaX;
      } else if (dir.includes('w')) {
        newWidth = startPosRef.current.startWidth - deltaX;
      }

      // Calculate height changes
      if (dir.includes('s')) {
        newHeight = startPosRef.current.startHeight + deltaY;
      } else if (dir.includes('n')) {
        newHeight = startPosRef.current.startHeight - deltaY;
      }

      // Maintain aspect ratio if Shift is held
      if (shiftPressed && (dir === 'ne' || dir === 'nw' || dir === 'se' || dir === 'sw')) {
        newHeight = newWidth / startPosRef.current.aspectRatio;
      }

      // Min/Max constraints
      const minW = parseInt(node.styles.minWidth || '20', 10) || 20;
      const maxW = node.styles.maxWidth && node.styles.maxWidth !== 'none' ? parseInt(node.styles.maxWidth, 10) : 2000;
      const minH = parseInt(node.styles.minHeight || '20', 10) || 20;
      const maxH = node.styles.maxHeight && node.styles.maxHeight !== 'none' ? parseInt(node.styles.maxHeight, 10) : 2000;

      newWidth = Math.max(minW, Math.min(maxW, newWidth));
      newHeight = Math.max(minH, Math.min(maxH, newHeight));

      const updatedStyles: Record<string, string> = {};
      if (dir.includes('e') || dir.includes('w')) {
        updatedStyles.width = `${Math.round(newWidth)}px`;
      }
      if (dir.includes('n') || dir.includes('s')) {
        updatedStyles.height = `${Math.round(newHeight)}px`;
      }

      updateNodeStyles(node.id, updatedStyles);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      commitTransaction();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleClasses =
    'absolute w-2 h-2 bg-white border border-indigo-600 rounded-sm z-30 transition-transform hover:scale-125';

  return (
    <>
      {/* 4 Corners */}
      <div
        data-testid="resize-handle"
        data-direction="nw"
        onPointerDown={(e) => handlePointerDown(e, 'nw')}
        className={`${handleClasses} -top-1 -left-1 cursor-nwse-resize`}
        title="Resize Top-Left"
      >
        <span data-testid="resize-handle-nw" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="ne"
        onPointerDown={(e) => handlePointerDown(e, 'ne')}
        className={`${handleClasses} -top-1 -right-1 cursor-nesw-resize`}
        title="Resize Top-Right"
      >
        <span data-testid="resize-handle-ne" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="se"
        onPointerDown={(e) => handlePointerDown(e, 'se')}
        className={`${handleClasses} -bottom-1 -right-1 cursor-nwse-resize`}
        title="Resize Bottom-Right"
      >
        <span data-testid="resize-handle-se" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="sw"
        onPointerDown={(e) => handlePointerDown(e, 'sw')}
        className={`${handleClasses} -bottom-1 -left-1 cursor-nesw-resize`}
        title="Resize Bottom-Left"
      >
        <span data-testid="resize-handle-sw" className="hidden" />
      </div>

      {/* 4 Edges */}
      <div
        data-testid="resize-handle"
        data-direction="n"
        onPointerDown={(e) => handlePointerDown(e, 'n')}
        className={`${handleClasses} -top-1 left-1/2 -translate-x-1/2 cursor-ns-resize`}
        title="Resize Top"
      >
        <span data-testid="resize-handle-n" data-testid-alt="resize-handle-top" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="s"
        onPointerDown={(e) => handlePointerDown(e, 's')}
        className={`${handleClasses} -bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize`}
        title="Resize Bottom"
      >
        <span data-testid="resize-handle-s" data-testid-alt="resize-handle-bottom" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="w"
        onPointerDown={(e) => handlePointerDown(e, 'w')}
        className={`${handleClasses} top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize`}
        title="Resize Left"
      >
        <span data-testid="resize-handle-w" data-testid-alt="resize-handle-left" className="hidden" />
      </div>
      <div
        data-testid="resize-handle"
        data-direction="e"
        onPointerDown={(e) => handlePointerDown(e, 'e')}
        className={`${handleClasses} top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize`}
        title="Resize Right"
      >
        <span data-testid="resize-handle-e" data-testid-alt="resize-handle-right" className="hidden" />
      </div>
    </>
  );
};
