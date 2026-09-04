// AI Provider Interface and Core Types

export interface AICostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

export interface AIStreamCallbacks {
  onToken?: (token: string) => void;
  onProgress?: (stage: string, percent?: number) => void;
  onToolCall?: (toolName: string, args: Record<string, any>) => void;
  onError?: (error: Error) => void;
  onComplete?: (response: AIResponse) => void;
}

export interface ImageInput {
  url?: string;
  base64?: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  width?: number;
  height?: number;
}

export interface AIMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: ImageInput[];
}

export interface AIRequest {
  id: string;
  prompt: string;
  messages?: AIMessageInput[];
  systemPrompt?: string;
  images?: ImageInput[];
  context?: Record<string, any>;
  mode?: 'ask' | 'generate' | 'edit' | 'debug' | 'agent';
  temperature?: number;
  maxTokens?: number;
  structuredOutputSchema?: any;
  tools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  signal?: AbortSignal;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AIResponse {
  id: string;
  provider: string;
  model: string;
  text: string;
  structuredData?: any;
  toolCalls?: AIToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    durationMs: number;
    estimatedCostUsd?: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'cancelled' | 'error';
}

export interface AIProvider {
  id: string;
  name: string;

  generate(request: AIRequest): Promise<AIResponse>;

  stream?(request: AIRequest, callbacks: AIStreamCallbacks): Promise<void>;

  supportsVision(): boolean;

  supportsStructuredOutput(): boolean;

  estimateCost?(request: AIRequest): Promise<AICostEstimate>;
}
