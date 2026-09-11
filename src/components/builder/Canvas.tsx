'use client';

import React, { useState, useRef } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { CanvasViewport } from './CanvasViewport';
import { COMPONENT_REGISTRY, createDefaultNode } from '@/builder/components/registry';
import { MarqueeOverlay, MarqueeRect } from './MarqueeOverlay';
import { MultiSelectionBox } from './MultiSelectionBox';
import { AIGhostOverlay } from './AIGhostOverlay';
import { CanvasMinimap } from './CanvasMinimap';
import { AlignmentGuides, AlignmentGuide } from './AlignmentGuides';

interface CanvasProps {
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onContextMenu }) => {
  const selectNode = useBuilderStore((s) => s.selectNode);
  const selectNodes = useBuilderStore((s) => s.selectNodes);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const addNode = useBuilderStore((s) => s.addNode);
  const moveNode = useBuilderStore((s) => s.moveNode);
  const project = useBuilderStore((s) => s.project);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const panOffset = useBuilderStore((s) => s.panOffset);
  const setPanOffset = useBuilderStore((s) => s.setPanOffset);

  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [marquee, setMarquee] = useState<MarqueeRect>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isActive: false,
  });

  const canvasRef = useRef<HTMLElement>(null);
  const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle if clicking empty canvas space
    if (e.target !== canvasRef.current) return;

    // Pan with space or middle mouse button (button 1)
    if (e.button === 1 || e.buttons === 4 || e.altKey) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialPan = { ...panOffset };

      const handlePanMove = (moveEv: PointerEvent) => {
        setPanOffset({
          x: initialPan.x + (moveEv.clientX - startX),
          y: initialPan.y + (moveEv.clientY - startY),
        });
      };

      const handlePanUp = () => {
        window.removeEventListener('pointermove', handlePanMove);
        window.removeEventListener('pointerup', handlePanUp);
      };

      window.addEventListener('pointermove', handlePanMove);
      window.addEventListener('pointerup', handlePanUp);
      return;
    }

    // Left click on empty canvas: begin marquee
    if (e.button === 0) {
      const startX = e.clientX;
      const startY = e.clientY;
      const isShift = e.shiftKey;

      setMarquee({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        isActive: true,
      });

      const handlePointerMove = (moveEv: PointerEvent) => {
        setMarquee((prev) => ({
          ...prev,
          currentX: moveEv.clientX,
          currentY: moveEv.clientY,
        }));
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        const endX = upEv.clientX;
        const endY = upEv.clientY;
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);

        // Click threshold: if movement is under 5px, clear selection
        if (dx < 5 && dy < 5) {
          selectNode(null);
          setMarquee((prev) => ({ ...prev, isActive: false }));
          return;
        }

        // Determine intersecting nodes
        const mLeft = Math.min(startX, endX);
        const mTop = Math.min(startY, endY);
        const mRight = Math.max(startX, endX);
        const mBottom = Math.max(startY, endY);

        const intersectingIds: string[] = [];
        const selectableElements = document.querySelectorAll('[id^="builder-node-"]');

        selectableElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const overlaps =
            rect.left < mRight &&
            rect.right > mLeft &&
            rect.top < mBottom &&
            rect.bottom > mTop;

          if (overlaps) {
            const nodeId = el.id.replace('builder-node-', '');
            // Do not select page root in marquee
            if (nodeId && nodeId !== activePage?.root?.id) {
              intersectingIds.push(nodeId);
            }
          }
        });

        // Deduplicate
        const uniqueIntersecting = Array.from(new Set(intersectingIds));

        if (isShift) {
          const combined = Array.from(new Set([...selectedNodeIds, ...uniqueIntersecting]));
          selectNodes(combined);
        } else {
          if (uniqueIntersecting.length > 0) {
            selectNodes(uniqueIntersecting);
          } else {
            selectNode(null);
          }
        }

        setMarquee((prev) => ({ ...prev, isActive: false }));
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRootDragOver(true);

    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      const guides: AlignmentGuide[] = [];

      const SNAP_THRESHOLD = 8;

      // 1. Center of canvas snapping
      const centerX = canvasRect.width / 2;
      const centerY = canvasRect.height / 2;

      if (Math.abs(mouseX - centerX) <= SNAP_THRESHOLD) {
        guides.push({ type: 'vertical', position: Math.round(centerX) });
      }
      if (Math.abs(mouseY - centerY) <= SNAP_THRESHOLD) {
        guides.push({ type: 'horizontal', position: Math.round(centerY) });
      }

      // 2. Sibling elements snapping
      const elements = canvasRef.current.querySelectorAll('[id^="builder-node-"]');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elLeft = rect.left - canvasRect.left;
        const elRight = rect.right - canvasRect.left;
        const elTop = rect.top - canvasRect.top;
        const elBottom = rect.bottom - canvasRect.top;
        const elCenterX = elLeft + rect.width / 2;
        const elCenterY = elTop + rect.height / 2;

        if (Math.abs(mouseX - elLeft) <= SNAP_THRESHOLD) {
          guides.push({ type: 'vertical', position: Math.round(elLeft) });
        } else if (Math.abs(mouseX - elRight) <= SNAP_THRESHOLD) {
          guides.push({ type: 'vertical', position: Math.round(elRight) });
        } else if (Math.abs(mouseX - elCenterX) <= SNAP_THRESHOLD) {
          guides.push({ type: 'vertical', position: Math.round(elCenterX) });
        }

        if (Math.abs(mouseY - elTop) <= SNAP_THRESHOLD) {
          guides.push({ type: 'horizontal', position: Math.round(elTop) });
        } else if (Math.abs(mouseY - elBottom) <= SNAP_THRESHOLD) {
          guides.push({ type: 'horizontal', position: Math.round(elBottom) });
        } else if (Math.abs(mouseY - elCenterY) <= SNAP_THRESHOLD) {
          guides.push({ type: 'horizontal', position: Math.round(elCenterY) });
        }
      });

      setAlignmentGuides(guides.slice(0, 4));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsRootDragOver(false);
    setAlignmentGuides([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRootDragOver(false);
    setAlignmentGuides([]);

    if (!activePage?.root) return;

    const movingNodeId = e.dataTransfer.getData('application/builder-node-id');
    const newComponentType = e.dataTransfer.getData('application/builder-component-type') as any;

    if (movingNodeId) {
      moveNode(movingNodeId, activePage.root.id);
      return;
    }

    if (newComponentType && (COMPONENT_REGISTRY as any)[newComponentType]) {
      const newNode = createDefaultNode(newComponentType as any, `${newComponentType}_${Date.now()}`);
      addNode(activePage.root.id, newNode);
    }
  };

  return (
    <div className="flex-1 h-full relative overflow-hidden">
      <main
        ref={canvasRef}
        data-testid="builder-canvas"
        className="w-full h-full overflow-auto bg-[#07090E] flex flex-col items-center justify-start p-10 relative select-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          transform: panOffset.x || panOffset.y ? `translate(${panOffset.x}px, ${panOffset.y}px)` : undefined,
        }}
        onPointerDown={handlePointerDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CanvasViewport onContextMenu={onContextMenu} />
        <AlignmentGuides guides={alignmentGuides} />
        <MarqueeOverlay marquee={marquee} />
        <MultiSelectionBox />
      </main>

      {/* Next-Gen AI Ghost Staging Overlay */}
      <AIGhostOverlay />

      {/* Next-Gen Viewport Navigator Minimap */}
      <CanvasMinimap />
    </div>
  );
};
