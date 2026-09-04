import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentNode, StyleProperties, ViewportMode } from '@/types/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix = 'node'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function resolveNodeStyles(
  node: ComponentNode,
  viewport: ViewportMode
): React.CSSProperties {
  const base = { ...node.styles };

  if (viewport === 'tablet' && node.responsive?.tablet) {
    Object.assign(base, node.responsive.tablet);
  } else if (viewport === 'mobile') {
    if (node.responsive?.tablet) {
      Object.assign(base, node.responsive.tablet);
    }
    if (node.responsive?.mobile) {
      Object.assign(base, node.responsive.mobile);
    }
  }

  // Convert schema styles to React CSS properties
  const css: React.CSSProperties = {};

  if (base.display) css.display = base.display;
  if (base.flexDirection) css.flexDirection = base.flexDirection;
  if (base.justifyContent) css.justifyContent = base.justifyContent;
  if (base.alignItems) css.alignItems = base.alignItems;
  if (base.flexWrap) css.flexWrap = base.flexWrap;
  if (base.gap) css.gap = base.gap;
  if (base.gridTemplateColumns) css.gridTemplateColumns = base.gridTemplateColumns;
  if (base.gridGap) css.gap = base.gridGap;

  if (base.position) css.position = base.position;
  if (base.width) css.width = base.width;
  if (base.height) css.height = base.height;
  if (base.minWidth) css.minWidth = base.minWidth;
  if (base.maxWidth) css.maxWidth = base.maxWidth;
  if (base.minHeight) css.minHeight = base.minHeight;
  if (base.maxHeight) css.maxHeight = base.maxHeight;
  if (base.overflow) css.overflow = base.overflow;
  if (base.zIndex !== undefined) css.zIndex = base.zIndex;

  if (base.paddingTop) css.paddingTop = base.paddingTop;
  if (base.paddingRight) css.paddingRight = base.paddingRight;
  if (base.paddingBottom) css.paddingBottom = base.paddingBottom;
  if (base.paddingLeft) css.paddingLeft = base.paddingLeft;
  if (base.marginTop) css.marginTop = base.marginTop;
  if (base.marginRight) css.marginRight = base.marginRight;
  if (base.marginBottom) css.marginBottom = base.marginBottom;
  if (base.marginLeft) css.marginLeft = base.marginLeft;

  if (base.fontFamily) css.fontFamily = base.fontFamily;
  if (base.fontSize) css.fontSize = base.fontSize;
  if (base.fontWeight) css.fontWeight = base.fontWeight;
  if (base.lineHeight) css.lineHeight = base.lineHeight;
  if (base.letterSpacing) css.letterSpacing = base.letterSpacing;
  if (base.textAlign) css.textAlign = base.textAlign;
  if (base.color) css.color = base.color;
  if (base.textDecoration) css.textDecoration = base.textDecoration;
  if (base.textTransform) css.textTransform = base.textTransform;

  if (base.backgroundColor) css.backgroundColor = base.backgroundColor;
  if (base.opacity !== undefined) css.opacity = base.opacity;
  if (base.borderWidth) css.borderWidth = base.borderWidth;
  if (base.borderColor) css.borderColor = base.borderColor;
  if (base.borderStyle) css.borderStyle = base.borderStyle;
  if (base.borderTopWidth) css.borderTopWidth = base.borderTopWidth;
  if (base.borderTopColor) css.borderTopColor = base.borderTopColor;
  if (base.borderRadius) css.borderRadius = base.borderRadius;
  if (base.boxShadow) css.boxShadow = base.boxShadow;

  if (base.backdropFilter) css.backdropFilter = base.backdropFilter;
  if (base.filter) css.filter = base.filter;
  if (base.transition) css.transition = base.transition;
  if (base.cursor) css.cursor = base.cursor;
  if (base.objectFit) css.objectFit = base.objectFit as any;

  return css;
}

export function interpolateText(text: string, context: Record<string, any>): string {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    const parts = trimmed.split('.');
    let curr: any = context;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return `{{${trimmed}}}`;
      }
    }
    return curr !== undefined && curr !== null ? String(curr) : '';
  });
}
