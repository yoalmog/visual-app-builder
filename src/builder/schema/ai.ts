// Phase 7: AI Application Generation & Agent Builder Schema Definitions

export type AIMode = 'ask' | 'generate' | 'edit' | 'debug' | 'agent';

export type AIRisk = 'low' | 'medium' | 'high' | 'critical';

export type AISafetyMode = 'safe' | 'approval' | 'developer';

export interface AISettings {
  provider: 'mock' | 'openai' | 'anthropic' | 'gemini';
  model: string;
  temperature: number;
  maxTokens: number;
  safetyMode: AISafetyMode;
  autoApplyLowRisk: boolean;
  tokenBudget: number;
  agentMaxSteps: number;
  maxRetries: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
}

export interface AIGenerationSummary {
  pagesCreated: number;
  pagesModified: number;
  componentsAdded: number;
  componentsModified: number;
  collectionsCreated: number;
  workflowsCreated: number;
  themesUpdated: number;
}

export interface AIGeneration {
  id: string;
  prompt: string;
  timestamp: string;
  status: 'pending' | 'planned' | 'approved' | 'applied' | 'rejected' | 'rolled_back' | 'failed';
  mode: AIMode;
  summary: AIGenerationSummary;
  operationIds: string[];
  projectVersionBefore: number;
  projectVersionAfter?: number;
  appliedAt?: string;
  rolledBackAt?: string;
  error?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AIMessage[];
}

export interface AIProjectMemory {
  preferences: Record<string, any>;
  conventions: string[];
  preferredTerminology: Record<string, string>;
  notes: string[];
}

export interface AIProjectMetadata {
  enabled: boolean;
  settings: AISettings;
  generations: AIGeneration[];
  conversations: AIConversation[];
  memory: AIProjectMemory;
  activeConversationId?: string;
}
