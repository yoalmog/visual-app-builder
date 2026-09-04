// Theme & Responsive Generators
import { AIOperation } from '../operations/AIOperation';

export interface ThemePreset {
  name: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  colors?: Record<string, string>;
}

export class ThemeGenerator {
  public static readonly PRESETS: Record<string, ThemePreset> = {
    modern_dark: {
      name: 'Modern Dark SaaS',
      primaryColor: '#6366F1',
      backgroundColor: '#07090E',
      textColor: '#F8FAFC',
      borderRadius: '8px',
      colors: {
        primary: '#6366F1',
        secondary: '#06B6D4',
        background: '#07090E',
        foreground: '#F8FAFC',
        muted: '#94A3B8',
        border: '#1E293B',
      },
    },
    clean_light: {
      name: 'Clean Minimal Light',
      primaryColor: '#2563EB',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      borderRadius: '8px',
      colors: {
        primary: '#2563EB',
        secondary: '#10B981',
        background: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#64748B',
        border: '#E2E8F0',
      },
    },
    emerald_fintech: {
      name: 'Emerald Fintech',
      primaryColor: '#059669',
      backgroundColor: '#FAFAF9',
      textColor: '#1C1917',
      borderRadius: '10px',
      colors: {
        primary: '#059669',
        secondary: '#D97706',
        background: '#FAFAF9',
        foreground: '#1C1917',
        muted: '#78716C',
        border: '#E7E5E4',
      },
    },
  };

  /**
   * Generates operations to update project theme and semantic color tokens.
   */
  public static generateTheme(presetKey: string | ThemePreset): AIOperation[] {
    const preset = typeof presetKey === 'string' ? this.PRESETS[presetKey] || this.PRESETS.clean_light : presetKey;
    const ops: AIOperation[] = [];

    // 1. Update theme
    ops.push({
      id: `op_theme_${Date.now()}`,
      type: 'update_theme',
      description: `Update project theme to ${preset.name}`,
      risk: 'low',
      reversible: true,
      theme: {
        primaryColor: preset.primaryColor,
        backgroundColor: preset.backgroundColor,
        textColor: preset.textColor,
        borderRadius: preset.borderRadius,
        colors: preset.colors,
      },
    });

    // 2. Create primary brand token
    ops.push({
      id: `op_token_primary_${Date.now()}`,
      type: 'create_token',
      description: `Update Primary Brand Token to ${preset.primaryColor}`,
      risk: 'low',
      reversible: true,
      token: {
        id: 'token_color_primary',
        name: 'Brand Primary',
        category: 'color',
        value: preset.primaryColor,
        description: `Active primary brand color for ${preset.name}`,
      },
    });

    return ops;
  }
}

export class ResponsiveGenerator {
  /**
   * Generates responsive override operations to optimize multi-column grids or sidebars for mobile.
   */
  public static generateMobileStackOverride(params: {
    pageId: string;
    nodeId: string;
  }): AIOperation {
    return {
      id: `op_resp_mobile_${params.nodeId}`,
      type: 'update_responsive_style',
      description: `Optimize node ${params.nodeId} for mobile viewport`,
      risk: 'low',
      reversible: true,
      pageId: params.pageId,
      nodeId: params.nodeId,
      breakpoint: 'mobile',
      styles: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        padding: '12px',
        gap: '12px',
      },
    };
  }
}
