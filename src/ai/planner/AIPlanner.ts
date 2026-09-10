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
  /**
   * Returns an empty plan. Real planning happens via GeminiProvider.
   * Callers should always prefer going through the provider stream/generate path.
   */
  public static plan(_params: {
    prompt: string;
    project: any;
    activePageId?: string;
    selectedNode?: any;
  }): PlanOutput {
    return {
      intent: 'ask',
      summary: 'No AI provider response available.',
      operations: [],
      explanation:
        'The AI provider did not return a structured plan. Please ensure your NEXT_PUBLIC_GEMINI_API_KEY is configured in .env.local and the server is restarted.',
    };
  }
}
