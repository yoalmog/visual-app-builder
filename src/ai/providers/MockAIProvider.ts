// Deterministic Mock AI Provider for testing and offline development
import { AIProvider, AIRequest, AIResponse, AICostEstimate, AIStreamCallbacks } from '../core/AIProvider';
import { AIPlanner } from '../planner/AIPlanner';
import { ScreenshotAnalyzer } from '../multimodal/ScreenshotAnalyzer';
import { AIError } from '../core/AIError';

export class MockAIProvider implements AIProvider {
  public id = 'mock';
  public name = 'Deterministic Mock Provider';

  // Configurable test toggles
  public simulateTimeout = false;
  public simulateError = false;
  public simulateMalformed = false;

  public supportsVision(): boolean {
    return true;
  }

  public supportsStructuredOutput(): boolean {
    return true;
  }

  public async estimateCost(request: AIRequest): Promise<AICostEstimate> {
    const inputTokens = Math.ceil((request.prompt?.length || 0) / 4);
    const outputTokens = 500;
    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUsd: (inputTokens * 0.000005) + (outputTokens * 0.000015),
    };
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (request.signal?.aborted) {
      throw new AIError('CANCELLED', 'Request was cancelled.');
    }

    if (this.simulateTimeout) {
      throw new AIError('TIMEOUT', 'Mock provider simulated timeout error.');
    }

    if (this.simulateError) {
      throw new AIError('PROVIDER_UNAVAILABLE', 'Mock provider simulated service error.');
    }

    // Handle multimodal vision request
    if (request.images && request.images.length > 0) {
      const visionRes = ScreenshotAnalyzer.analyze(request.images[0]);
      return {
        id: `mock_resp_${Date.now()}`,
        provider: this.id,
        model: 'mock-vision-v1',
        text: `Analyzed image: detected ${visionRes.detectedLayout} layout with ${visionRes.sections.length} sections.`,
        structuredData: visionRes,
        finishReason: 'stop',
        usage: { inputTokens: 400, outputTokens: 250, totalTokens: 650, durationMs: 45 },
      };
    }

    // Standard planning & generation
    const project = request.context?.project || { pages: [{ id: 'p_1', name: 'Home', slug: '/', root: { id: 'r_1', type: 'container', children: [] } }] };
    const plan = AIPlanner.plan({
      prompt: request.prompt,
      project,
      activePageId: request.context?.activePageId,
      selectedNode: request.context?.selectedNode,
    });

    if (this.simulateMalformed) {
      return {
        id: `mock_resp_${Date.now()}`,
        provider: this.id,
        model: 'mock-model-v1',
        text: 'Malformed output: {{{invalid json',
        structuredData: undefined,
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120, durationMs: 10 },
      };
    }

    return {
      id: `mock_resp_${Date.now()}`,
      provider: this.id,
      model: 'mock-model-v1',
      text: plan.explanation,
      structuredData: plan,
      finishReason: 'stop',
      usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450, durationMs: 30 },
    };
  }

  public async stream(request: AIRequest, callbacks: AIStreamCallbacks): Promise<void> {
    if (request.signal?.aborted) {
      callbacks.onError?.(new AIError('CANCELLED', 'Request was cancelled.'));
      return;
    }

    callbacks.onProgress?.('Understanding request...', 20);
    await new Promise((r) => setTimeout(r, 10));

    callbacks.onProgress?.('Planning application structure...', 50);
    await new Promise((r) => setTimeout(r, 10));

    callbacks.onProgress?.('Generating components and data...', 80);
    await new Promise((r) => setTimeout(r, 10));

    const response = await this.generate(request);

    // Stream out words
    const words = response.text.split(' ');
    for (const word of words) {
      callbacks.onToken?.(word + ' ');
    }

    callbacks.onProgress?.('Validating changes...', 100);
    callbacks.onComplete?.(response);
  }
}
