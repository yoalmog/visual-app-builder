'use client';

import React from 'react';

export interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
}

interface MarqueeOverlayProps {
  marquee: MarqueeRect;
}

export const MarqueeOverlay: React.FC<MarqueeOverlayProps> = ({ marquee }) => {
  if (!marquee.isActive) return null;

  const left = Math.min(marquee.startX, marquee.currentX);
  const top = Math.min(marquee.startY, marquee.currentY);
  const width = Math.abs(marquee.currentX - marquee.startX);
  const height = Math.abs(marquee.currentY - marquee.startY);

  if (width < 3 && height < 3) return null;

  return (
    <div
      data-testid="marquee-selection"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      className="border border-indigo-400 bg-indigo-500/20 border-dashed rounded"
    />
  );
};
