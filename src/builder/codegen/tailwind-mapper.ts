import { ComponentStyles } from '../schema/component';

/**
 * Maps CSS values and component styles into clean, idiomatic Tailwind CSS classes.
 */
export function stylesToTailwind(styles: ComponentStyles = {}): string {
  const classes: string[] = [];

  // 1. Display
  if (styles.display === 'flex') classes.push('flex');
  else if (styles.display === 'grid') classes.push('grid');
  else if (styles.display === 'inline-flex') classes.push('inline-flex');
  else if (styles.display === 'inline-block') classes.push('inline-block');
  else if (styles.display === 'block') classes.push('block');
  else if (styles.display === 'none') classes.push('hidden');

  // 2. Flex Direction
  if (styles.flexDirection === 'column') classes.push('flex-col');
  else if (styles.flexDirection === 'row') classes.push('flex-row');
  else if (styles.flexDirection === 'column-reverse') classes.push('flex-col-reverse');
  else if (styles.flexDirection === 'row-reverse') classes.push('flex-row-reverse');

  // 3. Justify Content
  if (styles.justifyContent === 'center') classes.push('justify-center');
  else if (styles.justifyContent === 'flex-start') classes.push('justify-start');
  else if (styles.justifyContent === 'flex-end') classes.push('justify-end');
  else if (styles.justifyContent === 'space-between') classes.push('justify-between');
  else if (styles.justifyContent === 'space-around') classes.push('justify-around');
  else if (styles.justifyContent === 'space-evenly') classes.push('justify-evenly');

  // 4. Align Items
  if (styles.alignItems === 'center') classes.push('items-center');
  else if (styles.alignItems === 'flex-start') classes.push('items-start');
  else if (styles.alignItems === 'flex-end') classes.push('items-end');
  else if (styles.alignItems === 'stretch') classes.push('items-stretch');
  else if (styles.alignItems === 'baseline') classes.push('items-baseline');

  // 5. Flex Wrap
  if (styles.flexWrap === 'wrap') classes.push('flex-wrap');
  else if (styles.flexWrap === 'nowrap') classes.push('flex-nowrap');

  // 6. Gaps
  if (styles.gap) {
    const g = parsePixelOrRem(styles.gap);
    if (g !== null) classes.push(`gap-[${styles.gap}]`);
  }

  // 7. Width & Height
  if (styles.width === '100%') classes.push('w-full');
  else if (styles.width === 'auto') classes.push('w-auto');
  else if (styles.width && styles.width.endsWith('px')) classes.push(`w-[${styles.width}]`);

  if (styles.height === '100%') classes.push('h-full');
  else if (styles.height === 'auto') classes.push('h-auto');
  else if (styles.height && styles.height.endsWith('px')) classes.push(`h-[${styles.height}]`);

  if (styles.minHeight) classes.push(`min-h-[${styles.minHeight}]`);
  if (styles.maxHeight) classes.push(`max-h-[${styles.maxHeight}]`);
  if (styles.minWidth) classes.push(`min-w-[${styles.minWidth}]`);
  if (styles.maxWidth) classes.push(`max-w-[${styles.maxWidth}]`);

  // 8. Padding & Margin
  if (styles.padding) classes.push(`p-[${styles.padding}]`);
  if (styles.paddingTop) classes.push(`pt-[${styles.paddingTop}]`);
  if (styles.paddingRight) classes.push(`pr-[${styles.paddingRight}]`);
  if (styles.paddingBottom) classes.push(`pb-[${styles.paddingBottom}]`);
  if (styles.paddingLeft) classes.push(`pl-[${styles.paddingLeft}]`);

  if (styles.margin) classes.push(`m-[${styles.margin}]`);
  if (styles.marginTop) classes.push(`mt-[${styles.marginTop}]`);
  if (styles.marginRight) classes.push(`mr-[${styles.marginRight}]`);
  if (styles.marginBottom) classes.push(`mb-[${styles.marginBottom}]`);
  if (styles.marginLeft) classes.push(`ml-[${styles.marginLeft}]`);

  // 9. Colors & Background
  if (styles.backgroundColor) {
    if (styles.backgroundColor.startsWith('#') || styles.backgroundColor.startsWith('rgb')) {
      classes.push(`bg-[${styles.backgroundColor}]`);
    } else {
      classes.push(`bg-${styles.backgroundColor}`);
    }
  }

  if (styles.color) {
    if (styles.color.startsWith('#') || styles.color.startsWith('rgb')) {
      classes.push(`text-[${styles.color}]`);
    } else {
      classes.push(`text-${styles.color}`);
    }
  }

  // 10. Typography
  if (styles.fontSize) classes.push(`text-[${styles.fontSize}]`);
  if (styles.fontWeight) {
    const fw = String(styles.fontWeight);
    if (fw === '700' || fw === 'bold') classes.push('font-bold');
    else if (fw === '600' || fw === 'semibold') classes.push('font-semibold');
    else if (fw === '500' || fw === 'medium') classes.push('font-medium');
    else if (fw === '400' || fw === 'normal') classes.push('font-normal');
    else classes.push(`font-[${fw}]`);
  }
  if (styles.textAlign) classes.push(`text-${styles.textAlign}`);

  // 11. Borders & Radius
  if (styles.borderRadius) classes.push(`rounded-[${styles.borderRadius}]`);
  if (styles.borderWidth) classes.push(`border-[${styles.borderWidth}]`);
  if (styles.borderColor) classes.push(`border-[${styles.borderColor}]`);
  if (styles.borderStyle && styles.borderStyle !== 'none') classes.push(`border-${styles.borderStyle}`);

  // 12. Effects
  if (styles.boxShadow) classes.push(`shadow-[${styles.boxShadow}]`);
  if (styles.opacity !== undefined && styles.opacity !== 1) classes.push(`opacity-${Math.round(styles.opacity * 100)}`);
  if (styles.overflow) classes.push(`overflow-${styles.overflow}`);

  return classes.join(' ');
}

function parsePixelOrRem(val: string): number | null {
  if (!val) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}
