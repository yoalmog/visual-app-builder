import React from 'react';
import { ComponentNode, ComponentStyles } from '../schema/component';
import { ViewportMode } from '../state/builder-store';

export function resolveNodeStylesForViewport(
  node: ComponentNode,
  viewport: ViewportMode
): ComponentStyles {
  const resolved: ComponentStyles = { ...node.styles };

  if (viewport === 'tablet') {
    if (node.responsiveStyles?.tablet) {
      Object.assign(resolved, node.responsiveStyles.tablet);
    }
  } else if (viewport === 'mobile') {
    if (node.responsiveStyles?.tablet) {
      Object.assign(resolved, node.responsiveStyles.tablet);
    }
    if (node.responsiveStyles?.mobile) {
      Object.assign(resolved, node.responsiveStyles.mobile);
    }
  }

  return resolved;
}

export function resolveStylesToCSS(styles: ComponentStyles): React.CSSProperties {
  const css: React.CSSProperties = {};

  // Display & Visibility
  if (styles.visibility) {
    css.visibility = styles.visibility;
    if (styles.visibility === 'hidden') {
      css.display = 'none';
    }
  } else if (styles.display) {
    css.display = styles.display;
  }

  // Flex container
  if (styles.flexDirection) css.flexDirection = styles.flexDirection;
  if (styles.justifyContent) css.justifyContent = styles.justifyContent;
  if (styles.alignItems) css.alignItems = styles.alignItems;
  if (styles.alignContent) css.alignContent = styles.alignContent;
  if (styles.flexWrap) css.flexWrap = styles.flexWrap;
  if (styles.gap) css.gap = styles.gap;
  if (styles.rowGap) css.rowGap = styles.rowGap;
  if (styles.columnGap) css.columnGap = styles.columnGap;

  // Flex child
  if (styles.flexGrow !== undefined) css.flexGrow = styles.flexGrow;
  if (styles.flexShrink !== undefined) css.flexShrink = styles.flexShrink;
  if (styles.flexBasis) css.flexBasis = styles.flexBasis;
  if (styles.alignSelf) css.alignSelf = styles.alignSelf;
  if (styles.order !== undefined) css.order = styles.order;

  // Dimensions
  if (styles.width) css.width = styles.width;
  if (styles.height) css.height = styles.height;
  if (styles.minWidth) css.minWidth = styles.minWidth;
  if (styles.maxWidth) css.maxWidth = styles.maxWidth;
  if (styles.minHeight) css.minHeight = styles.minHeight;
  if (styles.maxHeight) css.maxHeight = styles.maxHeight;

  // Spacing (unified + independent overrides)
  if (styles.padding) css.padding = styles.padding;
  if (styles.paddingTop) css.paddingTop = styles.paddingTop;
  if (styles.paddingRight) css.paddingRight = styles.paddingRight;
  if (styles.paddingBottom) css.paddingBottom = styles.paddingBottom;
  if (styles.paddingLeft) css.paddingLeft = styles.paddingLeft;

  if (styles.margin) css.margin = styles.margin;
  if (styles.marginTop) css.marginTop = styles.marginTop;
  if (styles.marginRight) css.marginRight = styles.marginRight;
  if (styles.marginBottom) css.marginBottom = styles.marginBottom;
  if (styles.marginLeft) css.marginLeft = styles.marginLeft;

  // Colors
  if (styles.backgroundColor) css.backgroundColor = styles.backgroundColor;
  if (styles.color) css.color = styles.color;

  // Borders
  if (styles.border) css.border = styles.border;
  if (styles.borderWidth) css.borderWidth = styles.borderWidth;
  if (styles.borderColor) css.borderColor = styles.borderColor;
  if (styles.borderStyle) css.borderStyle = styles.borderStyle;
  if (styles.borderRadius) css.borderRadius = styles.borderRadius;
  if (styles.borderTopLeftRadius) css.borderTopLeftRadius = styles.borderTopLeftRadius;
  if (styles.borderTopRightRadius) css.borderTopRightRadius = styles.borderTopRightRadius;
  if (styles.borderBottomRightRadius) css.borderBottomRightRadius = styles.borderBottomRightRadius;
  if (styles.borderBottomLeftRadius) css.borderBottomLeftRadius = styles.borderBottomLeftRadius;

  // Typography
  if (styles.fontFamily) css.fontFamily = styles.fontFamily;
  if (styles.fontSize) css.fontSize = styles.fontSize;
  if (styles.fontWeight) css.fontWeight = styles.fontWeight;
  if (styles.lineHeight) css.lineHeight = styles.lineHeight;
  if (styles.letterSpacing) css.letterSpacing = styles.letterSpacing;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.textTransform) css.textTransform = styles.textTransform;
  if (styles.textDecoration) css.textDecoration = styles.textDecoration;

  // Appearance & Effects
  if (styles.opacity !== undefined) css.opacity = styles.opacity;
  if (styles.objectFit) css.objectFit = styles.objectFit;
  if (styles.cursor) css.cursor = styles.cursor;

  // Structured shadow handling
  if (styles.shadowPreset && styles.shadowPreset !== 'none') {
    switch (styles.shadowPreset) {
      case 'subtle':
        css.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)';
        break;
      case 'medium':
        css.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
        break;
      case 'strong':
        css.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)';
        break;
      case 'custom':
        if (styles.boxShadow) css.boxShadow = styles.boxShadow;
        break;
    }
  } else if (styles.boxShadow) {
    css.boxShadow = styles.boxShadow;
  }

  // Positioning
  if (styles.position) css.position = styles.position;
  if (styles.top) css.top = styles.top;
  if (styles.right) css.right = styles.right;
  if (styles.bottom) css.bottom = styles.bottom;
  if (styles.left) css.left = styles.left;
  if (styles.zIndex !== undefined) css.zIndex = styles.zIndex;

  return css;
}

export function resolveStylesForViewport(
  node: ComponentNode,
  viewport: ViewportMode
): React.CSSProperties {
  const resolved = resolveNodeStylesForViewport(node, viewport);
  return resolveStylesToCSS(resolved);
}

export function isPropertyOverridden(
  node: ComponentNode,
  viewport: ViewportMode,
  styleKey: string
): boolean {
  if (viewport === 'desktop') return false;
  const overrides = node.responsiveStyles?.[viewport];
  return overrides !== undefined && (overrides as any)[styleKey] !== undefined;
}

export function getInheritedPropertyValue(
  node: ComponentNode,
  viewport: ViewportMode,
  styleKey: string
): any {
  if (viewport === 'mobile') {
    if (node.responsiveStyles?.tablet && (node.responsiveStyles.tablet as any)[styleKey] !== undefined) {
      return (node.responsiveStyles.tablet as any)[styleKey];
    }
    return (node.styles as any)[styleKey];
  }
  if (viewport === 'tablet') {
    return (node.styles as any)[styleKey];
  }
  return undefined;
}
