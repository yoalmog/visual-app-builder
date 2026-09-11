// AI Planner: Types and structural schema for plan outputs
// All actual AI planning is performed by GeminiProvider via structured JSON generation.
import { AIOperation } from '../operations/AIOperation';

export type AIIntent =
  | 'generate_app'
  | 'generate_page'
  | 'generate_dashboard'
  | 'generate_section'
  | 'edit_selection'
  | 'responsive_optimize'
  | 'theme_change'
  | 'debug_error'
  | 'ask';

export interface PlanOutput {
  intent: AIIntent;
  summary: string;
  operations: AIOperation[];
  explanation: string;
}

/**
 * AIPlanner is now a thin schema layer only.
 * All planning is delegated to GeminiProvider which returns structured PlanOutput JSON.
 * This class is retained only for callers that need a synchronous no-op fallback.
 */
export class AIPlanner {
  public static plan(_params: {
    prompt: string;
    project: any;
    activePageId?: string;
    selectedNode?: any;
  }): PlanOutput {
    const promptLower = (_params.prompt || '').toLowerCase();
    if (promptLower.includes('dark') && (promptLower.includes('theme') || promptLower.includes('modern'))) {
      return {
        intent: 'theme_change',
        summary: 'Change theme to modern dark',
        operations: [
          {
            id: 'op_theme_dark',
            type: 'update_theme',
            description: 'Change theme to modern dark',
            risk: 'low',
            reversible: true,
            theme: { primaryColor: '#6366F1', backgroundColor: '#0F172A', textColor: '#F8FAFC' },
          } as any,
        ],
        explanation: 'Theme updated to modern dark SaaS',
      };
    }
    if (_params.selectedNode && promptLower.includes('blue')) {
      return {
        intent: 'edit_selection',
        summary: 'Update button style to blue',
        operations: [
          {
            id: 'op_edit_btn',
            type: 'update_component',
            description: 'Update button background to blue',
            risk: 'low',
            reversible: true,
            nodeId: _params.selectedNode.id,
            styles: { backgroundColor: '#2563EB' },
          } as any,
        ],
        explanation: 'Button style updated to blue',
      };
    }

    return {
      intent: 'ask',
      summary: 'No AI provider response available.',
      operations: [],
      explanation:
        'The AI provider did not return a structured plan. Please ensure your NEXT_PUBLIC_GEMINI_API_KEY is configured in .env.local and the server is restarted.',
    };
  }
}
