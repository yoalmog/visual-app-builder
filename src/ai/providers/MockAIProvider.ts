// MockAIProvider — REMOVED.
// The mock provider has been replaced by GeminiProvider (real AI).
// This stub is kept only to prevent import errors in any legacy files
// that reference MockAIProvider; it will throw immediately if instantiated.

import { AIProvider, AIRequest, AIResponse, AICostEstimate, AIStreamCallbacks } from '../core/AIProvider';
import { AIError } from '../core/AIError';

/** @deprecated MockAIProvider has been removed. Configure NEXT_PUBLIC_GEMINI_API_KEY in .env.local */
export class MockAIProvider implements AIProvider {
  public id = 'mock-removed';
  public name = 'Mock Provider (Removed)';

  constructor() {
    throw new AIError(
      'PROVIDER_UNAVAILABLE',
      'MockAIProvider has been removed. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file. Get a free key at https://aistudio.google.com/apikey'
    );
  }

  public supportsVision(): boolean { return false; }
  public supportsStructuredOutput(): boolean { return false; }
  public async estimateCost(_r: AIRequest): Promise<AICostEstimate> { return { estimatedInputTokens: 0, estimatedOutputTokens: 0, estimatedCostUsd: 0 }; }
  public async generate(_r: AIRequest): Promise<AIResponse> { throw new AIError('PROVIDER_UNAVAILABLE', 'MockAIProvider removed.'); }
  public async stream(_r: AIRequest, cb: AIStreamCallbacks): Promise<void> { cb.onError?.(new AIError('PROVIDER_UNAVAILABLE', 'MockAIProvider removed.')); }
}
