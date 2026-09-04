'use client';

import React from 'react';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number; // in px
}

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {guides.map((guide, idx) => {
        if (guide.type === 'horizontal') {
          return (
            <div
              key={`h-${idx}-${guide.position}`}
              data-testid="alignment-guide"
              style={{ top: `${guide.position}px` }}
              className="absolute left-0 right-0 h-px bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.8)]"
            />
          );
        } else {
          return (
            <div
              key={`v-${idx}-${guide.position}`}
              data-testid="alignment-guide"
              style={{ left: `${guide.position}px` }}
              className="absolute top-0 bottom-0 w-px bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.8)]"
            />
          );
        }
      })}
    </div>
  );
};
